using CoreEnterprise.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CoreEnterprise.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<OrganizationUnit> OrganizationUnits { get; }
    DbSet<JobLevel> JobLevels { get; }
    DbSet<Role> Roles { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<User> Users { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<AppMenuItem> AppMenuItems { get; }
    DbSet<AbacPolicyRule> AbacPolicyRules { get; }
    DbSet<AppSettingItem> AppSettingItems { get; }
    DbSet<AppI18nEntry> AppI18nEntries { get; }
    DbSet<EmailDispatchLog> EmailDispatchLogs { get; }

    DbSet<DocumentType> DocumentTypes { get; }
    DbSet<DocumentSubCategory> DocumentSubCategories { get; }
    DbSet<DoAPolicyHeader> DoAPolicyHeaders { get; }
    DbSet<DoAPolicyDetail> DoAPolicyDetails { get; }
    DbSet<ApprovalAuthorityAssignment> ApprovalAuthorityAssignments { get; }
    DbSet<ApprovalDelegation> ApprovalDelegations { get; }

    DbSet<WorkflowInstance> WorkflowInstances { get; }
    DbSet<WorkflowStep> WorkflowSteps { get; }

    DbSet<DmsFile> DmsFiles { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<UserNotification> UserNotifications { get; }

    DbSet<PurchaseOrder> PurchaseOrders { get; }
    DbSet<PurchaseOrderItem> PurchaseOrderItems { get; }
    DbSet<DirectCashPayment> DirectCashPayments { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? UserName { get; }
    string? JobLevelCode { get; }
    int? JobRank { get; }
    Guid? PrimaryOrgUnitId { get; }
    string? IpAddress { get; }
    string? UserAgent { get; }
    string AcceptLanguage { get; }
    IReadOnlyList<string> Roles { get; }
    IReadOnlyList<string> Permissions { get; }
}

