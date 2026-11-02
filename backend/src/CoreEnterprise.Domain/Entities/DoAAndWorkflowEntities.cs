using CoreEnterprise.Domain.Common;
using CoreEnterprise.Domain.Enums;

namespace CoreEnterprise.Domain.Entities;

public class DocumentType : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool HasFinancialPlafond { get; set; } = true;

    public ICollection<DocumentSubCategory> SubCategories { get; set; } = new List<DocumentSubCategory>();
}

public class DocumentSubCategory : BaseAuditableEntity
{
    public Guid DocumentTypeId { get; set; }
    public DocumentType DocumentType { get; set; } = null!;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class DoAPolicyHeader : BaseAuditableEntity
{
    public string PolicyNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public int Version { get; set; } = 1;
    public DoAPolicyStatus Status { get; set; } = DoAPolicyStatus.DRAFT;

    public Guid? OfficialAttachmentFileId { get; set; }
    public DmsFile? OfficialAttachmentFile { get; set; }

    public string? Remarks { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public User? ApprovedByUser { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public ICollection<DoAPolicyDetail> Details { get; set; } = new List<DoAPolicyDetail>();
}

public class DoAPolicyDetail : BaseAuditableEntity
{
    public Guid DoAPolicyHeaderId { get; set; }
    public DoAPolicyHeader DoAPolicyHeader { get; set; } = null!;

    public string DocumentTypeCode { get; set; } = string.Empty;
    public string SubCategoryCode { get; set; } = "ALL";
    public string OrgUnitTypeScope { get; set; } = "ALL";

    public Guid JobLevelId { get; set; }
    public JobLevel JobLevel { get; set; } = null!;

    public decimal MinAmount { get; set; }
    public decimal MaxAmount { get; set; }
    public string Currency { get; set; } = "IDR";
    public DoAStepBehavior StepBehavior { get; set; } = DoAStepBehavior.FINAL_IF_SUFFICIENT;
    public int SlaHours { get; set; } = 24;
}

public class ApprovalAuthorityAssignment : BaseAuditableEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string JobLevelCode { get; set; } = string.Empty;

    public Guid OrgUnitId { get; set; }
    public OrganizationUnit OrgUnit { get; set; } = null!;

    public string DocTypeCode { get; set; } = "ALL";
    public string SubCategoryCode { get; set; } = "ALL";
    public int PriorityOrder { get; set; } = 1;
    public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
    public DateTime? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ApprovalDelegation : BaseAuditableEntity
{
    public Guid DelegatorUserId { get; set; }
    public User DelegatorUser { get; set; } = null!;

    public Guid DelegateeUserId { get; set; }
    public User DelegateeUser { get; set; } = null!;

    public string DocTypeCode { get; set; } = "ALL";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Reason { get; set; } = string.Empty;

    public Guid? AttachmentDmsFileId { get; set; }
    public DmsFile? AttachmentDmsFile { get; set; }

    public bool IsActive { get; set; } = true;
}

public class WorkflowInstance : BaseAuditableEntity
{
    public Guid ReferenceTransactionId { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string DocTypeCode { get; set; } = string.Empty;
    public string SubCategoryCode { get; set; } = "ALL";
    public decimal TransactionAmount { get; set; }

    public Guid RequesterUserId { get; set; }
    public User RequesterUser { get; set; } = null!;

    public Guid RequesterOrgUnitId { get; set; }
    public OrganizationUnit RequesterOrgUnit { get; set; } = null!;

    public Guid AppliedDoAPolicyHeaderId { get; set; }
    public DoAPolicyHeader AppliedDoAPolicyHeader { get; set; } = null!;

    public int CurrentRevisionCycle { get; set; } = 1;
    public int CurrentStepSequence { get; set; } = 1;
    public WorkflowInstanceStatus Status { get; set; } = WorkflowInstanceStatus.IN_PROGRESS;

    public ICollection<WorkflowStep> Steps { get; set; } = new List<WorkflowStep>();
}

public class WorkflowStep : BaseAuditableEntity
{
    public Guid WorkflowInstanceId { get; set; }
    public WorkflowInstance WorkflowInstance { get; set; } = null!;

    public int RevisionCycle { get; set; } = 1;
    public int Sequence { get; set; }
    public string TargetJobLevelCode { get; set; } = string.Empty;

    public Guid ResolvedOrgUnitId { get; set; }
    public OrganizationUnit ResolvedOrgUnit { get; set; } = null!;

    public decimal PlafondLimitAtStep { get; set; }

    public Guid AssignedUserId { get; set; }
    public User AssignedUser { get; set; } = null!;

    public Guid? ActualActionUserId { get; set; }
    public User? ActualActionUser { get; set; }

    public bool IsDelegatedAction { get; set; }
    public WorkflowStepRoleType StepRoleType { get; set; }
    public WorkflowStepStatus Status { get; set; } = WorkflowStepStatus.WAITING;
    public string? Comments { get; set; }
    public DateTime? ActionTakenAt { get; set; }
    public DateTime DueDateSla { get; set; }
}

