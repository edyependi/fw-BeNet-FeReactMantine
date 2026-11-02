using CoreEnterprise.Application.Common.Interfaces;
using CoreEnterprise.Domain.Entities;
using CoreEnterprise.Infrastructure.Persistence.Interceptors;
using Microsoft.EntityFrameworkCore;

namespace CoreEnterprise.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    private readonly AuditableEntitySaveChangesInterceptor _auditableEntitySaveChangesInterceptor;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        AuditableEntitySaveChangesInterceptor auditableEntitySaveChangesInterceptor)
        : base(options)
    {
        _auditableEntitySaveChangesInterceptor = auditableEntitySaveChangesInterceptor;
    }

    public DbSet<OrganizationUnit> OrganizationUnits => Set<OrganizationUnit>();
    public DbSet<JobLevel> JobLevels => Set<JobLevel>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AppMenuItem> AppMenuItems => Set<AppMenuItem>();
    public DbSet<AbacPolicyRule> AbacPolicyRules => Set<AbacPolicyRule>();
    public DbSet<AppSettingItem> AppSettingItems => Set<AppSettingItem>();
    public DbSet<AppI18nEntry> AppI18nEntries => Set<AppI18nEntry>();
    public DbSet<EmailDispatchLog> EmailDispatchLogs => Set<EmailDispatchLog>();

    public DbSet<DocumentType> DocumentTypes => Set<DocumentType>();
    public DbSet<DocumentSubCategory> DocumentSubCategories => Set<DocumentSubCategory>();
    public DbSet<DoAPolicyHeader> DoAPolicyHeaders => Set<DoAPolicyHeader>();
    public DbSet<DoAPolicyDetail> DoAPolicyDetails => Set<DoAPolicyDetail>();
    public DbSet<ApprovalAuthorityAssignment> ApprovalAuthorityAssignments => Set<ApprovalAuthorityAssignment>();
    public DbSet<ApprovalDelegation> ApprovalDelegations => Set<ApprovalDelegation>();

    public DbSet<WorkflowInstance> WorkflowInstances => Set<WorkflowInstance>();
    public DbSet<WorkflowStep> WorkflowSteps => Set<WorkflowStep>();

    public DbSet<DmsFile> DmsFiles => Set<DmsFile>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();

    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderItem> PurchaseOrderItems => Set<PurchaseOrderItem>();
    public DbSet<DirectCashPayment> DirectCashPayments => Set<DirectCashPayment>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.AddInterceptors(_auditableEntitySaveChangesInterceptor);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // OrganizationUnit
        modelBuilder.Entity<OrganizationUnit>(b =>
        {
            b.HasIndex(x => x.Code).IsUnique();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.UnitType).HasConversion<string>().HasMaxLength(32);
            b.HasOne(x => x.ParentUnit)
                .WithMany(x => x.ChildUnits)
                .HasForeignKey(x => x.ParentUnitId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // JobLevel (Axis 1)
        modelBuilder.Entity<JobLevel>(b =>
        {
            b.HasIndex(x => x.Code).IsUnique();
            b.Property(x => x.Code).HasMaxLength(32).IsRequired();
            b.Property(x => x.Name).HasMaxLength(120).IsRequired();
        });

        // Role & Permission (Axis 2)
        modelBuilder.Entity<Role>(b =>
        {
            b.HasIndex(x => x.Code).IsUnique();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        });

        modelBuilder.Entity<Permission>(b =>
        {
            b.HasIndex(x => x.Code).IsUnique();
            b.Property(x => x.Code).HasMaxLength(100).IsRequired();
            b.Property(x => x.Module).HasMaxLength(64).IsRequired();
        });

        modelBuilder.Entity<RolePermission>(b =>
        {
            b.HasKey(x => new { x.RoleId, x.PermissionId });
            b.HasOne(x => x.Role).WithMany(x => x.RolePermissions).HasForeignKey(x => x.RoleId);
            b.HasOne(x => x.Permission).WithMany(x => x.RolePermissions).HasForeignKey(x => x.PermissionId);
        });

        // User & UserRole
        modelBuilder.Entity<User>(b =>
        {
            b.HasIndex(x => x.Username).IsUnique();
            b.HasIndex(x => x.Email).IsUnique();
            b.HasIndex(x => x.EmployeeNumber).IsUnique();
            b.Property(x => x.Username).HasMaxLength(80).IsRequired();
            b.Property(x => x.Email).HasMaxLength(150).IsRequired();
            b.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            b.Property(x => x.PhoneNumber).HasMaxLength(32);

            b.HasOne(x => x.JobLevel).WithMany().HasForeignKey(x => x.JobLevelId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.PrimaryOrgUnit).WithMany().HasForeignKey(x => x.PrimaryOrgUnitId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.DirectSupervisor).WithMany().HasForeignKey(x => x.DirectSupervisorId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.AvatarDmsFile).WithMany().HasForeignKey(x => x.AvatarDmsFileId).OnDelete(DeleteBehavior.SetNull);
            b.HasOne(x => x.SignatureDmsFile).WithMany().HasForeignKey(x => x.SignatureDmsFileId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<UserRole>(b =>
        {
            b.HasKey(x => new { x.UserId, x.RoleId });
            b.HasOne(x => x.User).WithMany(x => x.UserRoles).HasForeignKey(x => x.UserId);
            b.HasOne(x => x.Role).WithMany(x => x.UserRoles).HasForeignKey(x => x.RoleId);
        });

        // DocumentType & SubCategory
        modelBuilder.Entity<DocumentType>(b =>
        {
            b.HasIndex(x => x.Code).IsUnique();
            b.Property(x => x.Code).HasMaxLength(32).IsRequired();
            b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        });

        modelBuilder.Entity<DocumentSubCategory>(b =>
        {
            b.HasIndex(x => new { x.DocumentTypeId, x.Code }).IsUnique();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        });

        // DoAPolicyHeader & Detail
        modelBuilder.Entity<DoAPolicyHeader>(b =>
        {
            b.HasIndex(x => x.PolicyNumber).IsUnique();
            b.Property(x => x.PolicyNumber).HasMaxLength(100).IsRequired();
            b.Property(x => x.Title).HasMaxLength(250).IsRequired();
            b.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            b.HasOne(x => x.OfficialAttachmentFile).WithMany().HasForeignKey(x => x.OfficialAttachmentFileId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.ApprovedByUser).WithMany().HasForeignKey(x => x.ApprovedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DoAPolicyDetail>(b =>
        {
            b.Property(x => x.DocumentTypeCode).HasMaxLength(32).IsRequired();
            b.Property(x => x.SubCategoryCode).HasMaxLength(64).IsRequired();
            b.Property(x => x.OrgUnitTypeScope).HasMaxLength(64).IsRequired();
            b.Property(x => x.MinAmount).HasPrecision(18, 2);
            b.Property(x => x.MaxAmount).HasPrecision(18, 2);
            b.Property(x => x.Currency).HasMaxLength(10);
            b.Property(x => x.StepBehavior).HasConversion<string>().HasMaxLength(32);

            b.HasOne(x => x.DoAPolicyHeader).WithMany(x => x.Details).HasForeignKey(x => x.DoAPolicyHeaderId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.JobLevel).WithMany().HasForeignKey(x => x.JobLevelId).OnDelete(DeleteBehavior.Restrict);
        });

        // ApprovalAuthorityAssignment & Delegation
        modelBuilder.Entity<ApprovalAuthorityAssignment>(b =>
        {
            b.Property(x => x.JobLevelCode).HasMaxLength(32).IsRequired();
            b.Property(x => x.DocTypeCode).HasMaxLength(32).IsRequired();
            b.Property(x => x.SubCategoryCode).HasMaxLength(64).IsRequired();
            b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.OrgUnit).WithMany().HasForeignKey(x => x.OrgUnitId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ApprovalDelegation>(b =>
        {
            b.Property(x => x.DocTypeCode).HasMaxLength(32).IsRequired();
            b.HasOne(x => x.DelegatorUser).WithMany().HasForeignKey(x => x.DelegatorUserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.DelegateeUser).WithMany().HasForeignKey(x => x.DelegateeUserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.AttachmentDmsFile).WithMany().HasForeignKey(x => x.AttachmentDmsFileId).OnDelete(DeleteBehavior.SetNull);
        });

        // WorkflowInstance & Step
        modelBuilder.Entity<WorkflowInstance>(b =>
        {
            b.HasIndex(x => x.ReferenceNumber);
            b.Property(x => x.ReferenceNumber).HasMaxLength(100).IsRequired();
            b.Property(x => x.DocTypeCode).HasMaxLength(32).IsRequired();
            b.Property(x => x.SubCategoryCode).HasMaxLength(64).IsRequired();
            b.Property(x => x.TransactionAmount).HasPrecision(18, 2);
            b.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);

            b.HasOne(x => x.RequesterUser).WithMany().HasForeignKey(x => x.RequesterUserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.RequesterOrgUnit).WithMany().HasForeignKey(x => x.RequesterOrgUnitId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.AppliedDoAPolicyHeader).WithMany().HasForeignKey(x => x.AppliedDoAPolicyHeaderId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WorkflowStep>(b =>
        {
            b.Property(x => x.TargetJobLevelCode).HasMaxLength(32).IsRequired();
            b.Property(x => x.PlafondLimitAtStep).HasPrecision(18, 2);
            b.Property(x => x.StepRoleType).HasConversion<string>().HasMaxLength(32);
            b.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);

            b.HasOne(x => x.WorkflowInstance).WithMany(x => x.Steps).HasForeignKey(x => x.WorkflowInstanceId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.ResolvedOrgUnit).WithMany().HasForeignKey(x => x.ResolvedOrgUnitId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.AssignedUser).WithMany().HasForeignKey(x => x.AssignedUserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.ActualActionUser).WithMany().HasForeignKey(x => x.ActualActionUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // DmsFile
        modelBuilder.Entity<DmsFile>(b =>
        {
            b.Property(x => x.OriginalFileName).HasMaxLength(260).IsRequired();
            b.Property(x => x.StoredFileName).HasMaxLength(260).IsRequired();
            b.Property(x => x.ContentType).HasMaxLength(120).IsRequired();
            b.Property(x => x.Sha256Checksum).HasMaxLength(128).IsRequired();
            b.Property(x => x.ModuleCategory).HasConversion<string>().HasMaxLength(64);
        });

        // AuditLog (PostgreSQL jsonb)
        modelBuilder.Entity<AuditLog>(b =>
        {
            b.HasIndex(x => x.CreatedAtUtc);
            b.HasIndex(x => x.EntityName);
            b.Property(x => x.ActionType).HasMaxLength(32).IsRequired();
            b.Property(x => x.EntityName).HasMaxLength(120).IsRequired();
            b.Property(x => x.EntityPrimaryKey).HasMaxLength(120).IsRequired();
            b.Property(x => x.OldValuesJson).HasColumnType("jsonb");
            b.Property(x => x.NewValuesJson).HasColumnType("jsonb");
            b.Property(x => x.AffectedColumnsJson).HasColumnType("jsonb");
        });

        // Sample Transactions: PurchaseOrder & DirectCashPayment
        modelBuilder.Entity<PurchaseOrder>(b =>
        {
            b.HasIndex(x => x.PoNumber).IsUnique();
            b.Property(x => x.PoNumber).HasMaxLength(64).IsRequired();
            b.Property(x => x.SubCategoryCode).HasMaxLength(64).IsRequired();
            b.Property(x => x.TotalAmount).HasPrecision(18, 2);
            b.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);

            b.HasOne(x => x.RequesterUser).WithMany().HasForeignKey(x => x.RequesterUserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.OrgUnit).WithMany().HasForeignKey(x => x.OrgUnitId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.AttachmentDmsFile).WithMany().HasForeignKey(x => x.AttachmentDmsFileId).OnDelete(DeleteBehavior.SetNull);
            b.HasOne(x => x.WorkflowInstance).WithMany().HasForeignKey(x => x.WorkflowInstanceId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PurchaseOrderItem>(b =>
        {
            b.Property(x => x.Quantity).HasPrecision(18, 2);
            b.Property(x => x.UnitPrice).HasPrecision(18, 2);
            b.Property(x => x.SubTotal).HasPrecision(18, 2);
            b.HasOne(x => x.PurchaseOrder).WithMany(x => x.Items).HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DirectCashPayment>(b =>
        {
            b.HasIndex(x => x.DcpNumber).IsUnique();
            b.Property(x => x.DcpNumber).HasMaxLength(64).IsRequired();
            b.Property(x => x.SubCategoryCode).HasMaxLength(64).IsRequired();
            b.Property(x => x.Amount).HasPrecision(18, 2);
            b.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);

            b.HasOne(x => x.RequesterUser).WithMany().HasForeignKey(x => x.RequesterUserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.OrgUnit).WithMany().HasForeignKey(x => x.OrgUnitId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.AttachmentDmsFile).WithMany().HasForeignKey(x => x.AttachmentDmsFileId).OnDelete(DeleteBehavior.SetNull);
            b.HasOne(x => x.WorkflowInstance).WithMany().HasForeignKey(x => x.WorkflowInstanceId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AppMenuItem>(b =>
        {
            b.HasIndex(x => x.MenuCode).IsUnique();
            b.Property(x => x.MenuCode).HasMaxLength(64).IsRequired();
            b.Property(x => x.Title).HasMaxLength(150).IsRequired();
            b.Property(x => x.Subtitle).HasMaxLength(250);
            b.Property(x => x.GroupCategory).HasMaxLength(100).IsRequired();
            b.Property(x => x.IconName).HasMaxLength(64);
            b.Property(x => x.RequiredPermissionCode).HasMaxLength(100);
            b.Property(x => x.AllowedRoleCodesCsv).HasMaxLength(500);
        });

        modelBuilder.Entity<AbacPolicyRule>(b =>
        {
            b.HasIndex(x => x.PolicyCode).IsUnique();
            b.Property(x => x.PolicyCode).HasMaxLength(80).IsRequired();
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.TargetResource).HasMaxLength(80).IsRequired();
            b.Property(x => x.TargetAction).HasMaxLength(64).IsRequired();
            b.Property(x => x.SubjectJobLevelsCsv).HasMaxLength(250);
            b.Property(x => x.SubjectRolesCsv).HasMaxLength(250);
            b.Property(x => x.OrgScopeRule).HasMaxLength(80);
            b.Property(x => x.SubCategoryScope).HasMaxLength(80);
            b.Property(x => x.MaxTransactionAmount).HasPrecision(18, 2);
            b.Property(x => x.Effect).HasMaxLength(32).IsRequired();
        });

        modelBuilder.Entity<AppSettingItem>(b =>
        {
            b.HasIndex(x => x.SettingKey).IsUnique();
            b.Property(x => x.SettingKey).HasMaxLength(100).IsRequired();
            b.Property(x => x.SettingValue).HasMaxLength(1000).IsRequired();
            b.Property(x => x.DisplayName).HasMaxLength(200).IsRequired();
            b.Property(x => x.Category).HasMaxLength(64).IsRequired();
            b.Property(x => x.ValueType).HasMaxLength(32).IsRequired();
        });

        modelBuilder.Entity<AppI18nEntry>(b =>
        {
            b.HasIndex(x => x.TranslationKey).IsUnique();
            b.Property(x => x.TranslationKey).HasMaxLength(120).IsRequired();
            b.Property(x => x.ModuleGroup).HasMaxLength(64).IsRequired();
            b.Property(x => x.TextId).HasMaxLength(1000).IsRequired();
            b.Property(x => x.TextEn).HasMaxLength(1000).IsRequired();
        });

        modelBuilder.Entity<EmailDispatchLog>(b =>
        {
            b.Property(x => x.EventType).HasMaxLength(80).IsRequired();
            b.Property(x => x.ModuleSource).HasMaxLength(64).IsRequired();
            b.Property(x => x.SenderName).HasMaxLength(200).IsRequired();
            b.Property(x => x.SenderEmail).HasMaxLength(150).IsRequired();
            b.Property(x => x.ReplyToEmail).HasMaxLength(150);
            b.Property(x => x.RecipientName).HasMaxLength(200).IsRequired();
            b.Property(x => x.RecipientEmail).HasMaxLength(150).IsRequired();
            b.Property(x => x.CcEmails).HasMaxLength(500);
            b.Property(x => x.Subject).HasMaxLength(350).IsRequired();
            b.Property(x => x.DeliveryStatus).HasMaxLength(64).IsRequired();
            b.Property(x => x.SmtpHostUsed).HasMaxLength(200);
            b.Property(x => x.ReferenceCode).HasMaxLength(120);
        });
    }
}

