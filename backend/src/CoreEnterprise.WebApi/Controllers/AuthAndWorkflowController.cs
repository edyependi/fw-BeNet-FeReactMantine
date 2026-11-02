using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Application.Workflows;
using CoreEnterprise.Domain.Entities;
using CoreEnterprise.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CoreEnterprise.WebApi.Controllers;

public record LoginRequest(string Username, string Password);
public record RefreshTokenRequest(string? RefreshToken);
public record UpdateProfileRequest(string FullName, string Email, string PreferredLanguage, string PreferredTheme);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record SimulateRouteRequest(Guid RequesterUserId, string DocTypeCode, string SubCategoryCode, decimal TransactionAmount);

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string RefreshCookieName = "ce_refresh_token";
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(IApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpGet("demo-users")]
    public async Task<IActionResult> GetDemoUsers(CancellationToken cancellationToken)
    {
        var users = await _context.Users
            .Include(u => u.JobLevel)
            .Include(u => u.PrimaryOrgUnit)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .OrderBy(u => u.JobLevel.RankOrder)
            .ThenBy(u => u.Username)
            .Select(u => new
            {
                u.Id,
                u.EmployeeNumber,
                u.Username,
                u.Email,
                u.FullName,
                u.PhoneNumber,
                u.ValidFrom,
                u.ValidTo,
                u.IsActive,
                u.AvatarDmsFileId,
                u.SignatureDmsFileId,
                u.PreferredLanguage,
                u.PreferredTheme,
                JobLevel = u.JobLevel.Code,
                JobLevelName = u.JobLevel.Name,
                JobRank = u.JobLevel.RankOrder,
                OrgUnitId = u.PrimaryOrgUnitId,
                OrgUnitCode = u.PrimaryOrgUnit.Code,
                OrgUnitName = u.PrimaryOrgUnit.Name,
                OrgUnitType = u.PrimaryOrgUnit.UnitType.ToString(),
                Roles = u.UserRoles.Select(ur => ur.Role.Code).ToList(),
                Permissions = u.UserRoles
                    .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
                    .Distinct()
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.JobLevel)
            .Include(u => u.PrimaryOrgUnit)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Username == request.Username, cancellationToken);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Username atau kata sandi tidak valid." });
        }

        if (!user.IsActive)
        {
            return StatusCode(403, new { message = "Akun Anda sedang terkunci / nonaktif. Silakan hubungi IT Servicedesk." });
        }

        var todayUtc = DateTime.UtcNow.Date;
        if (user.ValidFrom.HasValue && todayUtc < user.ValidFrom.Value.Date)
        {
            return StatusCode(403, new { message = $"Akun Anda belum memasuki masa aktif (Valid From: {user.ValidFrom.Value:dd MMM yyyy})." });
        }
        if (user.ValidTo.HasValue && todayUtc > user.ValidTo.Value.Date)
        {
            return StatusCode(403, new { message = $"Masa berlaku akun Anda telah berakhir (Valid Upto: {user.ValidTo.Value:dd MMM yyyy}). Silakan hubungi Administrator." });
        }

        var (accessToken, userPayload) = GenerateJwtAndUserPayload(user);
        var refreshToken = CreateRefreshTokenEntity(user.Id, HttpContext.Connection.RemoteIpAddress?.ToString());

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync(cancellationToken);

        SetRefreshTokenCookie(refreshToken.Token, refreshToken.ExpiresAtUtc);

        return Ok(new
        {
            accessToken,
            refreshTokenExpiresAtUtc = refreshToken.ExpiresAtUtc,
            user = userPayload
        });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest? body, CancellationToken cancellationToken)
    {
        var tokenValue = Request.Cookies[RefreshCookieName] ?? body?.RefreshToken;
        if (string.IsNullOrWhiteSpace(tokenValue))
        {
            return Unauthorized(new { message = "Refresh token tidak ditemukan." });
        }

        var existingToken = await _context.RefreshTokens
            .Include(rt => rt.User)
                .ThenInclude(u => u.JobLevel)
            .Include(rt => rt.User)
                .ThenInclude(u => u.PrimaryOrgUnit)
            .Include(rt => rt.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(rt => rt.Token == tokenValue, cancellationToken);

        if (existingToken == null)
        {
            return Unauthorized(new { message = "Refresh token tidak sah." });
        }

        // Section 3.1.A: Token Reuse Detection!
        // If a token that has already been revoked is presented again, revoke all active refresh tokens for this user
        if (existingToken.RevokedAtUtc != null)
        {
            var activeUserTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == existingToken.UserId && rt.RevokedAtUtc == null)
                .ToListAsync(cancellationToken);

            foreach (var rt in activeUserTokens)
            {
                rt.RevokedAtUtc = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync(cancellationToken);
            Response.Cookies.Delete(RefreshCookieName);

            return Unauthorized(new
            {
                message = "Keamanan JWT: Deteksi penggunaan ulang Refresh Token (Token Reuse Detected). Seluruh sesi aktif telah dicabut."
            });
        }

        if (existingToken.ExpiresAtUtc <= DateTime.UtcNow || !existingToken.User.IsActive)
        {
            return Unauthorized(new { message = "Refresh token telah kedaluwarsa atau akun nonaktif." });
        }

        // Rotate Refresh Token
        var newRefreshToken = CreateRefreshTokenEntity(existingToken.UserId, HttpContext.Connection.RemoteIpAddress?.ToString());
        existingToken.RevokedAtUtc = DateTime.UtcNow;
        existingToken.ReplacedByToken = newRefreshToken.Token;

        _context.RefreshTokens.Add(newRefreshToken);
        await _context.SaveChangesAsync(cancellationToken);

        SetRefreshTokenCookie(newRefreshToken.Token, newRefreshToken.ExpiresAtUtc);
        var (accessToken, userPayload) = GenerateJwtAndUserPayload(existingToken.User);

        return Ok(new
        {
            accessToken,
            refreshTokenExpiresAtUtc = newRefreshToken.ExpiresAtUtc,
            user = userPayload
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var tokenValue = Request.Cookies[RefreshCookieName];
        if (!string.IsNullOrWhiteSpace(tokenValue))
        {
            var rt = await _context.RefreshTokens.FirstOrDefaultAsync(x => x.Token == tokenValue, cancellationToken);
            if (rt != null && rt.RevokedAtUtc == null)
            {
                rt.RevokedAtUtc = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        Response.Cookies.Delete(RefreshCookieName);
        return Ok(new { message = "Berhasil logout dan mencabut Refresh Token." });
    }

    private RefreshToken CreateRefreshTokenEntity(Guid userId, string? ipAddress)
    {
        return new RefreshToken
        {
            UserId = userId,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
            CreatedByIp = ipAddress
        };
    }

    private void SetRefreshTokenCookie(string token, DateTime expiresUtc)
    {
        Response.Cookies.Append(RefreshCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = expiresUtc
        });
    }

    private (string AccessToken, object UserPayload) GenerateJwtAndUserPayload(User user)
    {
        var roles = user.UserRoles.Select(ur => ur.Role.Code).Distinct().ToList();
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
            .Distinct()
            .ToList();

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new("name", user.FullName),
            new(ClaimTypes.Name, user.Username),
            new("job_level", user.JobLevel.Code),
            new("job_rank", user.JobLevel.RankOrder.ToString()),
            new("org_unit_id", user.PrimaryOrgUnitId.ToString()),
            new("org_unit_code", user.PrimaryOrgUnit.Code),
            new("org_unit_type", user.PrimaryOrgUnit.UnitType.ToString())
        };

        foreach (var r in roles)
        {
            claims.Add(new Claim("roles", r));
            claims.Add(new Claim(ClaimTypes.Role, r));
        }

        foreach (var p in permissions)
        {
            claims.Add(new Claim("permissions", p));
        }

        var secret = _configuration["JwtSettings:Secret"] ?? "CoreEnterpriseSuperSecretKey2026!@#Minimum32BytesLong";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"] ?? "CoreEnterprise.WebApi",
            audience: _configuration["JwtSettings:Audience"] ?? "CoreEnterprise.Client",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(25),
            signingCredentials: creds
        );

        var jwtString = new JwtSecurityTokenHandler().WriteToken(token);
        var payload = new
        {
            id = user.Id,
            username = user.Username,
            email = user.Email,
            fullName = user.FullName,
            avatarDmsFileId = user.AvatarDmsFileId,
            signatureDmsFileId = user.SignatureDmsFileId,
            preferredLanguage = user.PreferredLanguage,
            preferredTheme = user.PreferredTheme,
            jobLevel = user.JobLevel.Code,
            jobRank = user.JobLevel.RankOrder,
            orgUnitId = user.PrimaryOrgUnitId,
            orgUnitCode = user.PrimaryOrgUnit.Code,
            orgUnitType = user.PrimaryOrgUnit.UnitType.ToString(),
            roles,
            permissions
        };

        return (jwtString, payload);
    }
}

[ApiController]
[Route("api/[controller]")]
public class ProfileController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public ProfileController(IApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetProfile(Guid userId, CancellationToken cancellationToken)
    {
        var u = await _context.Users
            .Include(x => x.JobLevel)
            .Include(x => x.PrimaryOrgUnit)
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);

        if (u == null) return NotFound();

        return Ok(new
        {
            u.Id,
            u.EmployeeNumber,
            u.Username,
            u.Email,
            u.FullName,
            u.AvatarDmsFileId,
            u.SignatureDmsFileId,
            u.PreferredLanguage,
            u.PreferredTheme,
            JobLevel = u.JobLevel.Code,
            JobLevelName = u.JobLevel.Name,
            JobRank = u.JobLevel.RankOrder,
            OrgUnitCode = u.PrimaryOrgUnit.Code,
            OrgUnitName = u.PrimaryOrgUnit.Name
        });
    }

    [HttpPut("{userId:guid}")]
    public async Task<IActionResult> UpdateProfile(Guid userId, [FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return NotFound();

        user.FullName = request.FullName;
        user.Email = request.Email;
        user.PreferredLanguage = request.PreferredLanguage;
        user.PreferredTheme = request.PreferredTheme;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Profil pengguna berhasil diperbarui." });
    }

    [HttpPost("{userId:guid}/change-password")]
    public async Task<IActionResult> ChangePassword(Guid userId, [FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Kata sandi saat ini tidak sesuai." });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            return BadRequest(new { message = "Kata sandi baru minimal harus 8 karakter." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Kata sandi berhasil diperbarui." });
    }

    [HttpPost("{userId:guid}/avatar")]
    public async Task<IActionResult> UploadAvatarWebp(Guid userId, IFormFile file, CancellationToken cancellationToken)
    {
        return await SaveProfileMediaToDmsAsync(userId, file, DmsModuleCategory.USER_AVATAR, isAvatar: true, cancellationToken);
    }

    [HttpPost("{userId:guid}/signature")]
    public async Task<IActionResult> UploadSignatureWebp(Guid userId, IFormFile file, CancellationToken cancellationToken)
    {
        return await SaveProfileMediaToDmsAsync(userId, file, DmsModuleCategory.USER_SIGNATURE, isAvatar: false, cancellationToken);
    }

    private async Task<IActionResult> SaveProfileMediaToDmsAsync(
        Guid userId,
        IFormFile file,
        DmsModuleCategory category,
        bool isAvatar,
        CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return NotFound();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "File gambar tidak boleh kosong." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();

        var sha256Hex = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        var storageRoot = Path.Combine(_env.ContentRootPath, "storage");
        Directory.CreateDirectory(storageRoot);

        var storedName = $"{(isAvatar ? "avatar" : "sig")}_{userId:N}_{DateTime.UtcNow.Ticks}.webp";
        var fullPath = Path.Combine(storageRoot, storedName);
        await System.IO.File.WriteAllBytesAsync(fullPath, bytes, cancellationToken);

        var dmsFile = new DmsFile
        {
            OriginalFileName = file.FileName.EndsWith(".webp", StringComparison.OrdinalIgnoreCase)
                ? file.FileName
                : $"{Path.GetFileNameWithoutExtension(file.FileName)}.webp",
            StoredFileName = storedName,
            StoragePath = fullPath,
            ContentType = "image/webp",
            FileSizeInBytes = bytes.Length,
            Sha256Checksum = sha256Hex,
            ModuleCategory = category,
            IsPublic = true
        };

        _context.DmsFiles.Add(dmsFile);
        if (isAvatar)
            user.AvatarDmsFileId = dmsFile.Id;
        else
            user.SignatureDmsFileId = dmsFile.Id;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = isAvatar
                ? "Foto profil (1:1 .webp) berhasil disimpan ke DMS."
                : "Tanda tangan digital / paraf (.webp) berhasil disimpan ke DMS.",
            fileId = dmsFile.Id,
            sha256Checksum = dmsFile.Sha256Checksum
        });
    }
}

[ApiController]
[Route("api/[controller]")]
public class WorkflowSimulatorController : ControllerBase
{
    private readonly IApproverResolutionService _resolutionService;

    public WorkflowSimulatorController(IApproverResolutionService resolutionService)
    {
        _resolutionService = resolutionService;
    }

    [HttpPost("simulate")]
    public async Task<IActionResult> SimulateRoute([FromBody] SimulateRouteRequest request, CancellationToken cancellationToken)
    {
        var result = await _resolutionService.ResolveWorkflowRouteAsync(
            request.RequesterUserId,
            request.DocTypeCode,
            request.SubCategoryCode,
            request.TransactionAmount,
            null,
            cancellationToken);

        return Ok(result);
    }
}
