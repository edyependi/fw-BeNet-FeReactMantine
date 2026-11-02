using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Domain.Entities;
using CoreEnterprise.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoreEnterprise.WebApi.Controllers;

public record CreateDoAPolicyDetailDto(
    string DocumentTypeCode,
    string SubCategoryCode,
    string JobLevelCode,
    decimal MinAmount,
    decimal MaxAmount,
    int SlaHours
);

public record CreateDoAPolicyRequest(
    string PolicyNumber,
    string Title,
    DateTime EffectiveFrom,
    int Version,
    Guid? OfficialAttachmentFileId,
    string? Remarks,
    bool ActivateImmediately,
    List<CreateDoAPolicyDetailDto> Details
);

public record CreateApproverAssignmentRequest(
    Guid UserId,
    string JobLevelCode,
    Guid OrgUnitId,
    string DocTypeCode,
    string SubCategoryCode,
    int PriorityOrder
);

public record CreateDelegationRequest(
    Guid DelegatorUserId,
    Guid DelegateeUserId,
    string DocTypeCode,
    DateTime StartDate,
    DateTime EndDate,
    string Reason
);

[ApiController]
[Route("api/[controller]")]
public class DoAPoliciesController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public DoAPoliciesController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllPolicies(CancellationToken cancellationToken)
    {
        var policies = await _context.DoAPolicyHeaders
            .Include(h => h.OfficialAttachmentFile)
            .Include(h => h.Details)
                .ThenInclude(d => d.JobLevel)
            .OrderByDescending(h => h.Version)
            .ThenByDescending(h => h.CreatedAt)
            .Select(h => new
            {
                h.Id,
                h.PolicyNumber,
                h.Title,
                h.EffectiveFrom,
                h.EffectiveTo,
                h.Version,
                Status = h.Status.ToString(),
                h.OfficialAttachmentFileId,
                OfficialAttachmentFileName = h.OfficialAttachmentFile != null ? h.OfficialAttachmentFile.OriginalFileName : null,
                h.Remarks,
                h.CreatedAt,
                Details = h.Details
                    .OrderBy(d => d.DocumentTypeCode)
                    .ThenBy(d => d.JobLevel.RankOrder)
                    .Select(d => new
                    {
                        d.Id,
                        d.DocumentTypeCode,
                        d.SubCategoryCode,
                        JobLevelCode = d.JobLevel.Code,
                        JobLevelName = d.JobLevel.Name,
                        JobRank = d.JobLevel.RankOrder,
                        d.MinAmount,
                        d.MaxAmount,
                        d.Currency,
                        StepBehavior = d.StepBehavior.ToString(),
                        d.SlaHours
                    })
            })
            .ToListAsync(cancellationToken);

        return Ok(policies);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePolicy([FromBody] CreateDoAPolicyRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PolicyNumber) || string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Nomor SK dan Judul Kebijakan wajib diisi." });
        }

        var normalizedNumber = request.PolicyNumber.Trim();
        var duplicateExists = await _context.DoAPolicyHeaders
            .AnyAsync(h => h.PolicyNumber.ToLower() == normalizedNumber.ToLower(), cancellationToken);

        if (duplicateExists)
        {
            return BadRequest(new
            {
                message = $"Nomor SK '{normalizedNumber}' sudah terdaftar. Silakan gunakan Nomor SK yang berbeda."
            });
        }

        if (request.ActivateImmediately && !request.OfficialAttachmentFileId.HasValue)
        {
            return BadRequest(new
            {
                message = "Kepatuhan DMS (Section 3.2.A): Kebijakan SK DoA wajib memiliki lampiran file PDF SK Direksi resmi di DMS sebelum dapat diaktifkan (ACTIVE)."
            });
        }

        var jobLevels = await _context.JobLevels.ToDictionaryAsync(j => j.Code.ToUpperInvariant(), cancellationToken);

        var header = new DoAPolicyHeader
        {
            PolicyNumber = normalizedNumber,
            Title = request.Title.Trim(),
            EffectiveFrom = DateTime.SpecifyKind(request.EffectiveFrom, DateTimeKind.Utc),
            Version = request.Version > 0 ? request.Version : 1,
            Status = request.ActivateImmediately ? DoAPolicyStatus.ACTIVE : DoAPolicyStatus.DRAFT,
            OfficialAttachmentFileId = request.OfficialAttachmentFileId,
            Remarks = request.Remarks,
            ApprovedAt = request.ActivateImmediately ? DateTime.UtcNow : null
        };

        if (request.ActivateImmediately)
        {
            var currentlyActive = await _context.DoAPolicyHeaders
                .Where(h => h.Status == DoAPolicyStatus.ACTIVE)
                .ToListAsync(cancellationToken);

            foreach (var old in currentlyActive)
            {
                old.Status = DoAPolicyStatus.SUPERSEDED;
                old.EffectiveTo = DateTime.UtcNow;
            }
        }

        _context.DoAPolicyHeaders.Add(header);

        foreach (var d in request.Details ?? new List<CreateDoAPolicyDetailDto>())
        {
            if (!jobLevels.TryGetValue((d.JobLevelCode ?? "MGR").ToUpperInvariant(), out var jl))
                continue;

            var detailEntity = new DoAPolicyDetail
            {
                DoAPolicyHeaderId = header.Id,
                DocumentTypeCode = (d.DocumentTypeCode ?? "PO").ToUpperInvariant(),
                SubCategoryCode = string.IsNullOrWhiteSpace(d.SubCategoryCode) ? "ALL" : d.SubCategoryCode.ToUpperInvariant(),
                OrgUnitTypeScope = "ALL",
                JobLevelId = jl.Id,
                MinAmount = d.MinAmount,
                MaxAmount = d.MaxAmount,
                Currency = "IDR",
                StepBehavior = DoAStepBehavior.FINAL_IF_SUFFICIENT,
                SlaHours = d.SlaHours > 0 ? d.SlaHours : 24
            };
            _context.DoAPolicyDetails.Add(detailEntity);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            header.Id,
            header.PolicyNumber,
            Status = header.Status.ToString(),
            message = $"Kebijakan SK DoA {header.PolicyNumber} berhasil ditambahkan."
        });
    }

    [HttpPost("{id:guid}/activate")]
    public async Task<IActionResult> ActivatePolicy(Guid id, [FromQuery] Guid? attachmentFileId, CancellationToken cancellationToken)
    {
        var policy = await _context.DoAPolicyHeaders.FirstOrDefaultAsync(h => h.Id == id, cancellationToken);
        if (policy == null)
            return NotFound(new { message = "Kebijakan SK DoA tidak ditemukan." });

        if (attachmentFileId.HasValue)
        {
            policy.OfficialAttachmentFileId = attachmentFileId.Value;
        }

        if (!policy.OfficialAttachmentFileId.HasValue)
        {
            return BadRequest(new
            {
                message = "Wajib melampirkan dokumen PDF SK Direksi resmi di DMS sebelum mengubah status kebijakan menjadi ACTIVE."
            });
        }

        var others = await _context.DoAPolicyHeaders
            .Where(h => h.Status == DoAPolicyStatus.ACTIVE && h.Id != id)
            .ToListAsync(cancellationToken);

        foreach (var old in others)
        {
            old.Status = DoAPolicyStatus.SUPERSEDED;
            old.EffectiveTo = DateTime.UtcNow;
        }

        policy.Status = DoAPolicyStatus.ACTIVE;
        policy.ApprovedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = $"Kebijakan {policy.PolicyNumber} berhasil diaktifkan dan kebijakan lama diubah menjadi SUPERSEDED." });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePolicy(Guid id, [FromBody] CreateDoAPolicyRequest request, CancellationToken cancellationToken)
    {
        var header = await _context.DoAPolicyHeaders
            .Include(h => h.Details)
            .FirstOrDefaultAsync(h => h.Id == id, cancellationToken);

        if (header == null)
            return NotFound(new { message = "Kebijakan SK DoA tidak ditemukan." });

        var normalizedNumber = request.PolicyNumber.Trim();
        var duplicateExists = await _context.DoAPolicyHeaders
            .AnyAsync(h => h.Id != id && h.PolicyNumber.ToLower() == normalizedNumber.ToLower(), cancellationToken);

        if (duplicateExists)
        {
            return BadRequest(new
            {
                message = $"Nomor SK '{normalizedNumber}' sudah digunakan oleh kebijakan lain."
            });
        }

        var effectiveAttachmentId = request.OfficialAttachmentFileId ?? header.OfficialAttachmentFileId;
        if (request.ActivateImmediately && !effectiveAttachmentId.HasValue)
        {
            return BadRequest(new
            {
                message = "Kepatuhan DMS (Section 3.2.A): Kebijakan SK DoA wajib memiliki lampiran file PDF SK Direksi resmi di DMS sebelum dapat diaktifkan (ACTIVE)."
            });
        }

        var jobLevels = await _context.JobLevels.ToDictionaryAsync(j => j.Code.ToUpperInvariant(), cancellationToken);

        header.PolicyNumber = normalizedNumber;
        header.Title = request.Title.Trim();
        header.EffectiveFrom = DateTime.SpecifyKind(request.EffectiveFrom, DateTimeKind.Utc);
        header.Version = request.Version > 0 ? request.Version : header.Version;
        header.OfficialAttachmentFileId = effectiveAttachmentId;
        header.Remarks = request.Remarks;

        if (request.ActivateImmediately)
        {
            var currentlyActive = await _context.DoAPolicyHeaders
                .Where(h => h.Status == DoAPolicyStatus.ACTIVE && h.Id != id)
                .ToListAsync(cancellationToken);

            foreach (var old in currentlyActive)
            {
                old.Status = DoAPolicyStatus.SUPERSEDED;
                old.EffectiveTo = DateTime.UtcNow;
            }

            header.Status = DoAPolicyStatus.ACTIVE;
            header.ApprovedAt ??= DateTime.UtcNow;
        }

        _context.DoAPolicyDetails.RemoveRange(header.Details);

        foreach (var d in request.Details ?? new List<CreateDoAPolicyDetailDto>())
        {
            if (!jobLevels.TryGetValue((d.JobLevelCode ?? "MGR").ToUpperInvariant(), out var jl))
                continue;

            var detailEntity = new DoAPolicyDetail
            {
                DoAPolicyHeaderId = header.Id,
                DocumentTypeCode = (d.DocumentTypeCode ?? "PO").ToUpperInvariant(),
                SubCategoryCode = string.IsNullOrWhiteSpace(d.SubCategoryCode) ? "ALL" : d.SubCategoryCode.ToUpperInvariant(),
                OrgUnitTypeScope = "ALL",
                JobLevelId = jl.Id,
                MinAmount = d.MinAmount,
                MaxAmount = d.MaxAmount,
                Currency = "IDR",
                StepBehavior = DoAStepBehavior.FINAL_IF_SUFFICIENT,
                SlaHours = d.SlaHours > 0 ? d.SlaHours : 24
            };
            _context.DoAPolicyDetails.Add(detailEntity);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { header.Id, header.PolicyNumber, Status = header.Status.ToString(), message = $"Kebijakan {header.PolicyNumber} berhasil diperbarui." });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePolicy(Guid id, CancellationToken cancellationToken)
    {
        var header = await _context.DoAPolicyHeaders
            .Include(h => h.Details)
            .FirstOrDefaultAsync(h => h.Id == id, cancellationToken);

        if (header == null)
            return NotFound(new { message = "Kebijakan SK DoA tidak ditemukan." });

        var isReferenced = await _context.WorkflowInstances.AnyAsync(w => w.AppliedDoAPolicyHeaderId == id, cancellationToken);
        if (isReferenced)
        {
            return BadRequest(new
            {
                message = $"Tidak dapat menghapus SK {header.PolicyNumber} karena sedang dikunci sebagai acuan audit pada transaksi berjalan/historis. Gunakan fitur revisi SK baru untuk menggantikannya (SUPERSEDED)."
            });
        }

        _context.DoAPolicyDetails.RemoveRange(header.Details);
        _context.DoAPolicyHeaders.Remove(header);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Kebijakan SK DoA {header.PolicyNumber} berhasil dihapus." });
    }
}

[ApiController]
[Route("api/[controller]")]
public class MasterDataController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public MasterDataController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("organization-units")]
    public async Task<IActionResult> GetOrganizationUnits(CancellationToken cancellationToken)
    {
        var units = await _context.OrganizationUnits
            .Include(o => o.ParentUnit)
            .OrderBy(o => o.UnitType)
            .ThenBy(o => o.Code)
            .Select(o => new
            {
                o.Id,
                o.Code,
                o.Name,
                UnitType = o.UnitType.ToString(),
                o.ParentUnitId,
                ParentUnitCode = o.ParentUnit != null ? o.ParentUnit.Code : null,
                o.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(units);
    }

    [HttpGet("approver-assignments")]
    public async Task<IActionResult> GetApproverAssignments(CancellationToken cancellationToken)
    {
        var items = await _context.ApprovalAuthorityAssignments
            .Include(a => a.User)
            .Include(a => a.OrgUnit)
            .OrderBy(a => a.OrgUnit.Code)
            .ThenBy(a => a.JobLevelCode)
            .ThenBy(a => a.PriorityOrder)
            .Select(a => new
            {
                a.Id,
                a.UserId,
                a.User.Username,
                a.User.FullName,
                a.JobLevelCode,
                a.OrgUnitId,
                OrgUnitCode = a.OrgUnit.Code,
                OrgUnitName = a.OrgUnit.Name,
                a.DocTypeCode,
                a.SubCategoryCode,
                a.PriorityOrder,
                a.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost("approver-assignments")]
    public async Task<IActionResult> CreateApproverAssignment([FromBody] CreateApproverAssignmentRequest request, CancellationToken cancellationToken)
    {
        var assignment = new ApprovalAuthorityAssignment
        {
            UserId = request.UserId,
            JobLevelCode = request.JobLevelCode.ToUpperInvariant(),
            OrgUnitId = request.OrgUnitId,
            DocTypeCode = string.IsNullOrWhiteSpace(request.DocTypeCode) ? "ALL" : request.DocTypeCode.ToUpperInvariant(),
            SubCategoryCode = string.IsNullOrWhiteSpace(request.SubCategoryCode) ? "ALL" : request.SubCategoryCode.ToUpperInvariant(),
            PriorityOrder = request.PriorityOrder > 0 ? request.PriorityOrder : 1,
            EffectiveFrom = DateTime.UtcNow,
            IsActive = true
        };

        _context.ApprovalAuthorityAssignments.Add(assignment);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(assignment);
    }

    [HttpDelete("approver-assignments/{id:guid}")]
    public async Task<IActionResult> DeleteApproverAssignment(Guid id, CancellationToken cancellationToken)
    {
        var item = await _context.ApprovalAuthorityAssignments.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (item == null) return NotFound();

        _context.ApprovalAuthorityAssignments.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Penugasan Approver berhasil dihapus." });
    }

    [HttpGet("delegations")]
    public async Task<IActionResult> GetDelegations(CancellationToken cancellationToken)
    {
        var list = await _context.ApprovalDelegations
            .Include(d => d.DelegatorUser)
            .Include(d => d.DelegateeUser)
            .OrderByDescending(d => d.StartDate)
            .Select(d => new
            {
                d.Id,
                d.DelegatorUserId,
                DelegatorName = d.DelegatorUser.FullName,
                d.DelegateeUserId,
                DelegateeName = d.DelegateeUser.FullName,
                d.DocTypeCode,
                d.StartDate,
                d.EndDate,
                d.Reason,
                d.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    [HttpPost("delegations")]
    public async Task<IActionResult> CreateDelegation([FromBody] CreateDelegationRequest request, CancellationToken cancellationToken)
    {
        var delegation = new ApprovalDelegation
        {
            DelegatorUserId = request.DelegatorUserId,
            DelegateeUserId = request.DelegateeUserId,
            DocTypeCode = string.IsNullOrWhiteSpace(request.DocTypeCode) ? "ALL" : request.DocTypeCode.ToUpperInvariant(),
            StartDate = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc),
            Reason = request.Reason,
            IsActive = true
        };

        _context.ApprovalDelegations.Add(delegation);
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(delegation);
    }
}

