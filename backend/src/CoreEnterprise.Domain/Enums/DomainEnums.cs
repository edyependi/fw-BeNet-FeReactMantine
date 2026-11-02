namespace CoreEnterprise.Domain.Enums;

public enum OrganizationUnitType
{
    COMPANY = 1,
    REGIONAL = 2,
    AREA = 3,
    DEPARTMENT = 4,
    SECTION = 5
}

public enum DoAPolicyStatus
{
    DRAFT = 1,
    PENDING_APPROVAL = 2,
    ACTIVE = 3,
    SUPERSEDED = 4,
    ARCHIVED = 5
}

public enum DoAStepBehavior
{
    MANDATORY_REVIEW = 1,
    FINAL_IF_SUFFICIENT = 2,
    SKIP_IF_INSUFFICIENT = 3
}

public enum WorkflowInstanceStatus
{
    DRAFT = 0,
    IN_PROGRESS = 1,
    APPROVED = 2,
    REJECTED = 3,
    REVISED = 4,
    CANCELLED = 5
}

public enum WorkflowStepRoleType
{
    REVIEW_ESCALATE = 1,
    FINAL_APPROVAL = 2
}

public enum WorkflowStepStatus
{
    WAITING = 1,
    PENDING = 2,
    APPROVED = 3,
    REJECTED = 4,
    SENT_BACK = 5,
    SKIPPED = 6
}

public enum DmsModuleCategory
{
    DOA_POLICY_SK = 1,
    TRANSACTION_ATTACHMENT = 2,
    USER_AVATAR = 3,
    USER_SIGNATURE = 4,
    DELEGATION_LETTER = 5
}

public enum AuditActionType
{
    CREATE = 1,
    UPDATE = 2,
    DELETE = 3,
    APPROVE = 4,
    REJECT = 5,
    REVISE = 6,
    LOGIN = 7
}

