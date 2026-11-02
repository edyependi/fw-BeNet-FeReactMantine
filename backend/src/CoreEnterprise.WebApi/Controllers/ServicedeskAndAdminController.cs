using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Domain.Entities;
using CoreEnterprise.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoreEnterprise.WebApi.Controllers;

public record ResetUserPasswordRequest(Guid TargetUserId, string NewPassword);
public record ToggleUserActiveRequest(Guid TargetUserId, bool IsActive);
public record UpdateUserRolesRequest(Guid TargetUserId, List<string> RoleCodes);
public record ToggleRolePermissionRequest(Guid RoleId, Guid PermissionId, bool IsGranted);
public record CreateOrganizationUnitRequest(string Code, string Name, string UnitType, Guid? ParentUnitId);

public record UpsertUserRequest(
    string EmployeeNumber,
    string Username,
    string Email,
    string FullName,
    string? PhoneNumber,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    string? Password,
    string JobLevelCode,
    Guid PrimaryOrgUnitId,
    Guid? DirectSupervisorId,
    bool IsActive,
    List<string> RoleCodes
);

public record UpsertMenuItemRequest(
    string MenuCode,
    string Title,
    string Subtitle,
    string GroupCategory,
    string IconName,
    int SortOrder,
    string RequiredPermissionCode,
    List<string> AllowedRoleCodes,
    bool IsVisible,
    bool AutoGenerateCrudPermissions = false
);

public record UpsertRoleRequest(string Code, string Name, string? Description);
public record CreatePermissionRequest(string Code, string Module, string? Description);

public record UpsertAbacPolicyRequest(
    string PolicyCode,
    string Name,
    string? Description,
    string TargetResource,
    string TargetAction,
    List<string> SubjectJobLevels,
    int MinJobRank,
    int MaxJobRank,
    List<string> SubjectRoles,
    string OrgScopeRule,
    string SubCategoryScope,
    decimal? MaxTransactionAmount,
    bool EnforceFourEyesSod,
    bool RequireDigitalSignature,
    string Effect,
    int PriorityOrder,
    bool IsActive
);

public record EvaluateAbacRequest(
    Guid UserId,
    string TargetResource,
    string TargetAction,
    Guid? ResourceOrgUnitId,
    string SubCategoryCode,
    decimal? TransactionAmount,
    bool IsSelfApproval
);

[ApiController]
[Route("api/[controller]")]
public class UserManagementController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public UserManagementController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers(CancellationToken cancellationToken)
    {
        var users = await _context.Users
            .Include(u => u.JobLevel)
            .Include(u => u.PrimaryOrgUnit)
            .Include(u => u.DirectSupervisor)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .OrderBy(u => u.EmployeeNumber)
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
                u.JobLevelId,
                JobLevel = u.JobLevel.Code,
                JobLevelName = u.JobLevel.Name,
                JobRank = u.JobLevel.RankOrder,
                OrgUnitId = u.PrimaryOrgUnitId,
                OrgUnitCode = u.PrimaryOrgUnit.Code,
                OrgUnitName = u.PrimaryOrgUnit.Name,
                OrgUnitType = u.PrimaryOrgUnit.UnitType.ToString(),
                u.DirectSupervisorId,
                DirectSupervisorName = u.DirectSupervisor != null ? u.DirectSupervisor.FullName : null,
                u.AvatarDmsFileId,
                u.SignatureDmsFileId,
                u.IsActive,
                u.CreatedAt,
                Roles = u.UserRoles.Select(ur => ur.Role.Code).ToList(),
                Permissions = u.UserRoles
                    .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
                    .Distinct()
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] UpsertUserRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Username (UserId) dan Nama Lengkap wajib diisi." });

        var normUsername = request.Username.Trim().ToLowerInvariant();
        var normEmpNo = string.IsNullOrWhiteSpace(request.EmployeeNumber)
            ? $"EMP-{DateTime.UtcNow:mmss}"
            : request.EmployeeNumber.Trim().ToUpperInvariant();
        var normEmail = string.IsNullOrWhiteSpace(request.Email)
            ? $"{normUsername}@coreenterprise.local"
            : request.Email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Username.ToLower() == normUsername, cancellationToken))
            return BadRequest(new { message = $"UserId / Username '{normUsername}' sudah terdaftar." });

        if (await _context.Users.AnyAsync(u => u.EmployeeNumber.ToLower() == normEmpNo.ToLower(), cancellationToken))
            return BadRequest(new { message = $"NIK / EmployeeNumber '{normEmpNo}' sudah terdaftar." });

        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normEmail, cancellationToken))
            return BadRequest(new { message = $"Email '{normEmail}' sudah terdaftar." });

        var jl = await _context.JobLevels.FirstOrDefaultAsync(
            j => j.Code.ToUpper() == (request.JobLevelCode ?? "STAFF").ToUpper(),
            cancellationToken) ?? await _context.JobLevels.FirstAsync(cancellationToken);

        var orgExists = await _context.OrganizationUnits.AnyAsync(o => o.Id == request.PrimaryOrgUnitId, cancellationToken);
        var targetOrgId = orgExists
            ? request.PrimaryOrgUnitId
            : (await _context.OrganizationUnits.FirstAsync(cancellationToken)).Id;

        var validFromUtc = request.ValidFrom.HasValue
            ? DateTime.SpecifyKind(request.ValidFrom.Value, DateTimeKind.Utc)
            : new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var validToUtc = request.ValidTo.HasValue
            ? DateTime.SpecifyKind(request.ValidTo.Value, DateTimeKind.Utc)
            : new DateTime(2028, 12, 31, 23, 59, 59, DateTimeKind.Utc);

        if (validToUtc.Date < validFromUtc.Date)
            return BadRequest(new { message = "Tanggal masa berlaku selesai (Valid Upto) tidak boleh lebih awal dari tanggal mulai (Valid From)." });

        var newUser = new User
        {
            EmployeeNumber = normEmpNo,
            Username = normUsername,
            Email = normEmail,
            FullName = request.FullName.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            ValidFrom = validFromUtc,
            ValidTo = validToUtc,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                string.IsNullOrWhiteSpace(request.Password) ? "Password123!" : request.Password),
            JobLevelId = jl.Id,
            PrimaryOrgUnitId = targetOrgId,
            DirectSupervisorId = request.DirectSupervisorId,
            IsActive = request.IsActive
        };

        _context.Users.Add(newUser);

        var allRoles = await _context.Roles.ToListAsync(cancellationToken);
        var requestedRoles = (request.RoleCodes != null && request.RoleCodes.Count > 0)
            ? request.RoleCodes
            : new List<string> { "EMPLOYEE" };

        foreach (var rc in requestedRoles.Distinct())
        {
            var matchedRole = allRoles.FirstOrDefault(r => r.Code.Equals(rc, StringComparison.OrdinalIgnoreCase));
            if (matchedRole != null)
            {
                _context.UserRoles.Add(new UserRole { UserId = newUser.Id, RoleId = matchedRole.Id });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { newUser.Id, newUser.Username, message = $"Pengguna {newUser.FullName} ({newUser.Username}) berhasil ditambahkan." });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpsertUserRequest request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
            return NotFound(new { message = "Pengguna tidak ditemukan." });

        var normUsername = request.Username.Trim().ToLowerInvariant();
        var normEmpNo = request.EmployeeNumber.Trim().ToUpperInvariant();
        var normEmail = request.Email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Id != id && u.Username.ToLower() == normUsername, cancellationToken))
            return BadRequest(new { message = $"UserId / Username '{normUsername}' sudah digunakan pengguna lain." });

        if (await _context.Users.AnyAsync(u => u.Id != id && u.EmployeeNumber.ToLower() == normEmpNo.ToLower(), cancellationToken))
            return BadRequest(new { message = $"NIK '{normEmpNo}' sudah digunakan pengguna lain." });

        if (await _context.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == normEmail, cancellationToken))
            return BadRequest(new { message = $"Email '{normEmail}' sudah digunakan pengguna lain." });

        var jl = await _context.JobLevels.FirstOrDefaultAsync(
            j => j.Code.ToUpper() == (request.JobLevelCode ?? "STAFF").ToUpper(),
            cancellationToken);

        if (request.ValidFrom.HasValue && request.ValidTo.HasValue && request.ValidTo.Value.Date < request.ValidFrom.Value.Date)
            return BadRequest(new { message = "Tanggal masa berlaku selesai (Valid Upto) tidak boleh lebih awal dari tanggal mulai (Valid From)." });

        user.EmployeeNumber = normEmpNo;
        user.Username = normUsername;
        user.Email = normEmail;
        user.FullName = request.FullName.Trim();
        user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        if (request.ValidFrom.HasValue)
            user.ValidFrom = DateTime.SpecifyKind(request.ValidFrom.Value, DateTimeKind.Utc);
        if (request.ValidTo.HasValue)
            user.ValidTo = DateTime.SpecifyKind(request.ValidTo.Value, DateTimeKind.Utc);
        if (jl != null) user.JobLevelId = jl.Id;
        if (request.PrimaryOrgUnitId != Guid.Empty) user.PrimaryOrgUnitId = request.PrimaryOrgUnitId;
        user.DirectSupervisorId = request.DirectSupervisorId == id ? null : request.DirectSupervisorId;
        user.IsActive = request.IsActive;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        _context.UserRoles.RemoveRange(user.UserRoles);
        var allRoles = await _context.Roles.ToListAsync(cancellationToken);
        var requestedRoles = (request.RoleCodes != null && request.RoleCodes.Count > 0)
            ? request.RoleCodes
            : new List<string> { "EMPLOYEE" };

        foreach (var rc in requestedRoles.Distinct())
        {
            var matchedRole = allRoles.FirstOrDefault(r => r.Code.Equals(rc, StringComparison.OrdinalIgnoreCase));
            if (matchedRole != null)
            {
                _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = matchedRole.Id });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { user.Id, user.Username, message = $"Data pengguna {user.FullName} ({user.Username}) berhasil diperbarui." });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
            return NotFound(new { message = "Pengguna tidak ditemukan." });

        if (user.Username.Equals("admin", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Akun utama SuperAdmin (admin) tidak dapat dihapus." });

        var hasWorkflowRefs = await _context.WorkflowInstances.AnyAsync(w => w.RequesterUserId == id, cancellationToken)
            || await _context.WorkflowSteps.AnyAsync(s => s.AssignedUserId == id || s.ActualActionUserId == id, cancellationToken)
            || await _context.ApprovalAuthorityAssignments.AnyAsync(a => a.UserId == id, cancellationToken);

        if (hasWorkflowRefs)
        {
            return BadRequest(new
            {
                message = $"Pengguna '{user.FullName}' memiliki rekam jejak transaksi/workflow atau penugasan matriks approver. Gunakan fitur Nonaktifkan (LOCKED) agar integritas audit tetap terjaga."
            });
        }

        _context.UserRoles.RemoveRange(user.UserRoles);
        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Pengguna {user.FullName} ({user.Username}) berhasil dihapus." });
    }
}

[ApiController]
[Route("api/[controller]")]
public class ServicedeskController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public ServicedeskController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetUserPasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.JobLevel)
            .Include(u => u.PrimaryOrgUnit)
            .FirstOrDefaultAsync(u => u.Id == request.TargetUserId, cancellationToken);
        if (user == null)
            return NotFound(new { message = "Pengguna tidak ditemukan." });

        var effectiveNewPassword = string.IsNullOrWhiteSpace(request.NewPassword) ? "Password123!" : request.NewPassword;
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(effectiveNewPassword);

        var tokens = await _context.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var t in tokens)
        {
            t.RevokedAtUtc = DateTime.UtcNow;
        }

        var emailResult = await EnterpriseEmailDispatcher.DispatchAsync(
            _context,
            eventType: "SERVICEDESK_PASSWORD_RESET",
            moduleSource: "IT_SERVICEDESK",
            recipientUserId: user.Id,
            recipientName: user.FullName,
            recipientEmail: user.Email,
            referenceCode: $"USR-PWD-{user.EmployeeNumber}",
            subjectPrefix: $"Pemberitahuan Reset Kata Sandi oleh IT Servicedesk — @{user.Username}",
            bodyContent:
                $"Yth. {user.FullName} ({user.EmployeeNumber} / @{user.Username}),\n\n" +
                $"Melalui email resmi ini kami informasikan bahwa kata sandi akun Anda pada unit {user.PrimaryOrgUnit?.Name ?? "-"} ({user.JobLevel?.Name ?? "-"}) telah di-reset oleh tim IT Servicedesk pada {DateTime.UtcNow:dd MMM yyyy HH:mm:ss} UTC.\n\n" +
                $"• Status Sesi Aktif : Seluruh sesi login & Refresh Token sebelumnya telah dicabut otomatis ({tokens.Count} sesi dihentikan).\n" +
                $"• Kata Sandi Sementara : {effectiveNewPassword}\n" +
                $"• Tindakan Wajib : Silakan segera login dan ubah kata sandi Anda melalui menu 'Profil Saya' di pojok kanan atas aplikasi.\n\n" +
                $"Apabila Anda tidak merasa mengajukan permintaan reset kata sandi ini, segera hubungi tim IT Servicedesk.",
            inAppNotificationTitle: "Kata Sandi Akun Di-reset oleh IT Servicedesk",
            inAppNotificationMessage: $"Kata sandi akun @{user.Username} telah di-reset oleh IT Servicedesk. Pemberitahuan resmi juga telah dikirim ke email {user.Email}.",
            cancellationToken: cancellationToken
        );

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = $"Kata sandi untuk {user.FullName} (@{user.Username}) berhasil di-reset oleh Servicedesk. Email pemberitahuan telah dikirim dari {emailResult.SenderEmail} ke {user.Email}.",
            emailNotification = emailResult
        });
    }

    [HttpPost("toggle-user-lock")]
    public async Task<IActionResult> ToggleUserLock([FromBody] ToggleUserActiveRequest request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.JobLevel)
            .Include(u => u.PrimaryOrgUnit)
            .FirstOrDefaultAsync(u => u.Id == request.TargetUserId, cancellationToken);
        if (user == null)
            return NotFound(new { message = "Pengguna tidak ditemukan." });

        user.IsActive = request.IsActive;

        int revokedSessions = 0;
        if (!user.IsActive)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(t => t.UserId == user.Id && t.RevokedAtUtc == null)
                .ToListAsync(cancellationToken);
            foreach (var t in activeTokens)
            {
                t.RevokedAtUtc = DateTime.UtcNow;
                revokedSessions++;
            }
        }

        var statusLabel = user.IsActive ? "DIBUKA (ACTIVE)" : "DIKUNCI (LOCKED)";
        var eventType = user.IsActive ? "SERVICEDESK_ACCOUNT_UNLOCKED" : "SERVICEDESK_ACCOUNT_LOCKED";
        var subjectLine = user.IsActive
            ? $"Akun Anda Telah Dibuka Kembali (ACCOUNT UNLOCKED) — @{user.Username}"
            : $"Pemberitahuan Penguncian Akun (ACCOUNT LOCKED) — @{user.Username}";

        var bodyContent = user.IsActive
            ? $"Yth. {user.FullName} ({user.EmployeeNumber} / @{user.Username}),\n\n" +
              $"Kami informasikan bahwa status akun Anda pada {user.PrimaryOrgUnit?.Name ?? "-"} ({user.JobLevel?.Name ?? "-"}) telah DIBUKA KEMBALI (ACTIVE) oleh tim IT Servicedesk pada {DateTime.UtcNow:dd MMM yyyy HH:mm:ss} UTC.\n\n" +
              $"• Status Akun Saat Ini : ACTIVE (Dapat mengakses sistem secara normal)\n" +
              $"• Hak Akses : Otorisasi Sumbu 1 ({user.JobLevel?.Code}) & Sumbu 2 (RBAC) Anda telah dipulihkan.\n\n" +
              $"Anda kini dapat melakukan login kembali ke portal aplikasi menggunakan kredensial Anda."
            : $"Yth. {user.FullName} ({user.EmployeeNumber} / @{user.Username}),\n\n" +
              $"Demi menjaga keamanan sistem dan kepatuhan audit, akun Anda pada {user.PrimaryOrgUnit?.Name ?? "-"} ({user.JobLevel?.Name ?? "-"}) telah DIKUNCI SEMENTARA (LOCKED) oleh tim IT Servicedesk pada {DateTime.UtcNow:dd MMM yyyy HH:mm:ss} UTC.\n\n" +
              $"• Status Akun Saat Ini : LOCKED (Akses login dinonaktifkan sementara)\n" +
              $"• Sesi Dihentikan : {revokedSessions} sesi aktif / Refresh Token telah dicabut otomatis.\n\n" +
              $"Apabila Anda membutuhkan pembukaan blokir akun (Unlock Account) atau klarifikasi lebih lanjut, silakan hubungi layanan bantuan IT Servicedesk melalui alamat email Reply-To yang tertera pada pesan ini.";

        var emailResult = await EnterpriseEmailDispatcher.DispatchAsync(
            _context,
            eventType: eventType,
            moduleSource: "IT_SERVICEDESK",
            recipientUserId: user.Id,
            recipientName: user.FullName,
            recipientEmail: user.Email,
            referenceCode: $"USR-LCK-{user.EmployeeNumber}",
            subjectPrefix: subjectLine,
            bodyContent: bodyContent,
            inAppNotificationTitle: user.IsActive
                ? "Akun Anda Telah Dibuka (ACTIVE) oleh IT Servicedesk"
                : "Akun Anda Dikunci (LOCKED) oleh IT Servicedesk",
            inAppNotificationMessage: $"Status akun @{user.Username} diubah menjadi {statusLabel}. Email pemberitahuan resmi telah dikirim ke {user.Email}.",
            cancellationToken: cancellationToken
        );

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = $"Status akun {user.FullName} (@{user.Username}) berhasil diubah menjadi {statusLabel}. Email pemberitahuan telah dikirim dari {emailResult.SenderEmail} ke {user.Email}.",
            emailNotification = emailResult
        });
    }

    [HttpGet("bottlenecks")]
    public async Task<IActionResult> GetWorkflowBottlenecks(CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;

        var activeSteps = await _context.WorkflowSteps
            .Include(s => s.WorkflowInstance)
                .ThenInclude(w => w.RequesterUser)
            .Include(s => s.WorkflowInstance)
                .ThenInclude(w => w.RequesterOrgUnit)
            .Include(s => s.AssignedUser)
            .Include(s => s.ResolvedOrgUnit)
            .Where(s =>
                s.Status == WorkflowStepStatus.PENDING &&
                s.WorkflowInstance.Status == WorkflowInstanceStatus.IN_PROGRESS &&
                s.RevisionCycle == s.WorkflowInstance.CurrentRevisionCycle)
            .OrderBy(s => s.DueDateSla)
            .Select(s => new
            {
                StepId = s.Id,
                s.WorkflowInstanceId,
                s.WorkflowInstance.ReferenceNumber,
                s.WorkflowInstance.DocTypeCode,
                s.WorkflowInstance.SubCategoryCode,
                s.WorkflowInstance.TransactionAmount,
                s.WorkflowInstance.CurrentRevisionCycle,
                RequesterName = s.WorkflowInstance.RequesterUser.FullName,
                RequesterOrgCode = s.WorkflowInstance.RequesterOrgUnit.Code,
                s.Sequence,
                s.TargetJobLevelCode,
                ResolvedOrgUnitCode = s.ResolvedOrgUnit.Code,
                AssignedUserName = s.AssignedUser.FullName,
                AssignedUserEmail = s.AssignedUser.Email,
                s.DueDateSla,
                CreatedAt = s.CreatedAt,
                IsOverdue = s.DueDateSla < nowUtc,
                HoursRemaining = Math.Round((s.DueDateSla - nowUtc).TotalHours, 1)
            })
            .ToListAsync(cancellationToken);

        return Ok(activeSteps);
    }
}

[ApiController]
[Route("api/[controller]")]
public class SuperAdminController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public SuperAdminController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("rbac-matrix")]
    public async Task<IActionResult> GetRbacMatrix(CancellationToken cancellationToken)
    {
        var roles = await _context.Roles
            .Include(r => r.RolePermissions)
            .Include(r => r.UserRoles)
            .OrderBy(r => r.Code)
            .Select(r => new
            {
                r.Id,
                r.Code,
                r.Name,
                r.Description,
                UserCount = r.UserRoles.Count,
                PermissionIds = r.RolePermissions.Select(rp => rp.PermissionId).ToList()
            })
            .ToListAsync(cancellationToken);

        var permissions = await _context.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Code)
            .Select(p => new
            {
                p.Id,
                p.Code,
                p.Module,
                p.Description
            })
            .ToListAsync(cancellationToken);

        return Ok(new { roles, permissions });
    }

    [HttpGet("menus")]
    public async Task<IActionResult> GetMenus(CancellationToken cancellationToken)
    {
        var items = await _context.AppMenuItems
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.MenuCode)
            .Select(m => new
            {
                m.Id,
                m.MenuCode,
                m.Title,
                m.Subtitle,
                m.GroupCategory,
                m.IconName,
                m.SortOrder,
                m.RequiredPermissionCode,
                AllowedRoleCodes = string.IsNullOrWhiteSpace(m.AllowedRoleCodesCsv)
                    ? new List<string>()
                    : m.AllowedRoleCodesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                m.IsVisible
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    private static string ToPermissionModulePrefix(string menuCode)
    {
        var raw = (menuCode ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(raw)) return "Menu";

        var tokens = raw.Split(new[] { '-', '_', ' ', '.' }, StringSplitOptions.RemoveEmptyEntries);
        if (tokens.Length == 1 && tokens[0].Length <= 4)
        {
            return tokens[0].ToUpperInvariant();
        }

        return string.Concat(tokens.Select(t =>
            t.Length <= 3 && t == t.ToUpperInvariant()
                ? t.ToUpperInvariant()
                : char.ToUpperInvariant(t[0]) + (t.Length > 1 ? t.Substring(1).ToLowerInvariant() : string.Empty)));
    }

    private async Task<(string ModulePrefix, List<string> GeneratedCodes)> EnsureStandardMenuCrudPermissionsAsync(
        string menuCode,
        string menuTitle,
        List<string>? allowedRoleCodes,
        CancellationToken cancellationToken)
    {
        var prefix = ToPermissionModulePrefix(menuCode);
        var specs = new (string Action, string Description)[]
        {
            ("Read", $"Lihat daftar & detail data pada menu {menuTitle}"),
            ("Create", $"Tambah data baru (+ Tambah) pada menu {menuTitle}"),
            ("Edit", $"Ubah / perbarui data pada menu {menuTitle}"),
            ("Delete", $"Hapus data pada menu {menuTitle}"),
            ("Approve", $"Setujui / tolak dokumen workflow pada menu {menuTitle}"),
            ("Export", $"Unduh / export laporan (Excel/PDF) pada menu {menuTitle}")
        };

        var existingPermissions = await _context.Permissions.ToListAsync(cancellationToken);
        var roles = await _context.Roles
            .Include(r => r.RolePermissions)
            .ToListAsync(cancellationToken);

        var superAdminRole = roles.FirstOrDefault(r => r.Code.Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase));
        var targetRoleCodes = (allowedRoleCodes ?? new List<string>())
            .Select(rc => rc.Trim().ToUpperInvariant())
            .Where(rc => !string.IsNullOrEmpty(rc))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var generatedCodes = new List<string>();

        foreach (var spec in specs)
        {
            var code = $"{prefix}.{spec.Action}";
            var perm = existingPermissions.FirstOrDefault(p => p.Code.Equals(code, StringComparison.OrdinalIgnoreCase));
            if (perm == null)
            {
                perm = new Permission
                {
                    Code = code,
                    Module = prefix,
                    Description = spec.Description
                };
                _context.Permissions.Add(perm);
                existingPermissions.Add(perm);
                generatedCodes.Add(code);
            }

            if (superAdminRole != null && !superAdminRole.RolePermissions.Any(rp => rp.PermissionId == perm.Id))
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = superAdminRole.Id,
                    PermissionId = perm.Id
                });
            }

            // Automatically grant .Read to all AllowedRoles configured on this menu
            if (spec.Action == "Read")
            {
                foreach (var role in roles.Where(r => targetRoleCodes.Contains(r.Code)))
                {
                    if (!role.RolePermissions.Any(rp => rp.PermissionId == perm.Id))
                    {
                        _context.RolePermissions.Add(new RolePermission
                        {
                            RoleId = role.Id,
                            PermissionId = perm.Id
                        });
                    }
                }
            }
        }

        return (prefix, generatedCodes);
    }

    [HttpPost("menus")]
    public async Task<IActionResult> CreateMenu([FromBody] UpsertMenuItemRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.MenuCode) || string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Kode Menu dan Nama Menu wajib diisi." });

        var normCode = request.MenuCode.Trim().ToLowerInvariant();
        if (await _context.AppMenuItems.AnyAsync(m => m.MenuCode.ToLower() == normCode, cancellationToken))
            return BadRequest(new { message = $"Kode Menu '{normCode}' sudah terdaftar." });

        var prefix = ToPermissionModulePrefix(normCode);
        var resolvedRequiredPerm = request.RequiredPermissionCode?.Trim() ?? string.Empty;
        if (request.AutoGenerateCrudPermissions &&
            (string.IsNullOrWhiteSpace(resolvedRequiredPerm) || resolvedRequiredPerm.Equals("Transaction.Read", StringComparison.OrdinalIgnoreCase)))
        {
            resolvedRequiredPerm = $"{prefix}.Read";
        }

        var menu = new AppMenuItem
        {
            MenuCode = normCode,
            Title = request.Title.Trim(),
            Subtitle = request.Subtitle?.Trim() ?? string.Empty,
            GroupCategory = string.IsNullOrWhiteSpace(request.GroupCategory) ? "Core Workspace" : request.GroupCategory.Trim(),
            IconName = string.IsNullOrWhiteSpace(request.IconName) ? "IconRoute" : request.IconName.Trim(),
            SortOrder = request.SortOrder,
            RequiredPermissionCode = resolvedRequiredPerm,
            AllowedRoleCodesCsv = request.AllowedRoleCodes != null && request.AllowedRoleCodes.Count > 0
                ? string.Join(",", request.AllowedRoleCodes.Select(r => r.Trim().ToUpperInvariant()).Distinct())
                : "SUPERADMIN",
            IsVisible = request.IsVisible
        };

        _context.AppMenuItems.Add(menu);

        List<string> generatedPerms = new();
        if (request.AutoGenerateCrudPermissions)
        {
            var res = await EnsureStandardMenuCrudPermissionsAsync(normCode, menu.Title, request.AllowedRoleCodes, cancellationToken);
            generatedPerms = res.GeneratedCodes;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var extraMsg = request.AutoGenerateCrudPermissions
            ? $" Paket 6 Standard CRUD Permissions ({prefix}.Read/Create/Edit/Delete/Approve/Export) otomatis disiapkan di Matriks RBAC."
            : string.Empty;

        return Ok(new
        {
            menu.Id,
            menu.MenuCode,
            generatedPermissions = generatedPerms,
            message = $"Menu '{menu.Title}' berhasil ditambahkan.{extraMsg}"
        });
    }

    [HttpPut("menus/{id:guid}")]
    public async Task<IActionResult> UpdateMenu(Guid id, [FromBody] UpsertMenuItemRequest request, CancellationToken cancellationToken)
    {
        var menu = await _context.AppMenuItems.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (menu == null)
            return NotFound(new { message = "Menu aplikasi tidak ditemukan." });

        var normCode = request.MenuCode.Trim().ToLowerInvariant();
        if (await _context.AppMenuItems.AnyAsync(m => m.Id != id && m.MenuCode.ToLower() == normCode, cancellationToken))
            return BadRequest(new { message = $"Kode Menu '{normCode}' sudah digunakan." });

        var prefix = ToPermissionModulePrefix(normCode);
        var resolvedRequiredPerm = request.RequiredPermissionCode?.Trim() ?? string.Empty;
        if (request.AutoGenerateCrudPermissions && string.IsNullOrWhiteSpace(resolvedRequiredPerm))
        {
            resolvedRequiredPerm = $"{prefix}.Read";
        }

        menu.MenuCode = normCode;
        menu.Title = request.Title.Trim();
        menu.Subtitle = request.Subtitle?.Trim() ?? string.Empty;
        menu.GroupCategory = string.IsNullOrWhiteSpace(request.GroupCategory) ? "Core Workspace" : request.GroupCategory.Trim();
        menu.IconName = string.IsNullOrWhiteSpace(request.IconName) ? "IconRoute" : request.IconName.Trim();
        menu.SortOrder = request.SortOrder;
        menu.RequiredPermissionCode = resolvedRequiredPerm;
        menu.AllowedRoleCodesCsv = request.AllowedRoleCodes != null && request.AllowedRoleCodes.Count > 0
            ? string.Join(",", request.AllowedRoleCodes.Select(r => r.Trim().ToUpperInvariant()).Distinct())
            : "SUPERADMIN";
        menu.IsVisible = request.IsVisible;

        if (request.AutoGenerateCrudPermissions)
        {
            await EnsureStandardMenuCrudPermissionsAsync(normCode, menu.Title, request.AllowedRoleCodes, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var extraMsg = request.AutoGenerateCrudPermissions
            ? $" Paket 6 Standard CRUD Permissions ({prefix}.Read/Create/Edit/Delete/Approve/Export) telah disinkronkan."
            : string.Empty;

        return Ok(new { menu.Id, menu.MenuCode, message = $"Konfigurasi menu '{menu.Title}' berhasil diperbarui.{extraMsg}" });
    }

    [HttpPost("menus/{id:guid}/generate-crud-permissions")]
    public async Task<IActionResult> GenerateMenuCrudPermissions(Guid id, CancellationToken cancellationToken)
    {
        var menu = await _context.AppMenuItems.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (menu == null)
            return NotFound(new { message = "Menu aplikasi tidak ditemukan." });

        var allowedRoles = string.IsNullOrWhiteSpace(menu.AllowedRoleCodesCsv)
            ? new List<string> { "SUPERADMIN" }
            : menu.AllowedRoleCodesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

        var (prefix, generated) = await EnsureStandardMenuCrudPermissionsAsync(menu.MenuCode, menu.Title, allowedRoles, cancellationToken);

        if (string.IsNullOrWhiteSpace(menu.RequiredPermissionCode))
        {
            menu.RequiredPermissionCode = $"{prefix}.Read";
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            menu.Id,
            menu.MenuCode,
            modulePrefix = prefix,
            generatedCount = generated.Count,
            message = generated.Count > 0
                ? $"Berhasil men-generate {generated.Count} permission baru ({string.Join(", ", generated)}) untuk menu '{menu.Title}'."
                : $"Seluruh 6 Standard CRUD Permissions ({prefix}.Read/Create/Edit/Delete/Approve/Export) untuk menu '{menu.Title}' sudah lengkap dan tersinkronisasi."
        });
    }

    [HttpDelete("menus/{id:guid}")]
    public async Task<IActionResult> DeleteMenu(Guid id, CancellationToken cancellationToken)
    {
        var menu = await _context.AppMenuItems.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (menu == null)
            return NotFound(new { message = "Menu aplikasi tidak ditemukan." });

        if (menu.MenuCode == "menu-rbac")
            return BadRequest(new { message = "Menu inti 'Menu Management (RBAC)' tidak dapat dihapus." });

        _context.AppMenuItems.Remove(menu);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Menu '{menu.Title}' berhasil dihapus." });
    }

    [HttpPost("roles")]
    public async Task<IActionResult> CreateRole([FromBody] UpsertRoleRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Kode Role dan Nama Role wajib diisi." });

        var normCode = request.Code.Trim().ToUpperInvariant();
        if (await _context.Roles.AnyAsync(r => r.Code.ToUpper() == normCode, cancellationToken))
            return BadRequest(new { message = $"Role '{normCode}' sudah terdaftar." });

        var role = new Role
        {
            Code = normCode,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim()
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { role.Id, role.Code, message = $"Role '{role.Code}' berhasil ditambahkan." });
    }

    [HttpPut("roles/{id:guid}")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpsertRoleRequest request, CancellationToken cancellationToken)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (role == null)
            return NotFound(new { message = "Role tidak ditemukan." });

        role.Code = request.Code.Trim().ToUpperInvariant();
        role.Name = request.Name.Trim();
        role.Description = request.Description?.Trim();

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { role.Id, role.Code, message = $"Role '{role.Code}' berhasil diperbarui." });
    }

    [HttpDelete("roles/{id:guid}")]
    public async Task<IActionResult> DeleteRole(Guid id, CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .Include(r => r.RolePermissions)
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role == null)
            return NotFound(new { message = "Role tidak ditemukan." });

        if (role.Code is "SUPERADMIN" or "EMPLOYEE" or "AUDITOR")
            return BadRequest(new { message = $"Role sistem inti '{role.Code}' tidak dapat dihapus." });

        if (role.UserRoles.Count > 0)
            return BadRequest(new { message = $"Role '{role.Code}' masih digunakan oleh {role.UserRoles.Count} pengguna." });

        _context.RolePermissions.RemoveRange(role.RolePermissions);
        _context.Roles.Remove(role);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Role '{role.Code}' berhasil dihapus." });
    }

    [HttpPost("permissions")]
    public async Task<IActionResult> CreatePermission([FromBody] CreatePermissionRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Module))
            return BadRequest(new { message = "Kode Permission dan Nama Modul wajib diisi." });

        var normCode = request.Code.Trim();
        if (await _context.Permissions.AnyAsync(p => p.Code.ToLower() == normCode.ToLower(), cancellationToken))
            return BadRequest(new { message = $"Permission '{normCode}' sudah terdaftar." });

        var perm = new Permission
        {
            Code = normCode,
            Module = request.Module.Trim(),
            Description = request.Description?.Trim()
        };

        _context.Permissions.Add(perm);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { perm.Id, perm.Code, message = $"Permission '{perm.Code}' berhasil ditambahkan." });
    }

    [HttpPost("toggle-role-permission")]
    public async Task<IActionResult> ToggleRolePermission([FromBody] ToggleRolePermissionRequest request, CancellationToken cancellationToken)
    {
        var existing = await _context.RolePermissions
            .FirstOrDefaultAsync(rp => rp.RoleId == request.RoleId && rp.PermissionId == request.PermissionId, cancellationToken);

        if (request.IsGranted && existing == null)
        {
            _context.RolePermissions.Add(new RolePermission
            {
                RoleId = request.RoleId,
                PermissionId = request.PermissionId
            });
            await _context.SaveChangesAsync(cancellationToken);
        }
        else if (!request.IsGranted && existing != null)
        {
            _context.RolePermissions.Remove(existing);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { message = "Matriks Role-Permission berhasil diperbarui." });
    }

    [HttpPost("user-roles")]
    public async Task<IActionResult> UpdateUserRoles([FromBody] UpdateUserRolesRequest request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == request.TargetUserId, cancellationToken);

        if (user == null)
            return NotFound(new { message = "Pengguna tidak ditemukan." });

        var allRoles = await _context.Roles.ToListAsync(cancellationToken);
        _context.UserRoles.RemoveRange(user.UserRoles);

        foreach (var code in request.RoleCodes.Distinct())
        {
            var r = allRoles.FirstOrDefault(x => x.Code.Equals(code, StringComparison.OrdinalIgnoreCase));
            if (r != null)
            {
                _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = r.Id });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Peran fungsional (Axis 2) untuk {user.FullName} berhasil diperbarui." });
    }

    [HttpPost("organization-units")]
    public async Task<IActionResult> CreateOrganizationUnit([FromBody] CreateOrganizationUnitRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<OrganizationUnitType>(request.UnitType, true, out var parsedType))
        {
            parsedType = OrganizationUnitType.DEPARTMENT;
        }

        var unit = new OrganizationUnit
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            UnitType = parsedType,
            ParentUnitId = request.ParentUnitId,
            IsActive = true
        };

        _context.OrganizationUnits.Add(unit);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(unit);
    }
}

[ApiController]
[Route("api/[controller]")]
public class AbacPoliciesController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AbacPoliciesController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllPolicies(CancellationToken cancellationToken)
    {
        var rules = await _context.AbacPolicyRules
            .OrderBy(r => r.PriorityOrder)
            .ThenBy(r => r.PolicyCode)
            .Select(r => new
            {
                r.Id,
                r.PolicyCode,
                r.Name,
                r.Description,
                r.TargetResource,
                r.TargetAction,
                SubjectJobLevels = string.IsNullOrWhiteSpace(r.SubjectJobLevelsCsv)
                    ? new List<string> { "ALL" }
                    : r.SubjectJobLevelsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                r.MinJobRank,
                r.MaxJobRank,
                SubjectRoles = string.IsNullOrWhiteSpace(r.SubjectRolesCsv)
                    ? new List<string> { "ALL" }
                    : r.SubjectRolesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                r.OrgScopeRule,
                r.SubCategoryScope,
                r.MaxTransactionAmount,
                r.EnforceFourEyesSod,
                r.RequireDigitalSignature,
                r.Effect,
                r.PriorityOrder,
                r.IsActive,
                r.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(rules);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePolicy([FromBody] UpsertAbacPolicyRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PolicyCode) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Kode Kebijakan ABAC dan Nama Kebijakan wajib diisi." });

        var normCode = request.PolicyCode.Trim().ToUpperInvariant();
        if (await _context.AbacPolicyRules.AnyAsync(r => r.PolicyCode.ToUpper() == normCode, cancellationToken))
            return BadRequest(new { message = $"Kode Kebijakan ABAC '{normCode}' sudah terdaftar." });

        var rule = new AbacPolicyRule
        {
            PolicyCode = normCode,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            TargetResource = string.IsNullOrWhiteSpace(request.TargetResource) ? "ALL" : request.TargetResource.Trim().ToUpperInvariant(),
            TargetAction = string.IsNullOrWhiteSpace(request.TargetAction) ? "ALL" : request.TargetAction.Trim().ToUpperInvariant(),
            SubjectJobLevelsCsv = request.SubjectJobLevels != null && request.SubjectJobLevels.Count > 0
                ? string.Join(",", request.SubjectJobLevels.Select(x => x.Trim().ToUpperInvariant()).Distinct())
                : "ALL",
            MinJobRank = request.MinJobRank,
            MaxJobRank = request.MaxJobRank > 0 ? request.MaxJobRank : 100,
            SubjectRolesCsv = request.SubjectRoles != null && request.SubjectRoles.Count > 0
                ? string.Join(",", request.SubjectRoles.Select(x => x.Trim().ToUpperInvariant()).Distinct())
                : "ALL",
            OrgScopeRule = string.IsNullOrWhiteSpace(request.OrgScopeRule) ? "ANY_ORG_UNIT" : request.OrgScopeRule.Trim().ToUpperInvariant(),
            SubCategoryScope = string.IsNullOrWhiteSpace(request.SubCategoryScope) ? "ALL" : request.SubCategoryScope.Trim().ToUpperInvariant(),
            MaxTransactionAmount = request.MaxTransactionAmount,
            EnforceFourEyesSod = request.EnforceFourEyesSod,
            RequireDigitalSignature = request.RequireDigitalSignature,
            Effect = (request.Effect ?? "ALLOW").Trim().ToUpperInvariant() == "DENY" ? "DENY" : "ALLOW",
            PriorityOrder = request.PriorityOrder > 0 ? request.PriorityOrder : 10,
            IsActive = request.IsActive
        };

        _context.AbacPolicyRules.Add(rule);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { rule.Id, rule.PolicyCode, message = $"Kebijakan ABAC '{rule.PolicyCode}' berhasil ditambahkan." });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePolicy(Guid id, [FromBody] UpsertAbacPolicyRequest request, CancellationToken cancellationToken)
    {
        var rule = await _context.AbacPolicyRules.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (rule == null)
            return NotFound(new { message = "Kebijakan ABAC tidak ditemukan." });

        var normCode = request.PolicyCode.Trim().ToUpperInvariant();
        if (await _context.AbacPolicyRules.AnyAsync(r => r.Id != id && r.PolicyCode.ToUpper() == normCode, cancellationToken))
            return BadRequest(new { message = $"Kode Kebijakan ABAC '{normCode}' sudah digunakan." });

        rule.PolicyCode = normCode;
        rule.Name = request.Name.Trim();
        rule.Description = request.Description?.Trim();
        rule.TargetResource = string.IsNullOrWhiteSpace(request.TargetResource) ? "ALL" : request.TargetResource.Trim().ToUpperInvariant();
        rule.TargetAction = string.IsNullOrWhiteSpace(request.TargetAction) ? "ALL" : request.TargetAction.Trim().ToUpperInvariant();
        rule.SubjectJobLevelsCsv = request.SubjectJobLevels != null && request.SubjectJobLevels.Count > 0
            ? string.Join(",", request.SubjectJobLevels.Select(x => x.Trim().ToUpperInvariant()).Distinct())
            : "ALL";
        rule.MinJobRank = request.MinJobRank;
        rule.MaxJobRank = request.MaxJobRank > 0 ? request.MaxJobRank : 100;
        rule.SubjectRolesCsv = request.SubjectRoles != null && request.SubjectRoles.Count > 0
            ? string.Join(",", request.SubjectRoles.Select(x => x.Trim().ToUpperInvariant()).Distinct())
            : "ALL";
        rule.OrgScopeRule = string.IsNullOrWhiteSpace(request.OrgScopeRule) ? "ANY_ORG_UNIT" : request.OrgScopeRule.Trim().ToUpperInvariant();
        rule.SubCategoryScope = string.IsNullOrWhiteSpace(request.SubCategoryScope) ? "ALL" : request.SubCategoryScope.Trim().ToUpperInvariant();
        rule.MaxTransactionAmount = request.MaxTransactionAmount;
        rule.EnforceFourEyesSod = request.EnforceFourEyesSod;
        rule.RequireDigitalSignature = request.RequireDigitalSignature;
        rule.Effect = (request.Effect ?? "ALLOW").Trim().ToUpperInvariant() == "DENY" ? "DENY" : "ALLOW";
        rule.PriorityOrder = request.PriorityOrder > 0 ? request.PriorityOrder : 10;
        rule.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { rule.Id, rule.PolicyCode, message = $"Kebijakan ABAC '{rule.PolicyCode}' berhasil diperbarui." });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePolicy(Guid id, CancellationToken cancellationToken)
    {
        var rule = await _context.AbacPolicyRules.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (rule == null)
            return NotFound(new { message = "Kebijakan ABAC tidak ditemukan." });

        _context.AbacPolicyRules.Remove(rule);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Kebijakan ABAC '{rule.PolicyCode}' berhasil dihapus." });
    }

    [HttpPost("evaluate")]
    public async Task<IActionResult> EvaluateAbac([FromBody] EvaluateAbacRequest request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.JobLevel)
            .Include(u => u.PrimaryOrgUnit)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
            return NotFound(new { message = "Pengguna subjek evaluasi tidak ditemukan." });

        var orgUnits = await _context.OrganizationUnits.ToDictionaryAsync(o => o.Id, cancellationToken);
        var userRoles = user.UserRoles.Select(ur => ur.Role.Code.ToUpperInvariant()).ToHashSet();
        var activeRules = await _context.AbacPolicyRules
            .Where(r => r.IsActive)
            .OrderBy(r => r.PriorityOrder)
            .ToListAsync(cancellationToken);

        bool IsInSameOrgBranch(Guid subjectOrgId, Guid resourceOrgId)
        {
            if (subjectOrgId == resourceOrgId) return true;
            // Walk up from resourceOrgId to see if subjectOrgId is an ancestor
            Guid? cur = resourceOrgId;
            while (cur.HasValue && orgUnits.TryGetValue(cur.Value, out var node))
            {
                if (node.Id == subjectOrgId) return true;
                cur = node.ParentUnitId;
            }
            return false;
        }

        var evaluationTraces = new List<object>();
        string finalDecision = "DENY (Default Deny — Tidak ada aturan ALLOW yang cocok)";
        bool isAllowed = false;

        foreach (var rule in activeRules)
        {
            var resTokens = rule.TargetResource.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var actTokens = rule.TargetAction.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var jlTokens = rule.SubjectJobLevelsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var roleTokens = rule.SubjectRolesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            bool resourceMatch = resTokens.Contains("ALL", StringComparer.OrdinalIgnoreCase)
                || resTokens.Contains(request.TargetResource, StringComparer.OrdinalIgnoreCase);

            bool actionMatch = actTokens.Contains("ALL", StringComparer.OrdinalIgnoreCase)
                || actTokens.Contains(request.TargetAction, StringComparer.OrdinalIgnoreCase);

            bool jobLevelMatch = jlTokens.Contains("ALL", StringComparer.OrdinalIgnoreCase)
                || jlTokens.Contains(user.JobLevel.Code, StringComparer.OrdinalIgnoreCase);

            bool rankMatch = user.JobLevel.RankOrder >= rule.MinJobRank && user.JobLevel.RankOrder <= rule.MaxJobRank;

            bool roleMatch = roleTokens.Contains("ALL", StringComparer.OrdinalIgnoreCase)
                || roleTokens.Any(rt => userRoles.Contains(rt.ToUpperInvariant()));

            bool subCatMatch = rule.SubCategoryScope.Equals("ALL", StringComparison.OrdinalIgnoreCase)
                || rule.SubCategoryScope.Equals(request.SubCategoryCode ?? "ALL", StringComparison.OrdinalIgnoreCase);

            bool orgMatch = true;
            var targetOrgId = request.ResourceOrgUnitId ?? user.PrimaryOrgUnitId;
            if (rule.OrgScopeRule == "SAME_DEPARTMENT_ONLY")
                orgMatch = user.PrimaryOrgUnitId == targetOrgId;
            else if (rule.OrgScopeRule == "SAME_ORG_BRANCH_UPWARD")
                orgMatch = IsInSameOrgBranch(user.PrimaryOrgUnitId, targetOrgId);
            else if (rule.OrgScopeRule == "HEAD_OFFICE_ONLY")
                orgMatch = user.PrimaryOrgUnit.Code.Equals("HO", StringComparison.OrdinalIgnoreCase);

            bool amountMatch = !rule.MaxTransactionAmount.HasValue
                || !request.TransactionAmount.HasValue
                || request.TransactionAmount.Value <= rule.MaxTransactionAmount.Value;

            bool sodPassed = !rule.EnforceFourEyesSod || !request.IsSelfApproval;
            bool signaturePassed = !rule.RequireDigitalSignature || user.SignatureDmsFileId.HasValue;

            bool allMatched = resourceMatch && actionMatch && jobLevelMatch && rankMatch && roleMatch
                && subCatMatch && orgMatch && amountMatch && sodPassed && signaturePassed;

            evaluationTraces.Add(new
            {
                rule.PolicyCode,
                rule.Name,
                rule.PriorityOrder,
                rule.Effect,
                Matched = allMatched,
                Details = $"Resource={resourceMatch}, Action={actionMatch}, JobLevel={jobLevelMatch}, Rank={rankMatch}, Role={roleMatch}, OrgScope={orgMatch}, Amount={amountMatch}, SoD4Eyes={sodPassed}, Signature={signaturePassed}"
            });

            if (allMatched)
            {
                if (rule.Effect == "DENY")
                {
                    isAllowed = false;
                    finalDecision = $"DENY oleh Aturan Prioritas #{rule.PriorityOrder} ({rule.PolicyCode} — {rule.Name})";
                    break;
                }
                else if (rule.Effect == "ALLOW" && !isAllowed)
                {
                    isAllowed = true;
                    finalDecision = $"ALLOW oleh Aturan Prioritas #{rule.PriorityOrder} ({rule.PolicyCode} — {rule.Name})";
                }
            }
        }

        return Ok(new
        {
            IsAllowed = isAllowed,
            FinalDecision = finalDecision,
            SubjectSummary = $"{user.FullName} ({user.JobLevel.Code} Rank {user.JobLevel.RankOrder} @ {user.PrimaryOrgUnit.Code} | Roles: {string.Join(", ", userRoles)})",
            Traces = evaluationTraces
        });
    }
}

public record UpdateBrandingSettingsRequest(
    string AppTitle,
    string AppSubtitle,
    string AppLogoIcon,
    string AppVersionBadge,
    string CompanyName,
    string? SystemAnnouncementBanner
);

public record UpsertAppSettingRequest(
    string SettingKey,
    string SettingValue,
    string DisplayName,
    string Category,
    string ValueType,
    string? Description,
    bool IsPublic
);

public record UpsertI18nEntryRequest(
    string TranslationKey,
    string ModuleGroup,
    string TextId,
    string TextEn,
    string? Description
);

public record UpdateEmailConfigRequest(
    string AdminSenderEmail,
    string AdminSenderName,
    string AdminSupportReplyTo,
    string? CcSecurityAuditEmail,
    string SmtpHost,
    string SmtpPort,
    string SmtpUsername,
    bool SmtpUseSsl,
    bool EmailNotificationEnabled
);

public record SendTestEmailRequest(
    Guid? TargetUserId,
    string? RecipientEmail,
    string? CustomSubject,
    string? CustomMessage
);

public record EmailDispatchResult(
    Guid OutboxLogId,
    bool Sent,
    string EventType,
    string ModuleSource,
    string SenderName,
    string SenderEmail,
    string ReplyToEmail,
    string RecipientName,
    string RecipientEmail,
    string? CcEmails,
    string Subject,
    string BodyText,
    string DeliveryStatus,
    string SmtpEndpoint,
    DateTime SentAtUtc
);

public static class EnterpriseEmailDispatcher
{
    public static async Task<EmailDispatchResult> DispatchAsync(
        IApplicationDbContext context,
        string eventType,
        string moduleSource,
        Guid? recipientUserId,
        string recipientName,
        string recipientEmail,
        string? referenceCode,
        string subjectPrefix,
        string bodyContent,
        string? inAppNotificationTitle,
        string? inAppNotificationMessage,
        CancellationToken cancellationToken)
    {
        var settings = await context.AppSettingItems
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        string GetVal(string key, string fallback) =>
            settings.FirstOrDefault(s => s.SettingKey.Equals(key, StringComparison.OrdinalIgnoreCase))?.SettingValue ?? fallback;

        var appTitle = GetVal("APP_TITLE", "CoreEnterprise Portal");
        var companyName = GetVal("COMPANY_NAME", "PT CoreEnterprise Nusantara Tbk");
        var senderEmail = GetVal("ADMIN_SENDER_EMAIL", "noreply-admin@coreenterprise.co.id");
        var senderName = GetVal("ADMIN_SENDER_NAME", "CoreEnterprise System Administrator");
        var replyToEmail = GetVal("ADMIN_SUPPORT_REPLY_TO", "it-servicedesk@coreenterprise.co.id");
        var ccAuditEmail = GetVal("EMAIL_CC_SECURITY_AUDIT", "security-audit@coreenterprise.co.id");
        var smtpHost = GetVal("SMTP_HOST", "smtp.coreenterprise.co.id");
        var smtpPort = GetVal("SMTP_PORT", "587");
        var smtpUseSsl = !GetVal("SMTP_USE_SSL", "true").Equals("false", StringComparison.OrdinalIgnoreCase);
        var emailEnabled = !GetVal("EMAIL_NOTIFICATION_ENABLED", "true").Equals("false", StringComparison.OrdinalIgnoreCase);

        var fullSubject = $"[{appTitle}] {subjectPrefix}";
        var fullBody =
            $"{bodyContent}\n\n" +
            $"──────────────────────────────────────────────────────────────\n" +
            $"Pengirim Resmi  : {senderName} <{senderEmail}>\n" +
            $"Bantuan / Reply : {replyToEmail}\n" +
            $"Entitas Korporat: {companyName} ({appTitle})\n" +
            $"Kode Referensi  : {referenceCode ?? "SYS-AUTO"}\n" +
            $"──────────────────────────────────────────────────────────────";

        var smtpEndpoint = $"{smtpHost}:{smtpPort} ({(smtpUseSsl ? "STARTTLS/SSL" : "Plain")})";
        var deliveryStatus = emailEnabled ? "SENT_OUTBOX" : "DISABLED_SKIPPED";

        var outboxLog = new EmailDispatchLog
        {
            EventType = eventType,
            ModuleSource = moduleSource,
            SenderName = senderName,
            SenderEmail = senderEmail,
            ReplyToEmail = replyToEmail,
            RecipientName = string.IsNullOrWhiteSpace(recipientName) ? recipientEmail : recipientName,
            RecipientEmail = recipientEmail,
            CcEmails = string.IsNullOrWhiteSpace(ccAuditEmail) ? null : ccAuditEmail,
            Subject = fullSubject,
            BodyText = fullBody,
            DeliveryStatus = deliveryStatus,
            SmtpHostUsed = smtpEndpoint,
            ReferenceCode = referenceCode
        };

        context.EmailDispatchLogs.Add(outboxLog);

        if (recipientUserId.HasValue && !string.IsNullOrWhiteSpace(inAppNotificationTitle))
        {
            context.UserNotifications.Add(new UserNotification
            {
                RecipientUserId = recipientUserId.Value,
                Title = inAppNotificationTitle,
                Message = inAppNotificationMessage ?? fullSubject,
                ActionUrl = "/profile",
                IsRead = false
            });
        }

        return new EmailDispatchResult(
            OutboxLogId: outboxLog.Id,
            Sent: emailEnabled,
            EventType: eventType,
            ModuleSource: moduleSource,
            SenderName: senderName,
            SenderEmail: senderEmail,
            ReplyToEmail: replyToEmail,
            RecipientName: outboxLog.RecipientName,
            RecipientEmail: recipientEmail,
            CcEmails: outboxLog.CcEmails,
            Subject: fullSubject,
            BodyText: fullBody,
            DeliveryStatus: deliveryStatus,
            SmtpEndpoint: smtpEndpoint,
            SentAtUtc: DateTime.UtcNow
        );
    }
}

[ApiController]
[Route("api/[controller]")]
public class AppSettingsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AppSettingsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllSettings(CancellationToken cancellationToken)
    {
        var items = await _context.AppSettingItems
            .OrderByDescending(x => x.IsSystemCore)
            .ThenBy(x => x.Category)
            .ThenBy(x => x.SettingKey)
            .Select(x => new
            {
                x.Id,
                x.SettingKey,
                x.SettingValue,
                x.DisplayName,
                x.Category,
                x.ValueType,
                x.Description,
                x.IsSystemCore,
                x.IsPublic,
                x.UpdatedAt,
                x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var i18nEntries = await _context.AppI18nEntries
            .OrderBy(x => x.ModuleGroup)
            .ThenBy(x => x.TranslationKey)
            .Select(x => new
            {
                x.Id,
                x.TranslationKey,
                x.ModuleGroup,
                x.TextId,
                x.TextEn,
                x.Description,
                x.IsSystemCore,
                x.UpdatedAt,
                x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var emailOutboxLogs = await _context.EmailDispatchLogs
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .Select(x => new
            {
                x.Id,
                x.EventType,
                x.ModuleSource,
                x.SenderName,
                x.SenderEmail,
                x.ReplyToEmail,
                x.RecipientName,
                x.RecipientEmail,
                x.CcEmails,
                x.Subject,
                x.BodyText,
                x.DeliveryStatus,
                x.SmtpHostUsed,
                x.ReferenceCode,
                x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        string GetVal(string key, string fallback) =>
            items.FirstOrDefault(i => i.SettingKey.Equals(key, StringComparison.OrdinalIgnoreCase))?.SettingValue ?? fallback;

        var branding = new
        {
            appTitle = GetVal("APP_TITLE", "CoreEnterprise Portal"),
            appSubtitle = GetVal("APP_SUBTITLE", "Otorisasi 2 Dimensi, Contextual DoA Header-Detail & 3-Axis Approver Resolution"),
            appLogoIcon = GetVal("APP_LOGO_ICON", "IconShieldLock"),
            appVersionBadge = GetVal("APP_VERSION_BADGE", "Enterprise v1.4.0"),
            companyName = GetVal("COMPANY_NAME", "PT CoreEnterprise Nusantara Tbk"),
            systemAnnouncementBanner = GetVal("SYSTEM_ANNOUNCEMENT_BANNER", "")
        };

        var emailConfig = new
        {
            adminSenderEmail = GetVal("ADMIN_SENDER_EMAIL", "noreply-admin@coreenterprise.co.id"),
            adminSenderName = GetVal("ADMIN_SENDER_NAME", "CoreEnterprise System Administrator"),
            adminSupportReplyTo = GetVal("ADMIN_SUPPORT_REPLY_TO", "it-servicedesk@coreenterprise.co.id"),
            ccSecurityAuditEmail = GetVal("EMAIL_CC_SECURITY_AUDIT", "security-audit@coreenterprise.co.id"),
            smtpHost = GetVal("SMTP_HOST", "smtp.coreenterprise.co.id"),
            smtpPort = GetVal("SMTP_PORT", "587"),
            smtpUsername = GetVal("SMTP_USERNAME", "noreply-admin@coreenterprise.co.id"),
            smtpUseSsl = !GetVal("SMTP_USE_SSL", "true").Equals("false", StringComparison.OrdinalIgnoreCase),
            emailNotificationEnabled = !GetVal("EMAIL_NOTIFICATION_ENABLED", "true").Equals("false", StringComparison.OrdinalIgnoreCase)
        };

        return Ok(new { branding, emailConfig, emailOutboxLogs, items, i18nEntries });
    }

    [HttpPost("email-config")]
    public async Task<IActionResult> UpdateEmailConfig([FromBody] UpdateEmailConfigRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.AdminSenderEmail))
            return BadRequest(new { message = "Alamat Email Admin Aplikasi (Sender Email) wajib diisi." });

        var existing = await _context.AppSettingItems.ToListAsync(cancellationToken);

        void UpsertEmailKey(string key, string val, string displayName, string valueType, bool isPublic)
        {
            var found = existing.FirstOrDefault(x => x.SettingKey.Equals(key, StringComparison.OrdinalIgnoreCase));
            if (found != null)
            {
                found.SettingValue = val;
            }
            else
            {
                _context.AppSettingItems.Add(new AppSettingItem
                {
                    SettingKey = key,
                    SettingValue = val,
                    DisplayName = displayName,
                    Category = "EMAIL",
                    ValueType = valueType,
                    IsSystemCore = true,
                    IsPublic = isPublic
                });
            }
        }

        var normSenderEmail = request.AdminSenderEmail.Trim().ToLowerInvariant();
        var normSenderName = string.IsNullOrWhiteSpace(request.AdminSenderName)
            ? "CoreEnterprise System Administrator"
            : request.AdminSenderName.Trim();
        var normReplyTo = string.IsNullOrWhiteSpace(request.AdminSupportReplyTo)
            ? normSenderEmail
            : request.AdminSupportReplyTo.Trim().ToLowerInvariant();
        var normCc = (request.CcSecurityAuditEmail ?? string.Empty).Trim().ToLowerInvariant();
        var normHost = string.IsNullOrWhiteSpace(request.SmtpHost) ? "smtp.coreenterprise.co.id" : request.SmtpHost.Trim();
        var normPort = string.IsNullOrWhiteSpace(request.SmtpPort) ? "587" : request.SmtpPort.Trim();
        var normUser = string.IsNullOrWhiteSpace(request.SmtpUsername) ? normSenderEmail : request.SmtpUsername.Trim();

        UpsertEmailKey("ADMIN_SENDER_EMAIL", normSenderEmail, "Alamat Email Admin Aplikasi (Sender Address)", "EMAIL", true);
        UpsertEmailKey("ADMIN_SENDER_NAME", normSenderName, "Nama Tampilan Pengirim Email Admin", "STRING", true);
        UpsertEmailKey("ADMIN_SUPPORT_REPLY_TO", normReplyTo, "Alamat Email Reply-To / Bantuan IT Servicedesk", "EMAIL", true);
        UpsertEmailKey("EMAIL_CC_SECURITY_AUDIT", normCc, "Alamat CC Audit Keamanan & Kepatuhan (Opsional)", "EMAIL", false);
        UpsertEmailKey("SMTP_HOST", normHost, "Host Server SMTP Korporat", "STRING", false);
        UpsertEmailKey("SMTP_PORT", normPort, "Port Server SMTP (587 STARTTLS / 465 SSL)", "NUMBER", false);
        UpsertEmailKey("SMTP_USERNAME", normUser, "Username Autentikasi Akun Email Admin", "STRING", false);
        UpsertEmailKey("SMTP_USE_SSL", request.SmtpUseSsl ? "true" : "false", "Gunakan Enkripsi STARTTLS / SSL pada SMTP", "BOOLEAN", false);
        UpsertEmailKey("EMAIL_NOTIFICATION_ENABLED", request.EmailNotificationEnabled ? "true" : "false", "Status Aktif Pengiriman Email Notifikasi Global", "BOOLEAN", true);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = $"Konfigurasi Akun Email Admin Aplikasi ({normSenderName} <{normSenderEmail}>) berhasil disimpan dan siap digunakan untuk IT Servicedesk & modul Transaksi.",
            emailConfig = new
            {
                adminSenderEmail = normSenderEmail,
                adminSenderName = normSenderName,
                adminSupportReplyTo = normReplyTo,
                ccSecurityAuditEmail = normCc,
                smtpHost = normHost,
                smtpPort = normPort,
                smtpUsername = normUser,
                smtpUseSsl = request.SmtpUseSsl,
                emailNotificationEnabled = request.EmailNotificationEnabled
            }
        });
    }

    [HttpPost("email-test")]
    public async Task<IActionResult> SendTestEmail([FromBody] SendTestEmailRequest request, CancellationToken cancellationToken)
    {
        User? targetUser = null;
        if (request.TargetUserId.HasValue && request.TargetUserId.Value != Guid.Empty)
        {
            targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.TargetUserId.Value, cancellationToken);
        }

        var recipientEmail = !string.IsNullOrWhiteSpace(request.RecipientEmail)
            ? request.RecipientEmail.Trim().ToLowerInvariant()
            : targetUser?.Email ?? "admin@coreenterprise.local";
        var recipientName = targetUser?.FullName ?? recipientEmail;

        var subject = string.IsNullOrWhiteSpace(request.CustomSubject)
            ? "Uji Koneksi Pengiriman Email Admin Aplikasi (SMTP & Outbox Verification)"
            : request.CustomSubject.Trim();

        var messageBody = string.IsNullOrWhiteSpace(request.CustomMessage)
            ? $"Yth. {recipientName},\n\n" +
              $"Ini adalah email uji coba otomatis dari modul Application Settings untuk memastikan bahwa konfigurasi Akun Email Admin Aplikasi (Sender Email, Reply-To, dan SMTP Relay) telah berfungsi dengan baik dan siap digunakan oleh modul IT Servicedesk serta transaksi bisnis (PO, DCP, dan Workflow Approval)."
            : request.CustomMessage.Trim();

        var result = await EnterpriseEmailDispatcher.DispatchAsync(
            _context,
            eventType: "TEST_ADMIN_EMAIL",
            moduleSource: "APP_SETTINGS",
            recipientUserId: targetUser?.Id,
            recipientName: recipientName,
            recipientEmail: recipientEmail,
            referenceCode: $"TEST-{DateTime.UtcNow:HHmmss}",
            subjectPrefix: subject,
            bodyContent: messageBody,
            inAppNotificationTitle: "Email Uji Coba Admin Aplikasi Terkirim",
            inAppNotificationMessage: $"Email uji coba dari { recipientEmail } berhasil dikirim melalui konfigurasi Email Admin Aplikasi.",
            cancellationToken: cancellationToken
        );

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = $"Email uji coba berhasil dikirim dari {result.SenderEmail} ke {result.RecipientEmail}.",
            emailNotification = result
        });
    }

    [HttpPost("branding")]
    public async Task<IActionResult> UpdateBranding([FromBody] UpdateBrandingSettingsRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.AppTitle))
            return BadRequest(new { message = "Judul Utama Aplikasi (App Title) wajib diisi." });

        var existing = await _context.AppSettingItems.ToListAsync(cancellationToken);

        void UpsertCoreKey(string key, string val, string displayName, string valueType)
        {
            var found = existing.FirstOrDefault(x => x.SettingKey.Equals(key, StringComparison.OrdinalIgnoreCase));
            if (found != null)
            {
                found.SettingValue = val;
            }
            else
            {
                _context.AppSettingItems.Add(new AppSettingItem
                {
                    SettingKey = key,
                    SettingValue = val,
                    DisplayName = displayName,
                    Category = "BRANDING",
                    ValueType = valueType,
                    IsSystemCore = true,
                    IsPublic = true
                });
            }
        }

        UpsertCoreKey("APP_TITLE", request.AppTitle.Trim(), "Judul Utama Aplikasi (App Title)", "STRING");
        UpsertCoreKey("APP_SUBTITLE", (request.AppSubtitle ?? string.Empty).Trim(), "Sub-Judul Aplikasi (App Subtitle)", "STRING");
        UpsertCoreKey("APP_LOGO_ICON", string.IsNullOrWhiteSpace(request.AppLogoIcon) ? "IconShieldLock" : request.AppLogoIcon.Trim(), "Ikon Logo Aplikasi (App Logo Icon)", "ICON");
        UpsertCoreKey("APP_VERSION_BADGE", string.IsNullOrWhiteSpace(request.AppVersionBadge) ? "Enterprise v1.4.0" : request.AppVersionBadge.Trim(), "Label Versi Aplikasi (Version Badge)", "STRING");
        UpsertCoreKey("COMPANY_NAME", string.IsNullOrWhiteSpace(request.CompanyName) ? "PT CoreEnterprise Nusantara Tbk" : request.CompanyName.Trim(), "Nama Perusahaan / Entitas Hukum", "STRING");
        UpsertCoreKey("SYSTEM_ANNOUNCEMENT_BANNER", (request.SystemAnnouncementBanner ?? string.Empty).Trim(), "Pengumuman Global / Maintenance Banner", "STRING");

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = "Identitas Aplikasi, Sub-Judul, dan Logo berhasil diperbarui secara global.",
            branding = new
            {
                appTitle = request.AppTitle.Trim(),
                appSubtitle = (request.AppSubtitle ?? string.Empty).Trim(),
                appLogoIcon = string.IsNullOrWhiteSpace(request.AppLogoIcon) ? "IconShieldLock" : request.AppLogoIcon.Trim(),
                appVersionBadge = string.IsNullOrWhiteSpace(request.AppVersionBadge) ? "Enterprise v1.4.0" : request.AppVersionBadge.Trim(),
                companyName = string.IsNullOrWhiteSpace(request.CompanyName) ? "PT CoreEnterprise Nusantara Tbk" : request.CompanyName.Trim(),
                systemAnnouncementBanner = (request.SystemAnnouncementBanner ?? string.Empty).Trim()
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateSetting([FromBody] UpsertAppSettingRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.SettingKey) || string.IsNullOrWhiteSpace(request.DisplayName))
            return BadRequest(new { message = "Kode Parameter (SettingKey) dan Nama Parameter wajib diisi." });

        var normKey = request.SettingKey.Trim().ToUpperInvariant().Replace(' ', '_');
        if (await _context.AppSettingItems.AnyAsync(x => x.SettingKey.ToUpper() == normKey, cancellationToken))
            return BadRequest(new { message = $"Parameter '{normKey}' sudah terdaftar." });

        var item = new AppSettingItem
        {
            SettingKey = normKey,
            SettingValue = request.SettingValue?.Trim() ?? string.Empty,
            DisplayName = request.DisplayName.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "GENERAL" : request.Category.Trim().ToUpperInvariant(),
            ValueType = string.IsNullOrWhiteSpace(request.ValueType) ? "STRING" : request.ValueType.Trim().ToUpperInvariant(),
            Description = request.Description?.Trim(),
            IsSystemCore = false,
            IsPublic = request.IsPublic
        };

        _context.AppSettingItems.Add(item);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { item.Id, item.SettingKey, message = $"Parameter aplikasi '{item.SettingKey}' berhasil ditambahkan." });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSetting(Guid id, [FromBody] UpsertAppSettingRequest request, CancellationToken cancellationToken)
    {
        var item = await _context.AppSettingItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (item == null)
            return NotFound(new { message = "Parameter pengaturan tidak ditemukan." });

        var normKey = request.SettingKey.Trim().ToUpperInvariant().Replace(' ', '_');
        if (!item.IsSystemCore && await _context.AppSettingItems.AnyAsync(x => x.Id != id && x.SettingKey.ToUpper() == normKey, cancellationToken))
            return BadRequest(new { message = $"Parameter '{normKey}' sudah digunakan." });

        if (!item.IsSystemCore)
        {
            item.SettingKey = normKey;
            item.Category = string.IsNullOrWhiteSpace(request.Category) ? item.Category : request.Category.Trim().ToUpperInvariant();
            item.ValueType = string.IsNullOrWhiteSpace(request.ValueType) ? item.ValueType : request.ValueType.Trim().ToUpperInvariant();
        }

        item.SettingValue = request.SettingValue?.Trim() ?? string.Empty;
        item.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? item.DisplayName : request.DisplayName.Trim();
        item.Description = request.Description?.Trim();
        item.IsPublic = request.IsPublic;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { item.Id, item.SettingKey, message = $"Parameter '{item.SettingKey}' berhasil diperbarui." });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSetting(Guid id, CancellationToken cancellationToken)
    {
        var item = await _context.AppSettingItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (item == null)
            return NotFound(new { message = "Parameter pengaturan tidak ditemukan." });

        if (item.IsSystemCore)
            return BadRequest(new { message = $"Parameter inti sistem '{item.SettingKey}' tidak dapat dihapus (hanya dapat diubah nilainya)." });

        _context.AppSettingItems.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Parameter '{item.SettingKey}' berhasil dihapus." });
    }

    [HttpPost("i18n")]
    public async Task<IActionResult> CreateI18nEntry([FromBody] UpsertI18nEntryRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.TranslationKey) || string.IsNullOrWhiteSpace(request.TextId) || string.IsNullOrWhiteSpace(request.TextEn))
            return BadRequest(new { message = "Translation Key, Teks Bahasa Indonesia (ID), dan Teks Bahasa Inggris (EN) wajib diisi." });

        var normKey = request.TranslationKey.Trim();
        if (await _context.AppI18nEntries.AnyAsync(x => x.TranslationKey.ToLower() == normKey.ToLower(), cancellationToken))
            return BadRequest(new { message = $"Translation Key '{normKey}' sudah terdaftar." });

        var entry = new AppI18nEntry
        {
            TranslationKey = normKey,
            ModuleGroup = string.IsNullOrWhiteSpace(request.ModuleGroup) ? "GENERAL_UI" : request.ModuleGroup.Trim().ToUpperInvariant(),
            TextId = request.TextId.Trim(),
            TextEn = request.TextEn.Trim(),
            Description = request.Description?.Trim(),
            IsSystemCore = false
        };

        _context.AppI18nEntries.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { entry.Id, entry.TranslationKey, message = $"Kamus i18n '{entry.TranslationKey}' berhasil ditambahkan." });
    }

    [HttpPut("i18n/{id:guid}")]
    public async Task<IActionResult> UpdateI18nEntry(Guid id, [FromBody] UpsertI18nEntryRequest request, CancellationToken cancellationToken)
    {
        var entry = await _context.AppI18nEntries.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entry == null)
            return NotFound(new { message = "Entri kamus i18n tidak ditemukan." });

        if (!entry.IsSystemCore && !string.IsNullOrWhiteSpace(request.TranslationKey))
        {
            var normKey = request.TranslationKey.Trim();
            if (await _context.AppI18nEntries.AnyAsync(x => x.Id != id && x.TranslationKey.ToLower() == normKey.ToLower(), cancellationToken))
                return BadRequest(new { message = $"Translation Key '{normKey}' sudah digunakan." });
            entry.TranslationKey = normKey;
            entry.ModuleGroup = string.IsNullOrWhiteSpace(request.ModuleGroup) ? entry.ModuleGroup : request.ModuleGroup.Trim().ToUpperInvariant();
        }

        if (!string.IsNullOrWhiteSpace(request.TextId))
            entry.TextId = request.TextId.Trim();
        if (!string.IsNullOrWhiteSpace(request.TextEn))
            entry.TextEn = request.TextEn.Trim();
        entry.Description = request.Description?.Trim();

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { entry.Id, entry.TranslationKey, message = $"Terjemahan '{entry.TranslationKey}' (ID & EN) berhasil diperbarui." });
    }

    [HttpDelete("i18n/{id:guid}")]
    public async Task<IActionResult> DeleteI18nEntry(Guid id, CancellationToken cancellationToken)
    {
        var entry = await _context.AppI18nEntries.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entry == null)
            return NotFound(new { message = "Entri kamus i18n tidak ditemukan." });

        if (entry.IsSystemCore)
            return BadRequest(new { message = $"Key sistem '{entry.TranslationKey}' tidak dapat dihapus (namun teks ID & EN dapat diedit)." });

        _context.AppI18nEntries.Remove(entry);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Entri kamus '{entry.TranslationKey}' berhasil dihapus." });
    }
}

