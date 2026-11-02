using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CoreEnterprise.Application.Workflows;

public record SimulatedWorkflowStepDto(
    int Sequence,
    string TargetJobLevelCode,
    string TargetJobLevelName,
    int TargetJobRank,
    decimal PlafondLimitAtStep,
    Guid ResolvedOrgUnitId,
    string ResolvedOrgUnitCode,
    string ResolvedOrgUnitName,
    Guid? AssignedUserId,
    string? AssignedUsername,
    string? AssignedUserFullName,
    bool IsDelegated,
    string? DelegatedFromFullName,
    string StepRoleType,
    string StepStatus,
    int SlaHours,
    string ResolutionTrace
);

public record WorkflowSimulationResultDto(
    bool IsValidForSubmit,
    string? ValidationErrorMessage,
    Guid AppliedDoAPolicyHeaderId,
    string AppliedPolicyNumber,
    string AppliedPolicyTitle,
    string DocTypeCode,
    string SubCategoryCode,
    decimal TransactionAmount,
    string RequesterFullName,
    string RequesterJobLevelCode,
    int RequesterJobRank,
    string RequesterOrgUnitCode,
    List<SimulatedWorkflowStepDto> Steps
);

public interface IApproverResolutionService
{
    Task<WorkflowSimulationResultDto> ResolveWorkflowRouteAsync(
        Guid requesterUserId,
        string docTypeCode,
        string subCategoryCode,
        decimal transactionAmount,
        Guid? lockedDoAPolicyHeaderId = null,
        CancellationToken cancellationToken = default);
}

public class ApproverResolutionService : IApproverResolutionService
{
    private readonly IApplicationDbContext _context;

    public ApproverResolutionService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<WorkflowSimulationResultDto> ResolveWorkflowRouteAsync(
        Guid requesterUserId,
        string docTypeCode,
        string subCategoryCode,
        decimal transactionAmount,
        Guid? lockedDoAPolicyHeaderId = null,
        CancellationToken cancellationToken = default)
    {
        var requester = await _context.Users
            .Include(u => u.JobLevel)
            .Include(u => u.PrimaryOrgUnit)
            .FirstOrDefaultAsync(u => u.Id == requesterUserId, cancellationToken)
            ?? throw new InvalidOperationException("Requester user not found.");

        // 1. Load target DoA Policy Header (locked policy on Re-Submit, or current ACTIVE policy)
        var policyQuery = _context.DoAPolicyHeaders
            .Include(h => h.Details)
                .ThenInclude(d => d.JobLevel)
            .AsQueryable();

        var policy = lockedDoAPolicyHeaderId.HasValue
            ? await policyQuery.FirstOrDefaultAsync(h => h.Id == lockedDoAPolicyHeaderId.Value, cancellationToken)
            : await policyQuery.Where(h => h.Status == DoAPolicyStatus.ACTIVE)
                               .OrderByDescending(h => h.Version)
                               .FirstOrDefaultAsync(cancellationToken);

        if (policy == null)
        {
            return new WorkflowSimulationResultDto(
                false,
                "Gagal Submit: Tidak ditemukan Kebijakan SK DoA berstatus ACTIVE.",
                Guid.Empty, "-", "-", docTypeCode, subCategoryCode, transactionAmount,
                requester.FullName, requester.JobLevel.Code, requester.JobLevel.RankOrder, requester.PrimaryOrgUnit.Code,
                new List<SimulatedWorkflowStepDto>());
        }

        // 2. Axis 1: Filter DoA Policy Details for DocumentTypeCode & SubCategoryCode
        var matchingDetails = policy.Details
            .Where(d => d.DocumentTypeCode.Equals(docTypeCode, StringComparison.OrdinalIgnoreCase) &&
                        (d.SubCategoryCode.Equals(subCategoryCode, StringComparison.OrdinalIgnoreCase) ||
                         d.SubCategoryCode.Equals("ALL", StringComparison.OrdinalIgnoreCase)))
            .OrderBy(d => d.JobLevel.RankOrder)
            .ToList();

        if (matchingDetails.Count == 0)
        {
            return new WorkflowSimulationResultDto(
                false,
                $"Gagal Submit: Matriks DoA ({policy.PolicyNumber}) belum mengatur aturan plafond untuk dokumen {docTypeCode}.",
                policy.Id, policy.PolicyNumber, policy.Title, docTypeCode, subCategoryCode, transactionAmount,
                requester.FullName, requester.JobLevel.Code, requester.JobLevel.RankOrder, requester.PrimaryOrgUnit.Code,
                new List<SimulatedWorkflowStepDto>());
        }

        // Load all OrgUnits, Assignments, and Active Delegations into memory for fast tree traversal
        var orgUnits = await _context.OrganizationUnits
            .Where(o => o.IsActive)
            .ToDictionaryAsync(o => o.Id, cancellationToken);

        var nowUtc = DateTime.UtcNow;
        var assignments = await _context.ApprovalAuthorityAssignments
            .Include(a => a.User)
            .Include(a => a.OrgUnit)
            .Where(a => a.IsActive && a.EffectiveFrom <= nowUtc && (a.EffectiveTo == null || a.EffectiveTo >= nowUtc))
            .OrderBy(a => a.PriorityOrder)
            .ToListAsync(cancellationToken);

        var delegations = await _context.ApprovalDelegations
            .Include(d => d.DelegateeUser)
            .Include(d => d.DelegatorUser)
            .Where(d => d.IsActive && d.StartDate <= nowUtc && d.EndDate >= nowUtc)
            .ToListAsync(cancellationToken);

        var steps = new List<SimulatedWorkflowStepDto>();
        int sequence = 1;
        bool finalApproverReached = false;
        string? validationError = null;

        foreach (var detail in matchingDetails)
        {
            if (finalApproverReached)
                break;

            var targetJobLevel = detail.JobLevel;
            bool isPlafondSufficient = transactionAmount <= detail.MaxAmount;

            // Rule 3.2.C.1: Auto-Skip by Initiator Rank
            if (targetJobLevel.RankOrder < requester.JobLevel.RankOrder)
            {
                steps.Add(new SimulatedWorkflowStepDto(
                    sequence++,
                    targetJobLevel.Code,
                    targetJobLevel.Name,
                    targetJobLevel.RankOrder,
                    detail.MaxAmount,
                    requester.PrimaryOrgUnitId,
                    requester.PrimaryOrgUnit.Code,
                    requester.PrimaryOrgUnit.Name,
                    requester.Id,
                    requester.Username,
                    requester.FullName,
                    false,
                    null,
                    WorkflowStepRoleType.REVIEW_ESCALATE.ToString(),
                    WorkflowStepStatus.SKIPPED.ToString(),
                    detail.SlaHours,
                    $"Auto-Skipped: Target Job Rank ({targetJobLevel.RankOrder}) < Requester Rank ({requester.JobLevel.RankOrder})"
                ));
                continue;
            }

            // Axis 2 & Axis 3: Tree Traversal from Requester's PrimaryOrgUnitId up to HO
            Domain.Entities.ApprovalAuthorityAssignment? matchedAssignment = null;
            string resolutionReason = string.Empty;

            // Pass 1 (Axis 3 Specialist Priority): Look for Exact Domain Specialist (DocTypeCode + specific SubCategoryCode) along the Org Tree
            if (!subCategoryCode.Equals("ALL", StringComparison.OrdinalIgnoreCase))
            {
                var visitedSpecialistOrgIds = new HashSet<Guid>();
                Guid? specCursorOrgId = requester.PrimaryOrgUnitId;
                while (specCursorOrgId.HasValue && orgUnits.TryGetValue(specCursorOrgId.Value, out var currentOrg))
                {
                    if (!visitedSpecialistOrgIds.Add(currentOrg.Id))
                        break;

                    matchedAssignment = assignments.FirstOrDefault(a =>
                        a.OrgUnitId == currentOrg.Id &&
                        a.JobLevelCode.Equals(targetJobLevel.Code, StringComparison.OrdinalIgnoreCase) &&
                        a.DocTypeCode.Equals(docTypeCode, StringComparison.OrdinalIgnoreCase) &&
                        a.SubCategoryCode.Equals(subCategoryCode, StringComparison.OrdinalIgnoreCase));

                    if (matchedAssignment != null)
                    {
                        resolutionReason = $"Exact Specialist Match ({docTypeCode}/{subCategoryCode}) on unit {currentOrg.Code}";
                        break;
                    }

                    specCursorOrgId = currentOrg.ParentUnitId;
                }
            }

            // Pass 2 (Axis 2 Hierarchy Fallback): Look for General Match (SubCategoryCode = ALL) from Requester's OrgUnit up to HO
            if (matchedAssignment == null)
            {
                var visitedOrgIds = new HashSet<Guid>();
                Guid? cursorOrgId = requester.PrimaryOrgUnitId;

                while (cursorOrgId.HasValue && orgUnits.TryGetValue(cursorOrgId.Value, out var currentOrg))
                {
                    if (!visitedOrgIds.Add(currentOrg.Id))
                        break; // Cycle protection

                    matchedAssignment = assignments.FirstOrDefault(a =>
                        a.OrgUnitId == currentOrg.Id &&
                        a.JobLevelCode.Equals(targetJobLevel.Code, StringComparison.OrdinalIgnoreCase) &&
                        (a.DocTypeCode.Equals(docTypeCode, StringComparison.OrdinalIgnoreCase) || a.DocTypeCode.Equals("ALL", StringComparison.OrdinalIgnoreCase)) &&
                        (a.SubCategoryCode.Equals(subCategoryCode, StringComparison.OrdinalIgnoreCase) || a.SubCategoryCode.Equals("ALL", StringComparison.OrdinalIgnoreCase)));

                    if (matchedAssignment != null)
                    {
                        resolutionReason = $"General Hierarchy Match ({matchedAssignment.DocTypeCode}/{matchedAssignment.SubCategoryCode}) on unit {currentOrg.Code}";
                        break;
                    }

                    cursorOrgId = currentOrg.ParentUnitId;
                }
            }

            // Rule 3.2.C.1: Segregation of Duties (SoD) / Self-Approval Prevention
            if (matchedAssignment != null && matchedAssignment.UserId == requester.Id)
            {
                steps.Add(new SimulatedWorkflowStepDto(
                    sequence++,
                    targetJobLevel.Code,
                    targetJobLevel.Name,
                    targetJobLevel.RankOrder,
                    detail.MaxAmount,
                    matchedAssignment.OrgUnitId,
                    matchedAssignment.OrgUnit.Code,
                    matchedAssignment.OrgUnit.Name,
                    requester.Id,
                    requester.Username,
                    requester.FullName,
                    false,
                    null,
                    WorkflowStepRoleType.REVIEW_ESCALATE.ToString(),
                    WorkflowStepStatus.SKIPPED.ToString(),
                    detail.SlaHours,
                    $"Auto-Skipped (SoD / 4-Eyes Principle): Initiator cannot self-approve at {targetJobLevel.Code}"
                ));
                continue;
            }

            // Rule 3.2.C.6: Pre-Submit Dry-Run Validation (Dead-End Prevention)
            if (matchedAssignment == null)
            {
                validationError = $"Gagal Submit: Pejabat untuk level {targetJobLevel.Name} ({targetJobLevel.Code}) pada jalur organisasi {requester.PrimaryOrgUnit.Code} untuk dokumen {docTypeCode} (Sub-Kategori: {subCategoryCode}) belum ditetapkan di Matriks Penugasan Approver.";
                steps.Add(new SimulatedWorkflowStepDto(
                    sequence++,
                    targetJobLevel.Code,
                    targetJobLevel.Name,
                    targetJobLevel.RankOrder,
                    detail.MaxAmount,
                    requester.PrimaryOrgUnitId,
                    requester.PrimaryOrgUnit.Code,
                    requester.PrimaryOrgUnit.Name,
                    null,
                    null,
                    "UNASSIGNED (DEAD-END)",
                    false,
                    null,
                    isPlafondSufficient ? WorkflowStepRoleType.FINAL_APPROVAL.ToString() : WorkflowStepRoleType.REVIEW_ESCALATE.ToString(),
                    "MISSING_APPROVER",
                    detail.SlaHours,
                    validationError
                ));
                break;
            }

            // Rule 3.2.C.5: Check Active ApprovalDelegations
            var resolvedUser = matchedAssignment.User;
            bool isDelegated = false;
            string? delegatedFrom = null;

            var activeDelegation = delegations.FirstOrDefault(d =>
                d.DelegatorUserId == resolvedUser.Id &&
                (d.DocTypeCode.Equals("ALL", StringComparison.OrdinalIgnoreCase) ||
                 d.DocTypeCode.Equals(docTypeCode, StringComparison.OrdinalIgnoreCase)));

            if (activeDelegation != null)
            {
                isDelegated = true;
                delegatedFrom = resolvedUser.FullName;
                resolvedUser = activeDelegation.DelegateeUser;
                resolutionReason += $" -> Delegated On Behalf Of {delegatedFrom} to {resolvedUser.FullName}";
            }

            var roleType = isPlafondSufficient
                ? WorkflowStepRoleType.FINAL_APPROVAL
                : WorkflowStepRoleType.REVIEW_ESCALATE;

            var activePendingExists = steps.Any(s => s.StepStatus == WorkflowStepStatus.PENDING.ToString());
            var stepStatus = activePendingExists
                ? WorkflowStepStatus.WAITING
                : WorkflowStepStatus.PENDING;

            steps.Add(new SimulatedWorkflowStepDto(
                sequence++,
                targetJobLevel.Code,
                targetJobLevel.Name,
                targetJobLevel.RankOrder,
                detail.MaxAmount,
                matchedAssignment.OrgUnitId,
                matchedAssignment.OrgUnit.Code,
                matchedAssignment.OrgUnit.Name,
                resolvedUser.Id,
                resolvedUser.Username,
                resolvedUser.FullName,
                isDelegated,
                delegatedFrom,
                roleType.ToString(),
                stepStatus.ToString(),
                detail.SlaHours,
                resolutionReason
            ));

            if (isPlafondSufficient && detail.StepBehavior == DoAStepBehavior.FINAL_IF_SUFFICIENT)
            {
                finalApproverReached = true;
            }
        }

        if (validationError == null && !finalApproverReached)
        {
            validationError = $"Gagal Submit: Nilai transaksi ({transactionAmount:N0}) melampaui plafond tertinggi pada SK DoA {policy.PolicyNumber} atau tidak ada Final Approver yang mencukupi.";
        }

        return new WorkflowSimulationResultDto(
            validationError == null && finalApproverReached,
            validationError,
            policy.Id,
            policy.PolicyNumber,
            policy.Title,
            docTypeCode,
            subCategoryCode,
            transactionAmount,
            requester.FullName,
            requester.JobLevel.Code,
            requester.JobLevel.RankOrder,
            requester.PrimaryOrgUnit.Code,
            steps
        );
    }
}

