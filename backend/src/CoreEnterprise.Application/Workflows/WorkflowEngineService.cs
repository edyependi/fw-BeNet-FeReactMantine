using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Domain.Entities;
using CoreEnterprise.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CoreEnterprise.Application.Workflows;

public interface IWorkflowNotificationPublisher
{
    Task PublishToUserAsync(Guid recipientUserId, string title, string message, string? actionUrl = null, CancellationToken cancellationToken = default);
}

public interface IWorkflowEngineService
{
    Task<(bool Success, string Message, WorkflowInstance? Instance)> SubmitOrResubmitAsync(
        Guid referenceTransactionId,
        string referenceNumber,
        string docTypeCode,
        string subCategoryCode,
        decimal transactionAmount,
        Guid requesterUserId,
        Guid? existingWorkflowInstanceId = null,
        CancellationToken cancellationToken = default);

    Task<(bool Success, string Message)> ExecuteActionAsync(
        Guid workflowInstanceId,
        Guid actorUserId,
        string action, // APPROVE, REJECT, REVISE, CANCEL
        string? comments,
        CancellationToken cancellationToken = default);
}

public class WorkflowEngineService : IWorkflowEngineService
{
    private readonly IApplicationDbContext _context;
    private readonly IApproverResolutionService _resolutionService;
    private readonly IWorkflowNotificationPublisher _notificationPublisher;

    public WorkflowEngineService(
        IApplicationDbContext context,
        IApproverResolutionService resolutionService,
        IWorkflowNotificationPublisher notificationPublisher)
    {
        _context = context;
        _resolutionService = resolutionService;
        _notificationPublisher = notificationPublisher;
    }

    public async Task<(bool Success, string Message, WorkflowInstance? Instance)> SubmitOrResubmitAsync(
        Guid referenceTransactionId,
        string referenceNumber,
        string docTypeCode,
        string subCategoryCode,
        decimal transactionAmount,
        Guid requesterUserId,
        Guid? existingWorkflowInstanceId = null,
        CancellationToken cancellationToken = default)
    {
        var requester = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == requesterUserId, cancellationToken)
            ?? throw new InvalidOperationException("Requester user not found.");

        WorkflowInstance? instance = null;
        Guid? lockedPolicyId = null;

        if (existingWorkflowInstanceId.HasValue)
        {
            instance = await _context.WorkflowInstances
                .Include(w => w.Steps)
                .FirstOrDefaultAsync(w => w.Id == existingWorkflowInstanceId.Value, cancellationToken);

            if (instance != null)
            {
                // Section 3.2.D: Re-Submit after REVISED locks to AppliedDoAPolicyHeaderId
                lockedPolicyId = instance.AppliedDoAPolicyHeaderId;
            }
        }

        // 1. Run Pre-Submit Dry-Run Resolution (Section 3.2.C.6)
        var dryRun = await _resolutionService.ResolveWorkflowRouteAsync(
            requesterUserId,
            docTypeCode,
            subCategoryCode,
            transactionAmount,
            lockedPolicyId,
            cancellationToken);

        if (!dryRun.IsValidForSubmit)
        {
            return (false, dryRun.ValidationErrorMessage ?? "Gagal validasi rute persetujuan.", null);
        }

        var nowUtc = DateTime.UtcNow;
        int targetCycle = 1;

        if (instance == null)
        {
            instance = new WorkflowInstance
            {
                ReferenceTransactionId = referenceTransactionId,
                ReferenceNumber = referenceNumber,
                DocTypeCode = docTypeCode,
                SubCategoryCode = subCategoryCode,
                TransactionAmount = transactionAmount,
                RequesterUserId = requesterUserId,
                RequesterOrgUnitId = requester.PrimaryOrgUnitId,
                AppliedDoAPolicyHeaderId = dryRun.AppliedDoAPolicyHeaderId,
                CurrentRevisionCycle = 1,
                Status = WorkflowInstanceStatus.IN_PROGRESS
            };
            _context.WorkflowInstances.Add(instance);
        }
        else
        {
            targetCycle = instance.CurrentRevisionCycle + 1;
            instance.CurrentRevisionCycle = targetCycle;
            instance.TransactionAmount = transactionAmount;
            instance.SubCategoryCode = subCategoryCode;
            instance.Status = WorkflowInstanceStatus.IN_PROGRESS;
        }

        WorkflowStep? firstPendingStep = null;

        foreach (var simStep in dryRun.Steps)
        {
            var stepStatus = Enum.Parse<WorkflowStepStatus>(simStep.StepStatus);
            var roleType = Enum.Parse<WorkflowStepRoleType>(simStep.StepRoleType);

            var wfStep = new WorkflowStep
            {
                WorkflowInstanceId = instance.Id,
                RevisionCycle = targetCycle,
                Sequence = simStep.Sequence,
                TargetJobLevelCode = simStep.TargetJobLevelCode,
                ResolvedOrgUnitId = simStep.ResolvedOrgUnitId,
                PlafondLimitAtStep = simStep.PlafondLimitAtStep,
                AssignedUserId = simStep.AssignedUserId!.Value,
                IsDelegatedAction = simStep.IsDelegated,
                StepRoleType = roleType,
                Status = stepStatus,
                Comments = stepStatus == WorkflowStepStatus.SKIPPED ? simStep.ResolutionTrace : null,
                ActionTakenAt = stepStatus == WorkflowStepStatus.SKIPPED ? nowUtc : null,
                DueDateSla = nowUtc.AddHours(simStep.SlaHours)
            };

            _context.WorkflowSteps.Add(wfStep);

            if (stepStatus == WorkflowStepStatus.PENDING && firstPendingStep == null)
            {
                firstPendingStep = wfStep;
            }
        }

        instance.CurrentStepSequence = firstPendingStep?.Sequence ?? 1;

        await _context.SaveChangesAsync(cancellationToken);

        if (firstPendingStep != null)
        {
            await _notificationPublisher.PublishToUserAsync(
                firstPendingStep.AssignedUserId,
                $"Permintaan Persetujuan Baru: {referenceNumber}",
                $"Dokumen {docTypeCode} ({subCategoryCode}) senilai Rp {transactionAmount:N0} menunggu persetujuan Anda pada Step #{firstPendingStep.Sequence} ({firstPendingStep.TargetJobLevelCode}).",
                "/inbox",
                cancellationToken);
        }

        return (true, $"Dokumen {referenceNumber} berhasil di-submit (Siklus #{targetCycle}).", instance);
    }

    public async Task<(bool Success, string Message)> ExecuteActionAsync(
        Guid workflowInstanceId,
        Guid actorUserId,
        string action,
        string? comments,
        CancellationToken cancellationToken = default)
    {
        var instance = await _context.WorkflowInstances
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == workflowInstanceId, cancellationToken);

        if (instance == null)
            return (false, "Data workflow tidak ditemukan.");

        if (instance.Status != WorkflowInstanceStatus.IN_PROGRESS)
            return (false, $"Dokumen tidak dalam status IN_PROGRESS (Status saat ini: {instance.Status}).");

        var normalizedAction = action.Trim().ToUpperInvariant();

        if (normalizedAction == "CANCEL")
        {
            if (instance.RequesterUserId != actorUserId)
                return (false, "Hanya pembuat dokumen (Requester) yang dapat membatalkan pengajuan.");

            instance.Status = WorkflowInstanceStatus.CANCELLED;
            await SyncTransactionStatusAsync(instance, WorkflowInstanceStatus.CANCELLED, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            return (true, $"Dokumen {instance.ReferenceNumber} telah dibatalkan.");
        }

        var currentStep = instance.Steps
            .Where(s => s.RevisionCycle == instance.CurrentRevisionCycle && s.Status == WorkflowStepStatus.PENDING)
            .OrderBy(s => s.Sequence)
            .FirstOrDefault();

        if (currentStep == null)
            return (false, "Tidak ditemukan tahapan PENDING yang aktif.");

        // Dynamic Multi-Position / Plt. & Delegation check (Section 3.1.C)
        var nowUtc = DateTime.UtcNow;
        bool isDirectAssignee = currentStep.AssignedUserId == actorUserId;
        bool isActiveDelegatee = false;

        if (!isDirectAssignee)
        {
            isActiveDelegatee = await _context.ApprovalDelegations.AnyAsync(d =>
                d.IsActive &&
                d.DelegatorUserId == currentStep.AssignedUserId &&
                d.DelegateeUserId == actorUserId &&
                d.StartDate <= nowUtc && d.EndDate >= nowUtc &&
                (d.DocTypeCode == "ALL" || d.DocTypeCode == instance.DocTypeCode),
                cancellationToken);
        }

        if (!isDirectAssignee && !isActiveDelegatee)
        {
            return (false, "Otorisasi Ditolak: Anda bukan pejabat Approver maupun penerima delegasi aktif pada tahapan ini.");
        }

        if ((normalizedAction == "REJECT" || normalizedAction == "REVISE") && string.IsNullOrWhiteSpace(comments))
        {
            return (false, "Alasan/komentar wajib diisi saat melakukan Reject atau Revise (Send Back).");
        }

        currentStep.ActualActionUserId = actorUserId;
        currentStep.IsDelegatedAction = currentStep.IsDelegatedAction || isActiveDelegatee;
        currentStep.ActionTakenAt = nowUtc;
        currentStep.Comments = comments;

        if (normalizedAction == "APPROVE")
        {
            currentStep.Status = WorkflowStepStatus.APPROVED;

            var nextStep = instance.Steps
                .Where(s => s.RevisionCycle == instance.CurrentRevisionCycle && s.Status == WorkflowStepStatus.WAITING && s.Sequence > currentStep.Sequence)
                .OrderBy(s => s.Sequence)
                .FirstOrDefault();

            if (nextStep != null)
            {
                nextStep.Status = WorkflowStepStatus.PENDING;
                nextStep.DueDateSla = nowUtc.AddHours(24);
                instance.CurrentStepSequence = nextStep.Sequence;

                await _notificationPublisher.PublishToUserAsync(
                    nextStep.AssignedUserId,
                    $"Eskalasi Persetujuan: {instance.ReferenceNumber}",
                    $"Dokumen {instance.ReferenceNumber} telah disetujui pada level {currentStep.TargetJobLevelCode} dan kini menunggu persetujuan Anda pada level {nextStep.TargetJobLevelCode}.",
                    "/inbox",
                    cancellationToken);
            }
            else
            {
                instance.Status = WorkflowInstanceStatus.APPROVED;
                await SyncTransactionStatusAsync(instance, WorkflowInstanceStatus.APPROVED, cancellationToken);

                await _notificationPublisher.PublishToUserAsync(
                    instance.RequesterUserId,
                    $"Dokumen Disetujui Penuh: {instance.ReferenceNumber}",
                    $"Pengajuan {instance.ReferenceNumber} senilai Rp {instance.TransactionAmount:N0} telah disetujui secara final (FINAL_APPROVAL).",
                    "/transactions",
                    cancellationToken);
            }
        }
        else if (normalizedAction == "REJECT")
        {
            currentStep.Status = WorkflowStepStatus.REJECTED;
            instance.Status = WorkflowInstanceStatus.REJECTED;
            await SyncTransactionStatusAsync(instance, WorkflowInstanceStatus.REJECTED, cancellationToken);

            await _notificationPublisher.PublishToUserAsync(
                instance.RequesterUserId,
                $"Dokumen Ditolak: {instance.ReferenceNumber}",
                $"Pengajuan {instance.ReferenceNumber} ditolak pada level {currentStep.TargetJobLevelCode}. Alasan: {comments}",
                "/transactions",
                cancellationToken);
        }
        else if (normalizedAction == "REVISE")
        {
            currentStep.Status = WorkflowStepStatus.SENT_BACK;
            instance.Status = WorkflowInstanceStatus.REVISED;
            await SyncTransactionStatusAsync(instance, WorkflowInstanceStatus.REVISED, cancellationToken);

            await _notificationPublisher.PublishToUserAsync(
                instance.RequesterUserId,
                $"Permintaan Revisi (Send Back): {instance.ReferenceNumber}",
                $"Dokumen {instance.ReferenceNumber} dikembalikan untuk revisi oleh level {currentStep.TargetJobLevelCode}. Catatan: {comments}",
                "/transactions",
                cancellationToken);
        }
        else
        {
            return (false, $"Aksi '{action}' tidak dikenali.");
        }

        await _context.SaveChangesAsync(cancellationToken);
        return (true, $"Aksi {normalizedAction} pada dokumen {instance.ReferenceNumber} berhasil disimpan.");
    }

    private async Task SyncTransactionStatusAsync(WorkflowInstance instance, WorkflowInstanceStatus newStatus, CancellationToken cancellationToken)
    {
        if (instance.DocTypeCode == "PO")
        {
            var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == instance.ReferenceTransactionId, cancellationToken);
            if (po != null) po.Status = newStatus;
        }
        else if (instance.DocTypeCode == "DCP")
        {
            var dcp = await _context.DirectCashPayments.FirstOrDefaultAsync(d => d.Id == instance.ReferenceTransactionId, cancellationToken);
            if (dcp != null) dcp.Status = newStatus;
        }
    }
}

