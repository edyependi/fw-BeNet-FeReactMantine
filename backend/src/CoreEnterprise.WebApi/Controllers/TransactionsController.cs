using System.Text;
using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Application.Workflows;
using CoreEnterprise.Domain.Entities;
using CoreEnterprise.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoreEnterprise.WebApi.Controllers;

public record PurchaseOrderItemInputDto(
    string ItemCode,
    string ItemDescription,
    decimal Quantity,
    string UnitOfMeasure,
    decimal UnitPrice
);

public record SubmitPurchaseOrderRequest(
    Guid? ExistingPoId,
    string Title,
    string VendorName,
    string SubCategoryCode, // ASSET or AGRO_CHEM at Header Level
    string? Notes,
    Guid RequesterUserId,
    List<PurchaseOrderItemInputDto> Items
);

public record SubmitDirectCashPaymentRequest(
    Guid? ExistingDcpId,
    string Purpose,
    string PayeeName,
    string SubCategoryCode,
    decimal Amount,
    string? Remarks,
    Guid RequesterUserId
);

public record ExecuteWorkflowActionRequest(
    Guid WorkflowInstanceId,
    Guid ActorUserId,
    string Action, // APPROVE, REJECT, REVISE, CANCEL
    string? Comments
);

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IWorkflowEngineService _workflowEngine;

    public TransactionsController(IApplicationDbContext context, IWorkflowEngineService workflowEngine)
    {
        _context = context;
        _workflowEngine = workflowEngine;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTransactions(CancellationToken cancellationToken)
    {
        var pos = await _context.PurchaseOrders
            .Include(p => p.RequesterUser)
            .Include(p => p.OrgUnit)
            .Include(p => p.Items)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        var dcps = await _context.DirectCashPayments
            .Include(d => d.RequesterUser)
            .Include(d => d.OrgUnit)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);

        var wfIds = pos.Where(p => p.WorkflowInstanceId.HasValue).Select(p => p.WorkflowInstanceId!.Value)
            .Concat(dcps.Where(d => d.WorkflowInstanceId.HasValue).Select(d => d.WorkflowInstanceId!.Value))
            .Distinct()
            .ToList();

        var workflows = await _context.WorkflowInstances
            .Include(w => w.AppliedDoAPolicyHeader)
            .Include(w => w.Steps)
                .ThenInclude(s => s.AssignedUser)
            .Include(w => w.Steps)
                .ThenInclude(s => s.ActualActionUser)
            .Include(w => w.Steps)
                .ThenInclude(s => s.ResolvedOrgUnit)
            .Where(w => wfIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, cancellationToken);

        object? MapWorkflow(Guid? wfId)
        {
            if (!wfId.HasValue || !workflows.TryGetValue(wfId.Value, out var w))
                return null;

            return new
            {
                w.Id,
                w.ReferenceNumber,
                w.CurrentRevisionCycle,
                w.CurrentStepSequence,
                Status = w.Status.ToString(),
                AppliedPolicyNumber = w.AppliedDoAPolicyHeader.PolicyNumber,
                Steps = w.Steps
                    .OrderBy(s => s.RevisionCycle)
                    .ThenBy(s => s.Sequence)
                    .Select(s => new
                    {
                        s.Id,
                        s.RevisionCycle,
                        s.Sequence,
                        s.TargetJobLevelCode,
                        ResolvedOrgUnitCode = s.ResolvedOrgUnit.Code,
                        s.PlafondLimitAtStep,
                        s.AssignedUserId,
                        AssignedUserName = s.AssignedUser.FullName,
                        s.ActualActionUserId,
                        ActualActionUserName = s.ActualActionUser != null ? s.ActualActionUser.FullName : null,
                        s.IsDelegatedAction,
                        StepRoleType = s.StepRoleType.ToString(),
                        Status = s.Status.ToString(),
                        s.Comments,
                        s.ActionTakenAt,
                        s.DueDateSla
                    })
            };
        }

        return Ok(new
        {
            purchaseOrders = pos.Select(p => new
            {
                p.Id,
                p.PoNumber,
                p.Title,
                p.VendorName,
                p.SubCategoryCode,
                p.TotalAmount,
                p.Currency,
                p.Notes,
                Status = p.Status.ToString(),
                p.RequesterUserId,
                RequesterName = p.RequesterUser.FullName,
                OrgUnitCode = p.OrgUnit.Code,
                p.CreatedAt,
                p.WorkflowInstanceId,
                Workflow = MapWorkflow(p.WorkflowInstanceId),
                Items = p.Items.Select(i => new
                {
                    i.Id,
                    i.ItemCode,
                    i.ItemDescription,
                    i.Quantity,
                    i.UnitOfMeasure,
                    i.UnitPrice,
                    i.SubTotal
                })
            }),
            directCashPayments = dcps.Select(d => new
            {
                d.Id,
                d.DcpNumber,
                d.Purpose,
                d.PayeeName,
                d.SubCategoryCode,
                d.Amount,
                d.Currency,
                d.Remarks,
                Status = d.Status.ToString(),
                d.RequesterUserId,
                RequesterName = d.RequesterUser.FullName,
                OrgUnitCode = d.OrgUnit.Code,
                d.CreatedAt,
                d.WorkflowInstanceId,
                Workflow = MapWorkflow(d.WorkflowInstanceId)
            })
        });
    }

    [HttpPost("po")]
    public async Task<IActionResult> SubmitPurchaseOrder([FromBody] SubmitPurchaseOrderRequest request, CancellationToken cancellationToken)
    {
        var requester = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == request.RequesterUserId, cancellationToken);
        if (requester == null)
            return BadRequest(new { message = "Pengaju (Requester) tidak ditemukan." });

        if (requester.UserRoles.All(ur => ur.Role.Code == "AUDITOR"))
        {
            return StatusCode(403, new { message = "Kepatuhan SoD (Bagian 5 PRD): Role AUDITOR bersifat Global Read-Only dan dilarang membuat/mengubah transaksi." });
        }

        var totalAmount = request.Items.Sum(i => i.Quantity * i.UnitPrice);
        if (totalAmount <= 0)
            return BadRequest(new { message = "Total nilai Purchase Order harus lebih besar dari 0." });

        PurchaseOrder? po = null;
        if (request.ExistingPoId.HasValue)
        {
            po = await _context.PurchaseOrders
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == request.ExistingPoId.Value, cancellationToken);
        }

        if (po == null)
        {
            var seqCount = await _context.PurchaseOrders.CountAsync(cancellationToken) + 1;
            po = new PurchaseOrder
            {
                PoNumber = $"PO/2026/11/{seqCount:D4}",
                Title = request.Title,
                VendorName = request.VendorName,
                SubCategoryCode = request.SubCategoryCode.ToUpperInvariant(),
                TotalAmount = totalAmount,
                Notes = request.Notes,
                RequesterUserId = requester.Id,
                OrgUnitId = requester.PrimaryOrgUnitId,
                Status = WorkflowInstanceStatus.IN_PROGRESS
            };

            foreach (var item in request.Items)
            {
                po.Items.Add(new PurchaseOrderItem
                {
                    ItemCode = item.ItemCode,
                    ItemDescription = item.ItemDescription,
                    Quantity = item.Quantity,
                    UnitOfMeasure = item.UnitOfMeasure,
                    UnitPrice = item.UnitPrice,
                    SubTotal = item.Quantity * item.UnitPrice
                });
            }

            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync(cancellationToken);
        }
        else
        {
            po.Title = request.Title;
            po.VendorName = request.VendorName;
            po.SubCategoryCode = request.SubCategoryCode.ToUpperInvariant();
            po.TotalAmount = totalAmount;
            po.Notes = request.Notes;
            po.Status = WorkflowInstanceStatus.IN_PROGRESS;

            _context.PurchaseOrderItems.RemoveRange(po.Items);
            po.Items.Clear();
            foreach (var item in request.Items)
            {
                po.Items.Add(new PurchaseOrderItem
                {
                    PurchaseOrderId = po.Id,
                    ItemCode = item.ItemCode,
                    ItemDescription = item.ItemDescription,
                    Quantity = item.Quantity,
                    UnitOfMeasure = item.UnitOfMeasure,
                    UnitPrice = item.UnitPrice,
                    SubTotal = item.Quantity * item.UnitPrice
                });
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        var wfResult = await _workflowEngine.SubmitOrResubmitAsync(
            po.Id,
            po.PoNumber,
            "PO",
            po.SubCategoryCode,
            po.TotalAmount,
            requester.Id,
            po.WorkflowInstanceId,
            cancellationToken);

        if (!wfResult.Success || wfResult.Instance == null)
        {
            return BadRequest(new { message = wfResult.Message });
        }

        po.WorkflowInstanceId = wfResult.Instance.Id;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = wfResult.Message, poId = po.Id, poNumber = po.PoNumber, workflowInstanceId = wfResult.Instance.Id });
    }

    [HttpPost("dcp")]
    public async Task<IActionResult> SubmitDirectCashPayment([FromBody] SubmitDirectCashPaymentRequest request, CancellationToken cancellationToken)
    {
        var requester = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == request.RequesterUserId, cancellationToken);
        if (requester == null)
            return BadRequest(new { message = "Pengaju (Requester) tidak ditemukan." });

        if (requester.UserRoles.All(ur => ur.Role.Code == "AUDITOR"))
        {
            return StatusCode(403, new { message = "Kepatuhan SoD (Bagian 5 PRD): Role AUDITOR bersifat Global Read-Only dan dilarang membuat/mengubah transaksi." });
        }

        if (request.Amount <= 0)
            return BadRequest(new { message = "Nominal Direct Cash Payment harus lebih besar dari 0." });

        DirectCashPayment? dcp = null;
        if (request.ExistingDcpId.HasValue)
        {
            dcp = await _context.DirectCashPayments.FirstOrDefaultAsync(d => d.Id == request.ExistingDcpId.Value, cancellationToken);
        }

        if (dcp == null)
        {
            var seqCount = await _context.DirectCashPayments.CountAsync(cancellationToken) + 1;
            dcp = new DirectCashPayment
            {
                DcpNumber = $"DCP/2026/11/{seqCount:D4}",
                Purpose = request.Purpose,
                PayeeName = request.PayeeName,
                SubCategoryCode = string.IsNullOrWhiteSpace(request.SubCategoryCode) ? "GENERAL" : request.SubCategoryCode.ToUpperInvariant(),
                Amount = request.Amount,
                Remarks = request.Remarks,
                RequesterUserId = requester.Id,
                OrgUnitId = requester.PrimaryOrgUnitId,
                Status = WorkflowInstanceStatus.IN_PROGRESS
            };
            _context.DirectCashPayments.Add(dcp);
            await _context.SaveChangesAsync(cancellationToken);
        }
        else
        {
            dcp.Purpose = request.Purpose;
            dcp.PayeeName = request.PayeeName;
            dcp.SubCategoryCode = string.IsNullOrWhiteSpace(request.SubCategoryCode) ? "GENERAL" : request.SubCategoryCode.ToUpperInvariant();
            dcp.Amount = request.Amount;
            dcp.Remarks = request.Remarks;
            dcp.Status = WorkflowInstanceStatus.IN_PROGRESS;
            await _context.SaveChangesAsync(cancellationToken);
        }

        var wfResult = await _workflowEngine.SubmitOrResubmitAsync(
            dcp.Id,
            dcp.DcpNumber,
            "DCP",
            dcp.SubCategoryCode,
            dcp.Amount,
            requester.Id,
            dcp.WorkflowInstanceId,
            cancellationToken);

        if (!wfResult.Success || wfResult.Instance == null)
        {
            return BadRequest(new { message = wfResult.Message });
        }

        dcp.WorkflowInstanceId = wfResult.Instance.Id;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = wfResult.Message, dcpId = dcp.Id, dcpNumber = dcp.DcpNumber, workflowInstanceId = wfResult.Instance.Id });
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> GetApprovalInbox([FromQuery] Guid userId, CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;

        // Check if this user is an active delegatee for someone else
        var delegatedFromUserIds = await _context.ApprovalDelegations
            .Where(d => d.IsActive && d.DelegateeUserId == userId && d.StartDate <= nowUtc && d.EndDate >= nowUtc)
            .Select(d => d.DelegatorUserId)
            .ToListAsync(cancellationToken);

        var targetUserIds = new List<Guid> { userId };
        targetUserIds.AddRange(delegatedFromUserIds);

        var pendingSteps = await _context.WorkflowSteps
            .Include(s => s.WorkflowInstance)
                .ThenInclude(w => w.RequesterUser)
            .Include(s => s.WorkflowInstance)
                .ThenInclude(w => w.RequesterOrgUnit)
            .Include(s => s.WorkflowInstance)
                .ThenInclude(w => w.AppliedDoAPolicyHeader)
            .Include(s => s.AssignedUser)
            .Include(s => s.ResolvedOrgUnit)
            .Where(s =>
                s.Status == WorkflowStepStatus.PENDING &&
                s.WorkflowInstance.Status == WorkflowInstanceStatus.IN_PROGRESS &&
                s.RevisionCycle == s.WorkflowInstance.CurrentRevisionCycle &&
                targetUserIds.Contains(s.AssignedUserId))
            .OrderByDescending(s => s.WorkflowInstance.CreatedAt)
            .Select(s => new
            {
                StepId = s.Id,
                s.WorkflowInstanceId,
                s.WorkflowInstance.ReferenceTransactionId,
                s.WorkflowInstance.ReferenceNumber,
                s.WorkflowInstance.DocTypeCode,
                s.WorkflowInstance.SubCategoryCode,
                s.WorkflowInstance.TransactionAmount,
                s.WorkflowInstance.CurrentRevisionCycle,
                AppliedPolicyNumber = s.WorkflowInstance.AppliedDoAPolicyHeader.PolicyNumber,
                RequesterName = s.WorkflowInstance.RequesterUser.FullName,
                RequesterOrgCode = s.WorkflowInstance.RequesterOrgUnit.Code,
                s.Sequence,
                s.TargetJobLevelCode,
                ResolvedOrgUnitCode = s.ResolvedOrgUnit.Code,
                s.PlafondLimitAtStep,
                StepRoleType = s.StepRoleType.ToString(),
                s.AssignedUserId,
                AssignedUserName = s.AssignedUser.FullName,
                IsOnBehalfOf = s.AssignedUserId != userId,
                s.DueDateSla
            })
            .ToListAsync(cancellationToken);

        return Ok(pendingSteps);
    }

    [HttpPost("workflow-action")]
    public async Task<IActionResult> ExecuteWorkflowAction([FromBody] ExecuteWorkflowActionRequest request, CancellationToken cancellationToken)
    {
        var actor = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == request.ActorUserId, cancellationToken);

        if (actor != null && actor.UserRoles.All(ur => ur.Role.Code == "AUDITOR"))
        {
            return StatusCode(403, new { message = "Kepatuhan SoD (Bagian 5 PRD): Role AUDITOR dilarang melakukan Approve, Reject, atau Revise." });
        }
        var result = await _workflowEngine.ExecuteActionAsync(
            request.WorkflowInstanceId,
            request.ActorUserId,
            request.Action,
            request.Comments,
            cancellationToken);

        if (!result.Success)
            return BadRequest(new { message = result.Message });

        var wf = await _context.WorkflowInstances
            .Include(w => w.RequesterUser)
            .FirstOrDefaultAsync(w => w.Id == request.WorkflowInstanceId, cancellationToken);

        EmailDispatchResult? emailResult = null;
        if (wf?.RequesterUser != null)
        {
            emailResult = await EnterpriseEmailDispatcher.DispatchAsync(
                _context,
                eventType: $"WORKFLOW_{request.Action.ToUpperInvariant()}",
                moduleSource: "WORKFLOW_ENGINE",
                recipientUserId: null, // WorkflowEngine already creates in-app notification
                recipientName: wf.RequesterUser.FullName,
                recipientEmail: wf.RequesterUser.Email,
                referenceCode: wf.ReferenceNumber,
                subjectPrefix: $"Update Status Dokumen {wf.ReferenceNumber} ({request.Action.ToUpperInvariant()})",
                bodyContent:
                    $"Yth. {wf.RequesterUser.FullName},\n\n" +
                    $"Dokumen transaksi {wf.DocTypeCode} ({wf.SubCategoryCode}) dengan nomor referensi {wf.ReferenceNumber} telah diproses oleh {actor?.FullName ?? "Approver"} dengan keputusan: {request.Action.ToUpperInvariant()}.\n\n" +
                    $"• Status Workflow Saat Ini : {wf.Status}\n" +
                    $"• Catatan Approver : {(string.IsNullOrWhiteSpace(request.Comments) ? "-" : request.Comments)}\n" +
                    $"• Ringkasan Sistem : {result.Message}",
                inAppNotificationTitle: null,
                inAppNotificationMessage: null,
                cancellationToken: cancellationToken
            );
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { message = result.Message, emailNotification = emailResult });
    }

    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportTransactionsCsv(CancellationToken cancellationToken)
    {
        var workflows = await _context.WorkflowInstances
            .Include(w => w.RequesterUser)
            .Include(w => w.RequesterOrgUnit)
            .Include(w => w.AppliedDoAPolicyHeader)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("ReferenceNumber,DocTypeCode,SubCategoryCode,TransactionAmount,Requester,OrgUnit,AppliedDoAPolicy,RevisionCycle,Status,CreatedAtUtc");

        foreach (var w in workflows)
        {
            sb.AppendLine($"\"{w.ReferenceNumber}\",\"{w.DocTypeCode}\",\"{w.SubCategoryCode}\",{w.TransactionAmount},\"{w.RequesterUser.FullName}\",\"{w.RequesterOrgUnit.Code}\",\"{w.AppliedDoAPolicyHeader.PolicyNumber}\",{w.CurrentRevisionCycle},\"{w.Status}\",\"{w.CreatedAt:O}\"");
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"CoreEnterprise_Transactions_{DateTime.UtcNow:yyyyMMdd}.csv");
    }
}

