using CoreEnterprise.Domain.Common;
using CoreEnterprise.Domain.Enums;

namespace CoreEnterprise.Domain.Entities;

public class PurchaseOrder : BaseAuditableEntity
{
    public string PoNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string VendorName { get; set; } = string.Empty;
    public string SubCategoryCode { get; set; } = "ASSET"; // ASSET or AGRO_CHEM
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "IDR";
    public string? Notes { get; set; }

    public Guid RequesterUserId { get; set; }
    public User RequesterUser { get; set; } = null!;

    public Guid OrgUnitId { get; set; }
    public OrganizationUnit OrgUnit { get; set; } = null!;

    public Guid? AttachmentDmsFileId { get; set; }
    public DmsFile? AttachmentDmsFile { get; set; }

    public WorkflowInstanceStatus Status { get; set; } = WorkflowInstanceStatus.DRAFT;
    public Guid? WorkflowInstanceId { get; set; }
    public WorkflowInstance? WorkflowInstance { get; set; }

    public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
}

public class PurchaseOrderItem : BaseAuditableEntity
{
    public Guid PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public string ItemCode { get; set; } = string.Empty;
    public string ItemDescription { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string UnitOfMeasure { get; set; } = "UNIT";
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }
}

public class DirectCashPayment : BaseAuditableEntity
{
    public string DcpNumber { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public string PayeeName { get; set; } = string.Empty;
    public string SubCategoryCode { get; set; } = "GENERAL";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "IDR";
    public string? Remarks { get; set; }

    public Guid RequesterUserId { get; set; }
    public User RequesterUser { get; set; } = null!;

    public Guid OrgUnitId { get; set; }
    public OrganizationUnit OrgUnit { get; set; } = null!;

    public Guid? AttachmentDmsFileId { get; set; }
    public DmsFile? AttachmentDmsFile { get; set; }

    public WorkflowInstanceStatus Status { get; set; } = WorkflowInstanceStatus.DRAFT;
    public Guid? WorkflowInstanceId { get; set; }
    public WorkflowInstance? WorkflowInstance { get; set; }
}

