using System.Security.Claims;
using CoreEnterprise.Application.Common.Interfaces;

namespace CoreEnterprise.WebApi.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            var sub = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirstValue("sub");
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? UserName => User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue("name");
    public string? JobLevelCode => User?.FindFirstValue("job_level");

    public int? JobRank
    {
        get
        {
            var rank = User?.FindFirstValue("job_rank");
            return int.TryParse(rank, out var r) ? r : null;
        }
    }

    public Guid? PrimaryOrgUnitId
    {
        get
        {
            var orgId = User?.FindFirstValue("org_unit_id");
            return Guid.TryParse(orgId, out var id) ? id : null;
        }
    }

    public string? IpAddress => _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
    public string? UserAgent => _httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();

    public string AcceptLanguage
    {
        get
        {
            var lang = _httpContextAccessor.HttpContext?.Request.Headers.AcceptLanguage.ToString();
            if (!string.IsNullOrWhiteSpace(lang) && lang.StartsWith("en", StringComparison.OrdinalIgnoreCase))
                return "en";
            return "id";
        }
    }

    public IReadOnlyList<string> Roles =>
        User?.FindAll(ClaimTypes.Role).Select(c => c.Value)
            .Concat(User?.FindAll("roles").Select(c => c.Value) ?? Enumerable.Empty<string>())
            .Distinct()
            .ToList() ?? new List<string>();

    public IReadOnlyList<string> Permissions =>
        User?.FindAll("permissions").Select(c => c.Value).Distinct().ToList() ?? new List<string>();
}

