using CoreEnterprise.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoreEnterprise.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemHealthController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public SystemHealthController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetFoundationSummary(CancellationToken cancellationToken)
    {
        var orgCount = await _context.OrganizationUnits.CountAsync(cancellationToken);
        var jobLevels = await _context.JobLevels
            .OrderBy(j => j.RankOrder)
            .Select(j => new { j.Code, j.Name, j.RankOrder })
            .ToListAsync(cancellationToken);

        var roles = await _context.Roles
            .Select(r => new { r.Code, r.Name })
            .ToListAsync(cancellationToken);

        var activePolicies = await _context.DoAPolicyHeaders
            .Include(h => h.Details)
                .ThenInclude(d => d.JobLevel)
            .Where(h => h.Status == Domain.Enums.DoAPolicyStatus.ACTIVE)
            .Select(h => new
            {
                h.Id,
                h.PolicyNumber,
                h.Title,
                h.Version,
                Status = h.Status.ToString(),
                h.EffectiveFrom,
                HasOfficialSkPdf = h.OfficialAttachmentFileId != null,
                Details = h.Details.OrderBy(d => d.DocumentTypeCode).ThenBy(d => d.MinAmount).Select(d => new
                {
                    d.DocumentTypeCode,
                    d.SubCategoryCode,
                    JobLevelCode = d.JobLevel.Code,
                    JobLevelName = d.JobLevel.Name,
                    d.MinAmount,
                    d.MaxAmount,
                    d.Currency,
                    StepBehavior = d.StepBehavior.ToString(),
                    d.SlaHours
                })
            })
            .ToListAsync(cancellationToken);

        var assignments = await _context.ApprovalAuthorityAssignments
            .Include(a => a.User)
            .Include(a => a.OrgUnit)
            .OrderBy(a => a.OrgUnit.Code)
            .ThenBy(a => a.JobLevelCode)
            .Select(a => new
            {
                a.Id,
                a.User.Username,
                a.User.FullName,
                a.JobLevelCode,
                OrgUnitCode = a.OrgUnit.Code,
                OrgUnitName = a.OrgUnit.Name,
                a.DocTypeCode,
                a.SubCategoryCode
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            Status = "Healthy",
            DatabaseEngine = "PostgreSQL (Npgsql)",
            TimestampUtc = DateTime.UtcNow,
            OrganizationUnitsCount = orgCount,
            JobLevels = jobLevels,
            SystemRoles = roles,
            ActiveDoAPolicies = activePolicies,
            ApproverAssignments = assignments
        });
    }
}

