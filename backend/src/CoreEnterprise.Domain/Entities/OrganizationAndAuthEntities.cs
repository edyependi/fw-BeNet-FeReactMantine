using CoreEnterprise.Domain.Common;
using CoreEnterprise.Domain.Enums;

namespace CoreEnterprise.Domain.Entities;

public class OrganizationUnit : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public OrganizationUnitType UnitType { get; set; }
    public Guid? ParentUnitId { get; set; }
    public bool IsActive { get; set; } = true;

    public OrganizationUnit? ParentUnit { get; set; }
    public ICollection<OrganizationUnit> ChildUnits { get; set; } = new List<OrganizationUnit>();
}

public class JobLevel : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int RankOrder { get; set; }
    public string? Description { get; set; }
}

public class Role : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

public class Permission : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class RolePermission
{
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;

    public Guid PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
}

public class User : BaseAuditableEntity
{
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;

    public Guid JobLevelId { get; set; }
    public JobLevel JobLevel { get; set; } = null!;

    public Guid PrimaryOrgUnitId { get; set; }
    public OrganizationUnit PrimaryOrgUnit { get; set; } = null!;

    public Guid? DirectSupervisorId { get; set; }
    public User? DirectSupervisor { get; set; }

    public Guid? AvatarDmsFileId { get; set; }
    public DmsFile? AvatarDmsFile { get; set; }

    public Guid? SignatureDmsFileId { get; set; }
    public DmsFile? SignatureDmsFile { get; set; }

    public string PreferredLanguage { get; set; } = "id";
    public string PreferredTheme { get; set; } = "light";
    public string? PhoneNumber { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

public class UserRole
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
}

public class RefreshToken : BaseAuditableEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? ReplacedByToken { get; set; }
    public string? CreatedByIp { get; set; }
    public bool IsActive => RevokedAtUtc == null && DateTime.UtcNow < ExpiresAtUtc;
}

public class AppMenuItem : BaseAuditableEntity
{
    public string MenuCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string GroupCategory { get; set; } = "Core Workspace";
    public string IconName { get; set; } = "IconRoute";
    public int SortOrder { get; set; } = 10;
    public string RequiredPermissionCode { get; set; } = string.Empty;
    public string AllowedRoleCodesCsv { get; set; } = "EMPLOYEE,AUDITOR,SERVICEDESK,MASTER_DATA,SUPERADMIN";
    public bool IsVisible { get; set; } = true;
}

public class AbacPolicyRule : BaseAuditableEntity
{
    public string PolicyCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public string TargetResource { get; set; } = "ALL";
    public string TargetAction { get; set; } = "ALL";

    // Axis 1 & Axis 2 Subject Attributes
    public string SubjectJobLevelsCsv { get; set; } = "ALL";
    public int MinJobRank { get; set; } = 0;
    public int MaxJobRank { get; set; } = 100;
    public string SubjectRolesCsv { get; set; } = "ALL";

    // Axis 3 Contextual & Resource Attributes
    public string OrgScopeRule { get; set; } = "ANY_ORG_UNIT"; // ANY_ORG_UNIT, SAME_DEPARTMENT_ONLY, SAME_ORG_BRANCH_UPWARD, HEAD_OFFICE_ONLY
    public string SubCategoryScope { get; set; } = "ALL";
    public decimal? MaxTransactionAmount { get; set; }
    public bool EnforceFourEyesSod { get; set; }
    public bool RequireDigitalSignature { get; set; }

    // Effect & Priority
    public string Effect { get; set; } = "ALLOW"; // ALLOW or DENY
    public int PriorityOrder { get; set; } = 10;
    public bool IsActive { get; set; } = true;
}

public class AppSettingItem : BaseAuditableEntity
{
    public string SettingKey { get; set; } = string.Empty;
    public string SettingValue { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Category { get; set; } = "GENERAL"; // BRANDING, WORKFLOW, SECURITY, DMS, NOTIFICATION, GENERAL
    public string ValueType { get; set; } = "STRING"; // STRING, NUMBER, BOOLEAN, ICON, JSON
    public string? Description { get; set; }
    public bool IsSystemCore { get; set; }
    public bool IsPublic { get; set; } = true;
}

public class AppI18nEntry : BaseAuditableEntity
{
    public string TranslationKey { get; set; } = string.Empty;
    public string ModuleGroup { get; set; } = "GENERAL_UI"; // MENU_NAVIGATION, HEADER_BRANDING, DASHBOARD_KPI, WORKFLOW_SIMULATOR, GENERAL_UI
    public string TextId { get; set; } = string.Empty;
    public string TextEn { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystemCore { get; set; } = true;
}

public class EmailDispatchLog : BaseAuditableEntity
{
    public string EventType { get; set; } = string.Empty; // SERVICEDESK_ACCOUNT_LOCKED, SERVICEDESK_ACCOUNT_UNLOCKED, SERVICEDESK_PASSWORD_RESET, WORKFLOW_APPROVAL_REQUEST, WORKFLOW_DECISION, TEST_EMAIL
    public string ModuleSource { get; set; } = string.Empty; // IT_SERVICEDESK, WORKFLOW_ENGINE, APP_SETTINGS
    public string SenderName { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string ReplyToEmail { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public string? CcEmails { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string BodyText { get; set; } = string.Empty;
    public string DeliveryStatus { get; set; } = "SENT_OUTBOX"; // SENT_SMTP, SENT_OUTBOX, DISABLED_SKIPPED
    public string SmtpHostUsed { get; set; } = string.Empty;
    public string? ReferenceCode { get; set; }
}




