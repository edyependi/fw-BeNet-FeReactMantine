using CoreEnterprise.Domain.Entities;
using CoreEnterprise.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CoreEnterprise.Infrastructure.Persistence;

public class ApplicationDbContextInitialiser
{
    private readonly ILogger<ApplicationDbContextInitialiser> _logger;
    private readonly ApplicationDbContext _context;

    public ApplicationDbContextInitialiser(ILogger<ApplicationDbContextInitialiser> logger, ApplicationDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public async Task InitialiseAsync()
    {
        try
        {
            await _context.Database.EnsureCreatedAsync();
            await EnsureIamTablesExistAsync();
            await SeedAsync();
            await SeedMenusAndAbacAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initialising the PostgreSQL database.");
            throw;
        }
    }

    private async Task EnsureIamTablesExistAsync()
    {
        const string sql = @"
CREATE TABLE IF NOT EXISTS ""AppMenuItems"" (
    ""Id"" uuid NOT NULL,
    ""MenuCode"" character varying(64) NOT NULL,
    ""Title"" character varying(150) NOT NULL,
    ""Subtitle"" character varying(250) NOT NULL,
    ""GroupCategory"" character varying(100) NOT NULL,
    ""IconName"" character varying(64) NOT NULL,
    ""SortOrder"" integer NOT NULL,
    ""RequiredPermissionCode"" character varying(100) NOT NULL,
    ""AllowedRoleCodesCsv"" character varying(500) NOT NULL,
    ""IsVisible"" boolean NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedAt"" timestamp with time zone NULL,
    ""UpdatedBy"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT false,
    CONSTRAINT ""PK_AppMenuItems"" PRIMARY KEY (""Id"")
);
ALTER TABLE ""AppMenuItems"" ADD COLUMN IF NOT EXISTS ""UpdatedAt"" timestamp with time zone NULL;
ALTER TABLE ""AppMenuItems"" ADD COLUMN IF NOT EXISTS ""UpdatedBy"" text NULL;
ALTER TABLE ""AppMenuItems"" ADD COLUMN IF NOT EXISTS ""IsDeleted"" boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_AppMenuItems_MenuCode"" ON ""AppMenuItems"" (""MenuCode"");

CREATE TABLE IF NOT EXISTS ""AbacPolicyRules"" (
    ""Id"" uuid NOT NULL,
    ""PolicyCode"" character varying(80) NOT NULL,
    ""Name"" character varying(200) NOT NULL,
    ""Description"" text NULL,
    ""TargetResource"" character varying(80) NOT NULL,
    ""TargetAction"" character varying(64) NOT NULL,
    ""SubjectJobLevelsCsv"" character varying(250) NOT NULL,
    ""MinJobRank"" integer NOT NULL,
    ""MaxJobRank"" integer NOT NULL,
    ""SubjectRolesCsv"" character varying(250) NOT NULL,
    ""OrgScopeRule"" character varying(80) NOT NULL,
    ""SubCategoryScope"" character varying(80) NOT NULL,
    ""MaxTransactionAmount"" numeric(18,2) NULL,
    ""EnforceFourEyesSod"" boolean NOT NULL,
    ""RequireDigitalSignature"" boolean NOT NULL,
    ""Effect"" character varying(32) NOT NULL,
    ""PriorityOrder"" integer NOT NULL,
    ""IsActive"" boolean NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedAt"" timestamp with time zone NULL,
    ""UpdatedBy"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT false,
    CONSTRAINT ""PK_AbacPolicyRules"" PRIMARY KEY (""Id"")
);
ALTER TABLE ""AbacPolicyRules"" ADD COLUMN IF NOT EXISTS ""UpdatedAt"" timestamp with time zone NULL;
ALTER TABLE ""AbacPolicyRules"" ADD COLUMN IF NOT EXISTS ""UpdatedBy"" text NULL;
ALTER TABLE ""AbacPolicyRules"" ADD COLUMN IF NOT EXISTS ""IsDeleted"" boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_AbacPolicyRules_PolicyCode"" ON ""AbacPolicyRules"" (""PolicyCode"");

CREATE TABLE IF NOT EXISTS ""AppSettingItems"" (
    ""Id"" uuid NOT NULL,
    ""SettingKey"" character varying(100) NOT NULL,
    ""SettingValue"" character varying(1000) NOT NULL,
    ""DisplayName"" character varying(200) NOT NULL,
    ""Category"" character varying(64) NOT NULL,
    ""ValueType"" character varying(32) NOT NULL,
    ""Description"" text NULL,
    ""IsSystemCore"" boolean NOT NULL DEFAULT false,
    ""IsPublic"" boolean NOT NULL DEFAULT true,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedAt"" timestamp with time zone NULL,
    ""UpdatedBy"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT false,
    CONSTRAINT ""PK_AppSettingItems"" PRIMARY KEY (""Id"")
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_AppSettingItems_SettingKey"" ON ""AppSettingItems"" (""SettingKey"");

CREATE TABLE IF NOT EXISTS ""AppI18nEntries"" (
    ""Id"" uuid NOT NULL,
    ""TranslationKey"" character varying(120) NOT NULL,
    ""ModuleGroup"" character varying(64) NOT NULL,
    ""TextId"" character varying(1000) NOT NULL,
    ""TextEn"" character varying(1000) NOT NULL,
    ""Description"" text NULL,
    ""IsSystemCore"" boolean NOT NULL DEFAULT true,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedAt"" timestamp with time zone NULL,
    ""UpdatedBy"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT false,
    CONSTRAINT ""PK_AppI18nEntries"" PRIMARY KEY (""Id"")
);
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_AppI18nEntries_TranslationKey"" ON ""AppI18nEntries"" (""TranslationKey"");

CREATE TABLE IF NOT EXISTS ""EmailDispatchLogs"" (
    ""Id"" uuid NOT NULL,
    ""EventType"" character varying(80) NOT NULL,
    ""ModuleSource"" character varying(64) NOT NULL,
    ""SenderName"" character varying(200) NOT NULL,
    ""SenderEmail"" character varying(150) NOT NULL,
    ""ReplyToEmail"" character varying(150) NOT NULL,
    ""RecipientName"" character varying(200) NOT NULL,
    ""RecipientEmail"" character varying(150) NOT NULL,
    ""CcEmails"" character varying(500) NULL,
    ""Subject"" character varying(350) NOT NULL,
    ""BodyText"" text NOT NULL,
    ""DeliveryStatus"" character varying(64) NOT NULL,
    ""SmtpHostUsed"" character varying(200) NOT NULL,
    ""ReferenceCode"" character varying(120) NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedAt"" timestamp with time zone NULL,
    ""UpdatedBy"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT false,
    CONSTRAINT ""PK_EmailDispatchLogs"" PRIMARY KEY (""Id"")
);

ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""PhoneNumber"" character varying(32) NULL;
ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""ValidFrom"" timestamp with time zone NULL;
ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""ValidTo"" timestamp with time zone NULL;
";
        await _context.Database.ExecuteSqlRawAsync(sql);
    }

    public async Task SeedMenusAndAbacAsync()
    {
        if (!await _context.AppMenuItems.AnyAsync())
        {
            _context.AppMenuItems.AddRange(
                new AppMenuItem
                {
                    MenuCode = "simulator",
                    Title = "Dashboard & 3-Axis Simulator",
                    Subtitle = "Simulasi rute & ikhtisar 2-Axis",
                    GroupCategory = "Core Workspace",
                    IconName = "IconRoute",
                    SortOrder = 10,
                    RequiredPermissionCode = "Workflow.Simulate",
                    AllowedRoleCodesCsv = "EMPLOYEE,AUDITOR,SERVICEDESK,MASTER_DATA,SUPERADMIN",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "transactions",
                    Title = "Contoh PO & DCP",
                    Subtitle = "Contoh implementasi transaksi & Approval Inbox",
                    GroupCategory = "Core Workspace",
                    IconName = "IconInbox",
                    SortOrder = 20,
                    RequiredPermissionCode = "Transaction.Read",
                    AllowedRoleCodesCsv = "EMPLOYEE,AUDITOR,SERVICEDESK,MASTER_DATA,SUPERADMIN",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "doa-matrix",
                    Title = "Contextual DoA Policy Matrix",
                    Subtitle = "Daftar SK DoA, Plafond & PDF",
                    GroupCategory = "Governance & Master Data",
                    IconName = "IconFileCertificate",
                    SortOrder = 30,
                    RequiredPermissionCode = "MasterData.Read",
                    AllowedRoleCodesCsv = "EMPLOYEE,AUDITOR,SERVICEDESK,MASTER_DATA,SUPERADMIN",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "approver-matrix",
                    Title = "Org Tree & Approver Matrix",
                    Subtitle = "3-Axis User Assignment & Cuti",
                    GroupCategory = "Governance & Master Data",
                    IconName = "IconUserCheck",
                    SortOrder = 40,
                    RequiredPermissionCode = "MasterData.Read",
                    AllowedRoleCodesCsv = "EMPLOYEE,AUDITOR,SERVICEDESK,MASTER_DATA,SUPERADMIN",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "user-management",
                    Title = "User Management (Master User)",
                    Subtitle = "Kelola UserId, Jabatan & Organisasi",
                    GroupCategory = "Identity & Access (IAM)",
                    IconName = "IconUsers",
                    SortOrder = 50,
                    RequiredPermissionCode = "System.Admin",
                    AllowedRoleCodesCsv = "SUPERADMIN,MASTER_DATA,SERVICEDESK,AUDITOR",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "menu-rbac",
                    Title = "Menu Management (RBAC)",
                    Subtitle = "Konfigurasi Menu, Role & Permission",
                    GroupCategory = "Identity & Access (IAM)",
                    IconName = "IconShieldCog",
                    SortOrder = 60,
                    RequiredPermissionCode = "System.Admin",
                    AllowedRoleCodesCsv = "SUPERADMIN,AUDITOR",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "abac-management",
                    Title = "ABAC Policy Management",
                    Subtitle = "Attribute-Based Access Control",
                    GroupCategory = "Identity & Access (IAM)",
                    IconName = "IconShieldLock",
                    SortOrder = 70,
                    RequiredPermissionCode = "System.Admin",
                    AllowedRoleCodesCsv = "SUPERADMIN,MASTER_DATA,AUDITOR",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "audit-trail",
                    Title = "Audit Trail Inspector (jsonb)",
                    Subtitle = "Immutable Old/New Diff & Forensic Log",
                    GroupCategory = "Compliance & Operations",
                    IconName = "IconShieldCheck",
                    SortOrder = 75,
                    RequiredPermissionCode = "AuditLog.Read",
                    AllowedRoleCodesCsv = "AUDITOR,SUPERADMIN,MASTER_DATA",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "dms-repository",
                    Title = "Document Management (DMS)",
                    Subtitle = "Repositori File, SK PDF & SHA-256",
                    GroupCategory = "Compliance & Operations",
                    IconName = "IconFileDatabase",
                    SortOrder = 80,
                    RequiredPermissionCode = "Transaction.Read",
                    AllowedRoleCodesCsv = "EMPLOYEE,AUDITOR,SERVICEDESK,MASTER_DATA,SUPERADMIN",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "sla-monitor",
                    Title = "SLA & Bottleneck Monitor",
                    Subtitle = "Pantau Antrean Workflow & Overdue SLA",
                    GroupCategory = "Compliance & Operations",
                    IconName = "IconClockExclamation",
                    SortOrder = 85,
                    RequiredPermissionCode = "Servicedesk.Manage",
                    AllowedRoleCodesCsv = "SERVICEDESK,SUPERADMIN,AUDITOR,MASTER_DATA",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "it-servicedesk",
                    Title = "IT Servicedesk Operations",
                    Subtitle = "Unlock Akun, Reset Sandi & Bantuan User",
                    GroupCategory = "Compliance & Operations",
                    IconName = "IconHeadset",
                    SortOrder = 90,
                    RequiredPermissionCode = "Servicedesk.Manage",
                    AllowedRoleCodesCsv = "SERVICEDESK,SUPERADMIN,AUDITOR",
                    IsVisible = true
                },
                new AppMenuItem
                {
                    MenuCode = "app-settings",
                    Title = "Application Settings",
                    Subtitle = "Identitas Aplikasi, Logo & Parameter Sistem",
                    GroupCategory = "Compliance & Operations",
                    IconName = "IconSettings",
                    SortOrder = 95,
                    RequiredPermissionCode = "System.Admin",
                    AllowedRoleCodesCsv = "SUPERADMIN,MASTER_DATA,AUDITOR",
                    IsVisible = true
                }
            );
            await _context.SaveChangesAsync();
        }

        if (!await _context.AbacPolicyRules.AnyAsync())
        {
            _context.AbacPolicyRules.AddRange(
                new AbacPolicyRule
                {
                    PolicyCode = "ABAC-AUDITOR-RO-01",
                    Name = "Global Read-Only Enforcement untuk Role Auditor",
                    Description = "Melarang segala aksi mutasi (CREATE, UPDATE, DELETE, SUBMIT, APPROVE) bagi pengguna dengan atribut Role AUDITOR untuk menjaga independensi audit.",
                    TargetResource = "ALL",
                    TargetAction = "CREATE,UPDATE,DELETE,SUBMIT,APPROVE",
                    SubjectJobLevelsCsv = "ALL",
                    MinJobRank = 0,
                    MaxJobRank = 100,
                    SubjectRolesCsv = "AUDITOR",
                    OrgScopeRule = "ANY_ORG_UNIT",
                    SubCategoryScope = "ALL",
                    MaxTransactionAmount = null,
                    EnforceFourEyesSod = false,
                    RequireDigitalSignature = false,
                    Effect = "DENY",
                    PriorityOrder = 1,
                    IsActive = true
                },
                new AbacPolicyRule
                {
                    PolicyCode = "ABAC-SOD-4EYES-02",
                    Name = "Segregation of Duties (4-Eyes Principle) pada Persetujuan",
                    Description = "Mewajibkan pejabat Approver berbeda dengan Initiator/Requester (RequesterUserId != ApproverUserId) dan memiliki RankOrder >= 20 (Minimal Manager).",
                    TargetResource = "WORKFLOW_APPROVAL",
                    TargetAction = "APPROVE",
                    SubjectJobLevelsCsv = "MGR,AM,GM,DIR,MD",
                    MinJobRank = 20,
                    MaxJobRank = 100,
                    SubjectRolesCsv = "EMPLOYEE,MASTER_DATA,SUPERADMIN",
                    OrgScopeRule = "SAME_ORG_BRANCH_UPWARD",
                    SubCategoryScope = "ALL",
                    MaxTransactionAmount = null,
                    EnforceFourEyesSod = true,
                    RequireDigitalSignature = false,
                    Effect = "ALLOW",
                    PriorityOrder = 10,
                    IsActive = true
                },
                new AbacPolicyRule
                {
                    PolicyCode = "ABAC-PO-ASSET-SPEC-03",
                    Name = "Otorisasi Spesialis PO Sub-Kategori ASSET (Cabang Organisasi)",
                    Description = "Mengizinkan persetujuan PO bertipe ASSET oleh Manager Spesialis Asset / Area Manager pada garis cabang organisasi yang sama hingga batas Rp 75.000.000.",
                    TargetResource = "TRANSACTION_PO",
                    TargetAction = "APPROVE",
                    SubjectJobLevelsCsv = "MGR,AM",
                    MinJobRank = 20,
                    MaxJobRank = 30,
                    SubjectRolesCsv = "EMPLOYEE,MASTER_DATA,SUPERADMIN",
                    OrgScopeRule = "SAME_ORG_BRANCH_UPWARD",
                    SubCategoryScope = "ASSET",
                    MaxTransactionAmount = 75_000_000m,
                    EnforceFourEyesSod = true,
                    RequireDigitalSignature = false,
                    Effect = "ALLOW",
                    PriorityOrder = 20,
                    IsActive = true
                },
                new AbacPolicyRule
                {
                    PolicyCode = "ABAC-DCP-BRANCH-04",
                    Name = "Pembatasan Pengajuan DCP Berdasarkan Unit Organisasi Pengaju",
                    Description = "Karyawan (Staff/Manager) hanya diizinkan membuat dan mengajukan Direct Cash Payment (DCP) pada Unit Organisasi tempatnya bernaung.",
                    TargetResource = "TRANSACTION_DCP",
                    TargetAction = "CREATE,SUBMIT",
                    SubjectJobLevelsCsv = "STAFF,MGR,AM",
                    MinJobRank = 10,
                    MaxJobRank = 40,
                    SubjectRolesCsv = "EMPLOYEE,MASTER_DATA,SUPERADMIN",
                    OrgScopeRule = "SAME_DEPARTMENT_ONLY",
                    SubCategoryScope = "GENERAL",
                    MaxTransactionAmount = 200_000_000m,
                    EnforceFourEyesSod = false,
                    RequireDigitalSignature = false,
                    Effect = "ALLOW",
                    PriorityOrder = 30,
                    IsActive = true
                },
                new AbacPolicyRule
                {
                    PolicyCode = "ABAC-DOA-HO-ADMIN-05",
                    Name = "Aktivasi & Perubahan SK DoA Hanya Oleh MasterData / SuperAdmin",
                    Description = "Membatasi perubahan matriks plafond SK DoA hanya untuk personel berwenang dengan Role MASTER_DATA atau SUPERADMIN.",
                    TargetResource = "DOA_POLICY",
                    TargetAction = "CREATE,UPDATE,DELETE",
                    SubjectJobLevelsCsv = "MGR,AM,GM,DIR,MD",
                    MinJobRank = 20,
                    MaxJobRank = 100,
                    SubjectRolesCsv = "MASTER_DATA,SUPERADMIN",
                    OrgScopeRule = "ANY_ORG_UNIT",
                    SubCategoryScope = "ALL",
                    MaxTransactionAmount = null,
                    EnforceFourEyesSod = false,
                    RequireDigitalSignature = false,
                    Effect = "ALLOW",
                    PriorityOrder = 40,
                    IsActive = true
                }
            );
            await _context.SaveChangesAsync();
        }

        // Migrate legacy combined menus ("audit-dms", "servicedesk-admin") and remove redundant "profile" ("User Account") sidebar item
        var legacyCombinedMenus = await _context.AppMenuItems
            .Where(m => m.MenuCode == "audit-dms" || m.MenuCode == "servicedesk-admin" || m.MenuCode == "profile")
            .ToListAsync();
        if (legacyCombinedMenus.Count > 0)
        {
            _context.AppMenuItems.RemoveRange(legacyCombinedMenus);
            await _context.SaveChangesAsync();
        }

        var requiredDedicatedMenus = new[]
        {
            new AppMenuItem
            {
                MenuCode = "audit-trail",
                Title = "Audit Trail Inspector (jsonb)",
                Subtitle = "Immutable Old/New Diff & Forensic Log",
                GroupCategory = "Compliance & Operations",
                IconName = "IconShieldCheck",
                SortOrder = 75,
                RequiredPermissionCode = "AuditLog.Read",
                AllowedRoleCodesCsv = "AUDITOR,SUPERADMIN,MASTER_DATA",
                IsVisible = true
            },
            new AppMenuItem
            {
                MenuCode = "dms-repository",
                Title = "Document Management (DMS)",
                Subtitle = "Repositori File, SK PDF & SHA-256",
                GroupCategory = "Compliance & Operations",
                IconName = "IconFileDatabase",
                SortOrder = 80,
                RequiredPermissionCode = "Transaction.Read",
                AllowedRoleCodesCsv = "EMPLOYEE,AUDITOR,SERVICEDESK,MASTER_DATA,SUPERADMIN",
                IsVisible = true
            },
            new AppMenuItem
            {
                MenuCode = "sla-monitor",
                Title = "SLA & Bottleneck Monitor",
                Subtitle = "Pantau Antrean Workflow & Overdue SLA",
                GroupCategory = "Compliance & Operations",
                IconName = "IconClockExclamation",
                SortOrder = 85,
                RequiredPermissionCode = "Servicedesk.Manage",
                AllowedRoleCodesCsv = "SERVICEDESK,SUPERADMIN,AUDITOR,MASTER_DATA",
                IsVisible = true
            },
            new AppMenuItem
            {
                MenuCode = "it-servicedesk",
                Title = "IT Servicedesk Operations",
                Subtitle = "Unlock Akun, Reset Sandi & Bantuan User",
                GroupCategory = "Compliance & Operations",
                IconName = "IconHeadset",
                SortOrder = 90,
                RequiredPermissionCode = "Servicedesk.Manage",
                AllowedRoleCodesCsv = "SERVICEDESK,SUPERADMIN,AUDITOR",
                IsVisible = true
            },
            new AppMenuItem
            {
                MenuCode = "app-settings",
                Title = "Application Settings",
                Subtitle = "Identitas Aplikasi, Logo & Parameter Sistem",
                GroupCategory = "Compliance & Operations",
                IconName = "IconSettings",
                SortOrder = 95,
                RequiredPermissionCode = "System.Admin",
                AllowedRoleCodesCsv = "SUPERADMIN,MASTER_DATA,AUDITOR",
                IsVisible = true
            }
        };

        foreach (var menu in requiredDedicatedMenus)
        {
            if (!await _context.AppMenuItems.AnyAsync(m => m.MenuCode == menu.MenuCode))
            {
                _context.AppMenuItems.Add(menu);
            }
        }

        // Ensure "transactions" menu title is updated to "Contoh PO & DCP" on existing databases
        var txMenu = await _context.AppMenuItems.FirstOrDefaultAsync(m => m.MenuCode == "transactions");
        if (txMenu != null && txMenu.Title == "Approval Inbox & Transaksi")
        {
            txMenu.Title = "Contoh PO & DCP";
            txMenu.Subtitle = "Contoh implementasi transaksi & Approval Inbox";
        }

        await _context.SaveChangesAsync();

        if (!await _context.AppSettingItems.AnyAsync())
        {
            _context.AppSettingItems.AddRange(
                new AppSettingItem
                {
                    SettingKey = "APP_TITLE",
                    SettingValue = "CoreEnterprise Portal",
                    DisplayName = "Judul Utama Aplikasi (App Title)",
                    Category = "BRANDING",
                    ValueType = "STRING",
                    Description = "Judul utama yang tampil pada Header atas, Tab Browser, dan halaman Login.",
                    IsSystemCore = true,
                    IsPublic = true
                },
                new AppSettingItem
                {
                    SettingKey = "APP_SUBTITLE",
                    SettingValue = "Otorisasi 2 Dimensi, Contextual DoA Header-Detail & 3-Axis Approver Resolution",
                    DisplayName = "Sub-Judul Aplikasi (App Subtitle)",
                    Category = "BRANDING",
                    ValueType = "STRING",
                    Description = "Sub-judul deskripsi arsitektur yang tampil di bawah judul utama pada Header dan halaman Login.",
                    IsSystemCore = true,
                    IsPublic = true
                },
                new AppSettingItem
                {
                    SettingKey = "APP_LOGO_ICON",
                    SettingValue = "IconShieldLock",
                    DisplayName = "Ikon Logo Aplikasi (App Logo Icon)",
                    Category = "BRANDING",
                    ValueType = "ICON",
                    Description = "Nama ikon Tabler yang digunakan sebagai lambang utama aplikasi di Header dan halaman Login.",
                    IsSystemCore = true,
                    IsPublic = true
                },
                new AppSettingItem
                {
                    SettingKey = "APP_VERSION_BADGE",
                    SettingValue = "Enterprise v1.4.0",
                    DisplayName = "Label Versi Aplikasi (Version Badge)",
                    Category = "BRANDING",
                    ValueType = "STRING",
                    Description = "Label badge rilis versi yang tampil di sebelah judul aplikasi.",
                    IsSystemCore = true,
                    IsPublic = true
                },
                new AppSettingItem
                {
                    SettingKey = "COMPANY_NAME",
                    SettingValue = "PT CoreEnterprise Nusantara Tbk",
                    DisplayName = "Nama Perusahaan / Entitas Hukum",
                    Category = "BRANDING",
                    ValueType = "STRING",
                    Description = "Nama resmi korporasi untuk kop dokumen, laporan audit, dan footer aplikasi.",
                    IsSystemCore = true,
                    IsPublic = true
                },
                new AppSettingItem
                {
                    SettingKey = "SYSTEM_ANNOUNCEMENT_BANNER",
                    SettingValue = "",
                    DisplayName = "Pengumuman Global / Maintenance Banner",
                    Category = "BRANDING",
                    ValueType = "STRING",
                    Description = "Jika diisi, akan menampilkan pita informasi pengumuman di bagian atas halaman bagi seluruh pengguna.",
                    IsSystemCore = true,
                    IsPublic = true
                },
                new AppSettingItem
                {
                    SettingKey = "DEFAULT_CURRENCY",
                    SettingValue = "IDR",
                    DisplayName = "Mata Uang Dasar Transaksi",
                    Category = "WORKFLOW",
                    ValueType = "STRING",
                    Description = "Kode mata uang ISO-4217 standar untuk perhitungan matriks plafond DoA.",
                    IsSystemCore = true,
                    IsPublic = true
                },
                new AppSettingItem
                {
                    SettingKey = "WORKFLOW_DEFAULT_SLA_HOURS",
                    SettingValue = "24",
                    DisplayName = "Target SLA Default Persetujuan (Jam)",
                    Category = "WORKFLOW",
                    ValueType = "NUMBER",
                    Description = "Batas waktu standar (jam) untuk setiap tahapan persetujuan sebelum ditandai OVERDUE.",
                    IsSystemCore = false,
                    IsPublic = false
                },
                new AppSettingItem
                {
                    SettingKey = "WORKFLOW_AUTO_REMINDER_HOURS",
                    SettingValue = "4",
                    DisplayName = "Interval Pengingat SLA Otomatis (Jam)",
                    Category = "WORKFLOW",
                    ValueType = "NUMBER",
                    Description = "Jeda waktu pengiriman notifikasi pengingat sebelum batas SLA berakhir.",
                    IsSystemCore = false,
                    IsPublic = false
                },
                new AppSettingItem
                {
                    SettingKey = "SECURITY_ACCESS_TOKEN_MINUTES",
                    SettingValue = "25",
                    DisplayName = "Masa Berlaku Access Token JWT (Menit)",
                    Category = "SECURITY",
                    ValueType = "NUMBER",
                    Description = "Durasi hidup short-lived JWT sebelum dirotasi melalui HttpOnly Refresh Token Cookie.",
                    IsSystemCore = false,
                    IsPublic = false
                },
                new AppSettingItem
                {
                    SettingKey = "DMS_MAX_UPLOAD_MB",
                    SettingValue = "25",
                    DisplayName = "Batas Ukuran Maksimal Unggahan File DMS (MB)",
                    Category = "DMS",
                    ValueType = "NUMBER",
                    Description = "Ukuran maksimum berkas PDF SK Direksi dan lampiran transaksi yang diizinkan diunggah ke DMS.",
                    IsSystemCore = false,
                    IsPublic = false
                }
            );
            await _context.SaveChangesAsync();
        }

        // Pastikan parameter Akun Email Admin Aplikasi (EMAIL) tersedia untuk notifikasi Servicedesk & Transaksi
        var defaultEmailSettings = new List<AppSettingItem>
        {
            new AppSettingItem
            {
                SettingKey = "ADMIN_SENDER_EMAIL",
                SettingValue = "noreply-admin@coreenterprise.co.id",
                DisplayName = "Alamat Email Admin Aplikasi (Sender Address)",
                Category = "EMAIL",
                ValueType = "EMAIL",
                Description = "Alamat email pengirim resmi untuk seluruh notifikasi keamanan IT Servicedesk (Lock/Unlock/Reset Sandi) dan persetujuan transaksi.",
                IsSystemCore = true,
                IsPublic = true
            },
            new AppSettingItem
            {
                SettingKey = "ADMIN_SENDER_NAME",
                SettingValue = "CoreEnterprise System Administrator",
                DisplayName = "Nama Tampilan Pengirim Email Admin",
                Category = "EMAIL",
                ValueType = "STRING",
                Description = "Nama pengirim (From Name) yang tercantum pada tajuk email resmi aplikasi.",
                IsSystemCore = true,
                IsPublic = true
            },
            new AppSettingItem
            {
                SettingKey = "ADMIN_SUPPORT_REPLY_TO",
                SettingValue = "it-servicedesk@coreenterprise.co.id",
                DisplayName = "Alamat Email Reply-To / Bantuan IT Servicedesk",
                Category = "EMAIL",
                ValueType = "EMAIL",
                Description = "Alamat email tujuan balasan apabila pengguna membutuhkan klarifikasi terkait penguncian akun atau transaksi.",
                IsSystemCore = true,
                IsPublic = true
            },
            new AppSettingItem
            {
                SettingKey = "EMAIL_CC_SECURITY_AUDIT",
                SettingValue = "security-audit@coreenterprise.co.id",
                DisplayName = "Alamat CC Audit Keamanan & Kepatuhan (Opsional)",
                Category = "EMAIL",
                ValueType = "EMAIL",
                Description = "Alamat email tim kepatuhan/audit yang menerima salinan (CC) pemberitahuan perubahan status akun dan reset sandi.",
                IsSystemCore = true,
                IsPublic = false
            },
            new AppSettingItem
            {
                SettingKey = "SMTP_HOST",
                SettingValue = "smtp.coreenterprise.co.id",
                DisplayName = "Host Server SMTP Korporat",
                Category = "EMAIL",
                ValueType = "STRING",
                Description = "Alamat server relay SMTP korporat untuk pengiriman email keluar.",
                IsSystemCore = true,
                IsPublic = false
            },
            new AppSettingItem
            {
                SettingKey = "SMTP_PORT",
                SettingValue = "587",
                DisplayName = "Port Server SMTP (587 STARTTLS / 465 SSL)",
                Category = "EMAIL",
                ValueType = "NUMBER",
                Description = "Nomor port koneksi TCP untuk pengiriman email melalui protokol SMTP.",
                IsSystemCore = true,
                IsPublic = false
            },
            new AppSettingItem
            {
                SettingKey = "SMTP_USERNAME",
                SettingValue = "noreply-admin@coreenterprise.co.id",
                DisplayName = "Username Autentikasi Akun Email Admin",
                Category = "EMAIL",
                ValueType = "STRING",
                Description = "Akun kredensial autentikasi SMTP untuk pengirim email sistem.",
                IsSystemCore = true,
                IsPublic = false
            },
            new AppSettingItem
            {
                SettingKey = "SMTP_USE_SSL",
                SettingValue = "true",
                DisplayName = "Gunakan Enkripsi STARTTLS / SSL pada SMTP",
                Category = "EMAIL",
                ValueType = "BOOLEAN",
                Description = "Mengaktifkan saluran terenkripsi TLS/SSL saat menghubungkan aplikasi ke server SMTP.",
                IsSystemCore = true,
                IsPublic = false
            },
            new AppSettingItem
            {
                SettingKey = "EMAIL_NOTIFICATION_ENABLED",
                SettingValue = "true",
                DisplayName = "Status Aktif Pengiriman Email Notifikasi Global",
                Category = "EMAIL",
                ValueType = "BOOLEAN",
                Description = "Saklar utama untuk mengaktifkan/menonaktifkan pengiriman email otomatis pada operasional IT Servicedesk dan modul Transaksi.",
                IsSystemCore = true,
                IsPublic = true
            }
        };

        var existingSettingKeys = await _context.AppSettingItems
            .Select(x => x.SettingKey.ToUpper())
            .ToListAsync();

        var missingEmailSettings = defaultEmailSettings
            .Where(d => !existingSettingKeys.Contains(d.SettingKey.ToUpper()))
            .ToList();

        if (missingEmailSettings.Count > 0)
        {
            _context.AppSettingItems.AddRange(missingEmailSettings);
            await _context.SaveChangesAsync();
        }

        if (!await _context.AppI18nEntries.AnyAsync())
        {
            _context.AppI18nEntries.AddRange(
                // 1. HEADER & BRANDING
                new AppI18nEntry
                {
                    TranslationKey = "appTitle",
                    ModuleGroup = "HEADER_BRANDING",
                    TextId = "CoreEnterprise Portal",
                    TextEn = "CoreEnterprise Portal",
                    Description = "Judul utama pada Top Header dan halaman Login.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "appSubtitle",
                    ModuleGroup = "HEADER_BRANDING",
                    TextId = "Otorisasi 2 Dimensi, Contextual DoA Header-Detail & 3-Axis Approver Resolution",
                    TextEn = "2-Axis Authorization, Contextual DoA Header-Detail & 3-Axis Approver Resolution",
                    Description = "Sub-judul deskripsi arsitektur di bawah judul utama.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "searchMenuPlaceholder",
                    ModuleGroup = "HEADER_BRANDING",
                    TextId = "Cari menu navigasi...",
                    TextEn = "Search navigation menu...",
                    Description = "Placeholder kotak pencarian menu di Sidebar kiri.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "myProfileBtn",
                    ModuleGroup = "HEADER_BRANDING",
                    TextId = "Profil Saya",
                    TextEn = "My Profile",
                    Description = "Tombol akses profil cepat pada kartu sesi di bawah Sidebar.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "signOutBtn",
                    ModuleGroup = "HEADER_BRANDING",
                    TextId = "Keluar",
                    TextEn = "Sign Out",
                    Description = "Tombol keluar sesi pada kartu sesi di bawah Sidebar.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "pendingDocsBtn",
                    ModuleGroup = "HEADER_BRANDING",
                    TextId = "Dokumen Menunggu Approval Anda",
                    TextEn = "Documents Awaiting Your Approval",
                    Description = "Label tombol pengingat antrean Inbox pada Page Header Banner.",
                    IsSystemCore = true
                },
                // 2. SIDEBAR MENU TITLES (menu.<code >.title)
                new AppI18nEntry
                {
                    TranslationKey = "menu.simulator.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "Dashboard & 3-Axis Simulator",
                    TextEn = "Dashboard & 3-Axis Simulator",
                    Description = "Judul menu Dashboard & Simulator Rute.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.transactions.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "Contoh PO & DCP",
                    TextEn = "Sample PO & DCP",
                    Description = "Judul menu contoh transaksi PO, DCP & Antrean Inbox.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.doa-matrix.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "Contextual DoA Policy Matrix",
                    TextEn = "Contextual DoA Policy Matrix",
                    Description = "Judul menu Matriks SK DoA Header-Detail.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.approver-matrix.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "Org Tree & Approver Matrix",
                    TextEn = "Org Tree & Approver Matrix",
                    Description = "Judul menu Pohon Organisasi & Penugasan Approver.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.user-management.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "User Management (Master User)",
                    TextEn = "User Management (Master User)",
                    Description = "Judul menu pengelolaan Master UserId.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.menu-rbac.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "Menu Management (RBAC)",
                    TextEn = "Menu Management (RBAC)",
                    Description = "Judul menu konfigurasi Menu, Role & Permission.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.abac-management.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "ABAC Policy Management",
                    TextEn = "ABAC Policy Management",
                    Description = "Judul menu kebijakan Attribute-Based Access Control.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.audit-trail.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "Audit Trail Inspector (jsonb)",
                    TextEn = "Audit Trail Inspector (jsonb)",
                    Description = "Judul menu inspeksi jejak audit PostgreSQL jsonb.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.dms-repository.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "Document Management (DMS)",
                    TextEn = "Document Management (DMS)",
                    Description = "Judul menu repositori dokumen DMS & SHA-256.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.sla-monitor.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "SLA & Bottleneck Monitor",
                    TextEn = "SLA & Bottleneck Monitor",
                    Description = "Judul menu pemantauan SLA & bottleneck persetujuan.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.it-servicedesk.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "IT Servicedesk Operations",
                    TextEn = "IT Servicedesk Operations",
                    Description = "Judul menu operasional bantuan akun & reset sandi.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.app-settings.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "Application Settings",
                    TextEn = "Application Settings",
                    Description = "Judul menu pengaturan identitas aplikasi & kamus i18n.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "menu.profile.title",
                    ModuleGroup = "MENU_NAVIGATION",
                    TextId = "Profil, Foto 1:1 & Paraf Digital",
                    TextEn = "Profile, 1:1 Photo & Digital Paraf",
                    Description = "Judul menu profil pengguna, foto avatar, dan paraf.",
                    IsSystemCore = true
                },
                // 3. DASHBOARD KPI & SIMULATOR
                new AppI18nEntry
                {
                    TranslationKey = "kpiInboxTitle",
                    ModuleGroup = "DASHBOARD_KPI",
                    TextId = "Approval Inbox Anda",
                    TextEn = "Your Approval Inbox",
                    Description = "Judul kartu KPI pertama pada halaman Dashboard.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "kpiAxis1Title",
                    ModuleGroup = "DASHBOARD_KPI",
                    TextId = "Otoritas Sumbu 1 (Rank)",
                    TextEn = "Axis 1 Authority (Rank)",
                    Description = "Judul kartu KPI kedua pada halaman Dashboard.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "kpiAxis2Title",
                    ModuleGroup = "DASHBOARD_KPI",
                    TextId = "Hak Akses Sumbu 2 (RBAC)",
                    TextEn = "Axis 2 Access (RBAC)",
                    Description = "Judul kartu KPI ketiga pada halaman Dashboard.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "kpiComplianceTitle",
                    ModuleGroup = "DASHBOARD_KPI",
                    TextId = "Status Kepatuhan & DB",
                    TextEn = "Compliance & DB Status",
                    Description = "Judul kartu KPI keempat pada halaman Dashboard.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "simCardTitle",
                    ModuleGroup = "WORKFLOW_SIMULATOR",
                    TextId = "3-Axis Workflow Route Simulator & Pre-Submit Dry-Run",
                    TextEn = "3-Axis Workflow Route Simulator & Pre-Submit Dry-Run",
                    Description = "Judul kartu utama 3-Axis Workflow Route Simulator.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "axis1Label",
                    ModuleGroup = "WORKFLOW_SIMULATOR",
                    TextId = "Sumbu 1: Level Jabatan (Vertikal)",
                    TextEn = "Axis 1: Job Level (Vertical Hierarchy)",
                    Description = "Judul kartu daftar level jabatan struktural.",
                    IsSystemCore = true
                },
                new AppI18nEntry
                {
                    TranslationKey = "axis2Label",
                    ModuleGroup = "WORKFLOW_SIMULATOR",
                    TextId = "Sumbu 2: Peran Sistem (Horizontal)",
                    TextEn = "Axis 2: System Role (Horizontal RBAC)",
                    Description = "Judul kartu daftar peran sistem RBAC.",
                    IsSystemCore = true
                }
            );
            await _context.SaveChangesAsync();
        }
        else
        {
            var txI18n = await _context.AppI18nEntries.FirstOrDefaultAsync(x => x.TranslationKey == "menu.transactions.title");
            if (txI18n != null && txI18n.TextId == "Approval Inbox & Transaksi")
            {
                txI18n.TextId = "Contoh PO & DCP";
                txI18n.TextEn = "Sample PO & DCP";
                await _context.SaveChangesAsync();
            }
        }

        // Backfill PhoneNumber, ValidFrom, ValidTo untuk pengguna lama yang belum memiliki nilai
        var usersMissingContactOrValidity = await _context.Users
            .Where(u => u.PhoneNumber == null || u.ValidFrom == null || u.ValidTo == null)
            .OrderBy(u => u.EmployeeNumber)
            .ToListAsync();

        if (usersMissingContactOrValidity.Count > 0)
        {
            var defaultValidFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var defaultValidTo = new DateTime(2028, 12, 31, 23, 59, 59, DateTimeKind.Utc);
            int idx = 1;
            foreach (var u in usersMissingContactOrValidity)
            {
                if (string.IsNullOrWhiteSpace(u.PhoneNumber))
                {
                    u.PhoneNumber = $"+62 811-9001-{1000 + idx:D4}";
                }
                if (!u.ValidFrom.HasValue)
                {
                    u.ValidFrom = defaultValidFrom;
                }
                if (!u.ValidTo.HasValue)
                {
                    u.ValidTo = defaultValidTo;
                }
                idx++;
            }
            await _context.SaveChangesAsync();
        }
    }

    public async Task SeedAsync()
    {
        if (await _context.JobLevels.AnyAsync())
        {
            // Ensure servicedesk user exists even on previously seeded databases
            if (!await _context.Users.AnyAsync(u => u.Username == "servicedesk"))
            {
                var jlStaffExisting = await _context.JobLevels.FirstAsync(j => j.Code == "STAFF");
                var orgHoExisting = await _context.OrganizationUnits.FirstAsync(o => o.Code == "HO");
                var roleSdExisting = await _context.Roles.FirstAsync(r => r.Code == "SERVICEDESK");

                var sdUser = new User
                {
                    EmployeeNumber = "EMP-8001",
                    Username = "servicedesk",
                    Email = "servicedesk@coreenterprise.local",
                    FullName = "Rizky Pratama (IT Servicedesk Support)",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    JobLevelId = jlStaffExisting.Id,
                    PrimaryOrgUnitId = orgHoExisting.Id
                };
                _context.Users.Add(sdUser);
                _context.UserRoles.Add(new UserRole { UserId = sdUser.Id, RoleId = roleSdExisting.Id });
                await _context.SaveChangesAsync();
            }
            return;
        }

        _logger.LogInformation("Seeding initial 2-Axis Auth, Organization Tree, and 3-Axis DoA Matrix data...");

        // 1. Axis 1: JobLevels (Rank 10..60)
        var jlStaff = new JobLevel { Code = "STAFF", Name = "Staff", RankOrder = 10, Description = "Operational Staff / Initiator" };
        var jlMgr = new JobLevel { Code = "MGR", Name = "Manager", RankOrder = 20, Description = "Department Manager" };
        var jlAm = new JobLevel { Code = "AM", Name = "Area Manager", RankOrder = 30, Description = "Area / Estate Manager" };
        var jlGm = new JobLevel { Code = "GM", Name = "General Manager", RankOrder = 40, Description = "Regional / Division General Manager" };
        var jlDir = new JobLevel { Code = "DIR", Name = "Director", RankOrder = 50, Description = "Board Director" };
        var jlMd = new JobLevel { Code = "MD", Name = "Managing Director", RankOrder = 60, Description = "Managing Director (Top Plafond)" };

        _context.JobLevels.AddRange(jlStaff, jlMgr, jlAm, jlGm, jlDir, jlMd);

        // 2. OrganizationUnits Tree (HO -> Regional -> Area -> Department)
        var orgHo = new OrganizationUnit { Code = "HO", Name = "Head Office Jakarta", UnitType = OrganizationUnitType.COMPANY };
        var orgRegSum = new OrganizationUnit { Code = "REG-SUM", Name = "Regional Sumatera", UnitType = OrganizationUnitType.REGIONAL, ParentUnitId = orgHo.Id };
        var orgAreaSum1 = new OrganizationUnit { Code = "AREA-SUM1", Name = "Area Sumatera 1", UnitType = OrganizationUnitType.AREA, ParentUnitId = orgRegSum.Id };
        var orgDeptAgro = new OrganizationUnit { Code = "DEPT-AGRO", Name = "Department Agronomy", UnitType = OrganizationUnitType.DEPARTMENT, ParentUnitId = orgAreaSum1.Id };
        var orgDeptMill = new OrganizationUnit { Code = "DEPT-MILL", Name = "Department Mill & Engineering", UnitType = OrganizationUnitType.DEPARTMENT, ParentUnitId = orgAreaSum1.Id };

        _context.OrganizationUnits.AddRange(orgHo, orgRegSum, orgAreaSum1, orgDeptAgro, orgDeptMill);

        // 3. Axis 2: System Roles & Permissions
        var permissions = new List<Permission>
        {
            new() { Code = "Transaction.Read", Module = "Transaction", Description = "Read PO & DCP transactions" },
            new() { Code = "Transaction.Create", Module = "Transaction", Description = "Create and submit PO & DCP" },
            new() { Code = "Workflow.Approve", Module = "Workflow", Description = "Execute workflow approval actions" },
            new() { Code = "Workflow.Simulate", Module = "Workflow", Description = "Run 3-Axis workflow route simulator" },
            new() { Code = "MasterData.Read", Module = "MasterData", Description = "Read Organization, DoA & Approver Matrix" },
            new() { Code = "MasterData.Write", Module = "MasterData", Description = "Configure Organization, DoA Policy & Approver Matrix" },
            new() { Code = "AuditLog.Read", Module = "Audit", Description = "Inspect immutable audit logs and download SK PDF" },
            new() { Code = "Servicedesk.Manage", Module = "Servicedesk", Description = "Reset password, unlock users, inspect bottlenecks" },
            new() { Code = "System.Admin", Module = "System", Description = "Full technical RBAC, DMS, and system administration" }
        };
        _context.Permissions.AddRange(permissions);

        var roleEmployee = new Role { Code = "EMPLOYEE", Name = "Employee / Standard User", Description = "Default employee access for transactions and inbox" };
        var roleAuditor = new Role { Code = "AUDITOR", Name = "Internal / External Auditor", Description = "Global Read-Only access to transactions, SK DoA PDF, and Audit Trail" };
        var roleServicedesk = new Role { Code = "SERVICEDESK", Name = "IT Servicedesk", Description = "Operational user support and workflow bottleneck inspection" };
        var roleMasterData = new Role { Code = "MASTER_DATA", Name = "Team Master Data", Description = "Manages Organization Tree, DoA Header-Detail Matrix, and Approver Assignments" };
        var roleSuperAdmin = new Role { Code = "SUPERADMIN", Name = "Super Administrator", Description = "Technical system configuration and RBAC management" };

        _context.Roles.AddRange(roleEmployee, roleAuditor, roleServicedesk, roleMasterData, roleSuperAdmin);

        void MapPermissions(Role role, params string[] codes)
        {
            foreach (var code in codes)
            {
                var perm = permissions.First(p => p.Code == code);
                _context.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm.Id });
            }
        }

        MapPermissions(roleEmployee, "Transaction.Read", "Transaction.Create", "Workflow.Approve", "Workflow.Simulate", "MasterData.Read");
        MapPermissions(roleAuditor, "Transaction.Read", "MasterData.Read", "AuditLog.Read", "Workflow.Simulate");
        MapPermissions(roleServicedesk, "Transaction.Read", "MasterData.Read", "Servicedesk.Manage", "Workflow.Simulate");
        MapPermissions(roleMasterData, "MasterData.Read", "MasterData.Write", "Workflow.Simulate", "Transaction.Read");
        MapPermissions(roleSuperAdmin, permissions.Select(p => p.Code).ToArray());

        // 4. Users (Default password: Password123!)
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Password123!");

        var userSuperAdmin = new User
        {
            EmployeeNumber = "EMP-0001",
            Username = "admin",
            Email = "admin@coreenterprise.local",
            FullName = "Budi Santoso (SuperAdmin & MasterData)",
            PasswordHash = passwordHash,
            JobLevelId = jlAm.Id,
            PrimaryOrgUnitId = orgHo.Id
        };

        var user01MgrAsset = new User
        {
            EmployeeNumber = "EMP-1001",
            Username = "user01",
            Email = "user01.mgr.mill@coreenterprise.local",
            FullName = "User01 - Hendra Wijaya (Mgr Mill / Asset Specialist)",
            PasswordHash = passwordHash,
            JobLevelId = jlMgr.Id,
            PrimaryOrgUnitId = orgDeptMill.Id
        };

        var user02MgrAgro = new User
        {
            EmployeeNumber = "EMP-1002",
            Username = "user02",
            Email = "user02.mgr.agro@coreenterprise.local",
            FullName = "User02 - Rina Kusuma (Mgr Agronomy / AgroChem Specialist)",
            PasswordHash = passwordHash,
            JobLevelId = jlMgr.Id,
            PrimaryOrgUnitId = orgDeptAgro.Id
        };

        var user03StaffAgro = new User
        {
            EmployeeNumber = "EMP-1003",
            Username = "user03",
            Email = "user03.staff.agro@coreenterprise.local",
            FullName = "User03 - Andi Pratama (Staff Dept. Agronomy)",
            PasswordHash = passwordHash,
            JobLevelId = jlStaff.Id,
            PrimaryOrgUnitId = orgDeptAgro.Id,
            DirectSupervisorId = user02MgrAgro.Id
        };

        var user04StaffMill = new User
        {
            EmployeeNumber = "EMP-1004",
            Username = "user04",
            Email = "user04.staff.mill@coreenterprise.local",
            FullName = "User04 - Dedi Kurniawan (Staff Dept. Mill)",
            PasswordHash = passwordHash,
            JobLevelId = jlStaff.Id,
            PrimaryOrgUnitId = orgDeptMill.Id,
            DirectSupervisorId = user01MgrAsset.Id
        };

        var userAreaMgr = new User
        {
            EmployeeNumber = "EMP-2001",
            Username = "am.sum1",
            Email = "am.sum1@coreenterprise.local",
            FullName = "Edy Ependi (Area Manager Sumatera 1)",
            PasswordHash = passwordHash,
            JobLevelId = jlAm.Id,
            PrimaryOrgUnitId = orgAreaSum1.Id
        };

        var userDirector = new User
        {
            EmployeeNumber = "EMP-3001",
            Username = "director",
            Email = "director@coreenterprise.local",
            FullName = "Irwan Setiawan (Operations Director)",
            PasswordHash = passwordHash,
            JobLevelId = jlDir.Id,
            PrimaryOrgUnitId = orgHo.Id
        };

        var userAuditor = new User
        {
            EmployeeNumber = "EMP-9001",
            Username = "auditor",
            Email = "auditor@coreenterprise.local",
            FullName = "Siti Rahma (Internal Auditor)",
            PasswordHash = passwordHash,
            JobLevelId = jlMgr.Id,
            PrimaryOrgUnitId = orgHo.Id
        };

        _context.Users.AddRange(userSuperAdmin, user01MgrAsset, user02MgrAgro, user03StaffAgro, user04StaffMill, userAreaMgr, userDirector, userAuditor);

        _context.UserRoles.AddRange(
            new UserRole { UserId = userSuperAdmin.Id, RoleId = roleSuperAdmin.Id },
            new UserRole { UserId = userSuperAdmin.Id, RoleId = roleMasterData.Id },
            new UserRole { UserId = userSuperAdmin.Id, RoleId = roleEmployee.Id },
            new UserRole { UserId = user01MgrAsset.Id, RoleId = roleEmployee.Id },
            new UserRole { UserId = user02MgrAgro.Id, RoleId = roleEmployee.Id },
            new UserRole { UserId = user03StaffAgro.Id, RoleId = roleEmployee.Id },
            new UserRole { UserId = user04StaffMill.Id, RoleId = roleEmployee.Id },
            new UserRole { UserId = userAreaMgr.Id, RoleId = roleEmployee.Id },
            new UserRole { UserId = userAreaMgr.Id, RoleId = roleMasterData.Id },
            new UserRole { UserId = userDirector.Id, RoleId = roleEmployee.Id },
            new UserRole { UserId = userAuditor.Id, RoleId = roleAuditor.Id }
        );

        // 5. DocumentTypes & SubCategories
        var docPo = new DocumentType { Code = "PO", Name = "Purchase Order", HasFinancialPlafond = true };
        var docDcp = new DocumentType { Code = "DCP", Name = "Direct Cash Payment", HasFinancialPlafond = true };
        _context.DocumentTypes.AddRange(docPo, docDcp);

        _context.DocumentSubCategories.AddRange(
            new DocumentSubCategory { DocumentTypeId = docPo.Id, Code = "ASSET", Name = "Fixed Asset & Machinery" },
            new DocumentSubCategory { DocumentTypeId = docPo.Id, Code = "AGRO_CHEM", Name = "Agro Chemical & Fertilizer" },
            new DocumentSubCategory { DocumentTypeId = docPo.Id, Code = "GENERAL", Name = "General Supplies" },
            new DocumentSubCategory { DocumentTypeId = docDcp.Id, Code = "GENERAL", Name = "General Operational Cash" }
        );

        // 6. Seed Official SK PDF file in DmsFiles + Active DoAPolicyHeader & Details (PO vs DCP Plafond)
        var seededSkDmsFile = new DmsFile
        {
            OriginalFileName = "SK-DIR-2026-XI-004_Matriks_DoA_PO_DCP.pdf",
            StoredFileName = "seeded_sk_dir_2026_xi_004.pdf",
            StoragePath = "doa-policies/seeded_sk_dir_2026_xi_004.pdf",
            ContentType = "application/pdf",
            FileSizeInBytes = 128450,
            Sha256Checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            ModuleCategory = DmsModuleCategory.DOA_POLICY_SK,
            IsPublic = false
        };
        _context.DmsFiles.Add(seededSkDmsFile);

        var doaHeader = new DoAPolicyHeader
        {
            PolicyNumber = "SK-DIR/2026/XI/004",
            Title = "Matriks Kewenangan Persetujuan PO & DCP Tahun 2026",
            EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            Version = 1,
            Status = DoAPolicyStatus.ACTIVE,
            OfficialAttachmentFileId = seededSkDmsFile.Id,
            Remarks = "SK Resmi Direksi untuk batas plafond kontekstual PO vs DCP.",
            ApprovedByUserId = userDirector.Id,
            ApprovedAt = DateTime.UtcNow
        };
        _context.DoAPolicyHeaders.Add(doaHeader);

        // Contextual Plafond Details:
        // PO: Manager = 50jt, Area Manager = 75jt, Director = 100jt+
        // DCP: Manager = 75jt, Area Manager = 150jt, Director = 200jt+
        _context.DoAPolicyDetails.AddRange(
            new DoAPolicyDetail
            {
                DoAPolicyHeaderId = doaHeader.Id,
                DocumentTypeCode = "PO",
                SubCategoryCode = "ALL",
                OrgUnitTypeScope = "ALL",
                JobLevelId = jlMgr.Id,
                MinAmount = 0,
                MaxAmount = 50_000_000m,
                StepBehavior = DoAStepBehavior.FINAL_IF_SUFFICIENT,
                SlaHours = 24
            },
            new DoAPolicyDetail
            {
                DoAPolicyHeaderId = doaHeader.Id,
                DocumentTypeCode = "PO",
                SubCategoryCode = "ALL",
                OrgUnitTypeScope = "ALL",
                JobLevelId = jlAm.Id,
                MinAmount = 50_000_000.01m,
                MaxAmount = 75_000_000m,
                StepBehavior = DoAStepBehavior.FINAL_IF_SUFFICIENT,
                SlaHours = 24
            },
            new DoAPolicyDetail
            {
                DoAPolicyHeaderId = doaHeader.Id,
                DocumentTypeCode = "PO",
                SubCategoryCode = "ALL",
                OrgUnitTypeScope = "ALL",
                JobLevelId = jlDir.Id,
                MinAmount = 75_000_000.01m,
                MaxAmount = 100_000_000m,
                StepBehavior = DoAStepBehavior.FINAL_IF_SUFFICIENT,
                SlaHours = 48
            },
            new DoAPolicyDetail
            {
                DoAPolicyHeaderId = doaHeader.Id,
                DocumentTypeCode = "DCP",
                SubCategoryCode = "ALL",
                OrgUnitTypeScope = "ALL",
                JobLevelId = jlMgr.Id,
                MinAmount = 0,
                MaxAmount = 75_000_000m,
                StepBehavior = DoAStepBehavior.FINAL_IF_SUFFICIENT,
                SlaHours = 24
            },
            new DoAPolicyDetail
            {
                DoAPolicyHeaderId = doaHeader.Id,
                DocumentTypeCode = "DCP",
                SubCategoryCode = "ALL",
                OrgUnitTypeScope = "ALL",
                JobLevelId = jlAm.Id,
                MinAmount = 75_000_000.01m,
                MaxAmount = 150_000_000m,
                StepBehavior = DoAStepBehavior.FINAL_IF_SUFFICIENT,
                SlaHours = 24
            },
            new DoAPolicyDetail
            {
                DoAPolicyHeaderId = doaHeader.Id,
                DocumentTypeCode = "DCP",
                SubCategoryCode = "ALL",
                OrgUnitTypeScope = "ALL",
                JobLevelId = jlDir.Id,
                MinAmount = 150_000_000.01m,
                MaxAmount = 200_000_000m,
                StepBehavior = DoAStepBehavior.FINAL_IF_SUFFICIENT,
                SlaHours = 48
            }
        );

        // 7. Axis 3: ApprovalAuthorityAssignments (3-Axis Approver Resolution mapping)
        // - PO ASSET at Area/Dept -> User01 (Manager Asset Specialist)
        // - PO AGRO_CHEM at Area/Dept -> User02 (Manager Agro Chemical Specialist)
        // - DCP at DEPT-AGRO -> User02 (Dept Manager Agronomy)
        // - DCP at DEPT-MILL -> User01 (Dept Manager Mill)
        // - All docs at AREA-SUM1 level AM -> userAreaMgr (Edy Ependi)
        // - All docs at HO level DIR -> userDirector (Irwan Setiawan)
        _context.ApprovalAuthorityAssignments.AddRange(
            new ApprovalAuthorityAssignment
            {
                UserId = user01MgrAsset.Id,
                JobLevelCode = "MGR",
                OrgUnitId = orgAreaSum1.Id,
                DocTypeCode = "PO",
                SubCategoryCode = "ASSET",
                PriorityOrder = 1
            },
            new ApprovalAuthorityAssignment
            {
                UserId = user02MgrAgro.Id,
                JobLevelCode = "MGR",
                OrgUnitId = orgAreaSum1.Id,
                DocTypeCode = "PO",
                SubCategoryCode = "AGRO_CHEM",
                PriorityOrder = 1
            },
            new ApprovalAuthorityAssignment
            {
                UserId = user02MgrAgro.Id,
                JobLevelCode = "MGR",
                OrgUnitId = orgDeptAgro.Id,
                DocTypeCode = "ALL",
                SubCategoryCode = "ALL",
                PriorityOrder = 1
            },
            new ApprovalAuthorityAssignment
            {
                UserId = user01MgrAsset.Id,
                JobLevelCode = "MGR",
                OrgUnitId = orgDeptMill.Id,
                DocTypeCode = "ALL",
                SubCategoryCode = "ALL",
                PriorityOrder = 1
            },
            new ApprovalAuthorityAssignment
            {
                UserId = userAreaMgr.Id,
                JobLevelCode = "AM",
                OrgUnitId = orgAreaSum1.Id,
                DocTypeCode = "ALL",
                SubCategoryCode = "ALL",
                PriorityOrder = 1
            },
            new ApprovalAuthorityAssignment
            {
                UserId = userDirector.Id,
                JobLevelCode = "DIR",
                OrgUnitId = orgHo.Id,
                DocTypeCode = "ALL",
                SubCategoryCode = "ALL",
                PriorityOrder = 1
            }
        );

        await _context.SaveChangesAsync();
        _logger.LogInformation("Database seeding completed successfully.");
    }
}

