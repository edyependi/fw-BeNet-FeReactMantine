import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const MENU_TRANSLATIONS: Record<
  'id' | 'en',
  Record<string, { title: string; subtitle: string; group: string }>
> = {
  id: {
    simulator: {
      title: 'Dashboard & 3-Axis Simulator',
      subtitle: 'Simulasi rute & ikhtisar 2-Axis',
      group: 'Core Workspace',
    },
    transactions: {
      title: 'Contoh PO & DCP',
      subtitle: 'Contoh implementasi transaksi & Approval Inbox',
      group: 'Core Workspace',
    },
    'doa-matrix': {
      title: 'Contextual DoA Policy Matrix',
      subtitle: 'Daftar SK DoA, Plafond & PDF',
      group: 'Governance & Master Data',
    },
    'approver-matrix': {
      title: 'Org Tree & Approver Matrix',
      subtitle: '3-Axis User Assignment & Cuti',
      group: 'Governance & Master Data',
    },
    'user-management': {
      title: 'User Management (Master User)',
      subtitle: 'Kelola UserId, Jabatan & Organisasi',
      group: 'Identity & Access (IAM)',
    },
    'menu-rbac': {
      title: 'Menu Management (RBAC)',
      subtitle: 'Konfigurasi Menu, Role & Permission',
      group: 'Identity & Access (IAM)',
    },
    'abac-management': {
      title: 'ABAC Policy Management',
      subtitle: 'Attribute-Based Access Control',
      group: 'Identity & Access (IAM)',
    },
    'audit-trail': {
      title: 'Audit Trail Inspector (jsonb)',
      subtitle: 'Immutable Old/New Diff & Forensic Log',
      group: 'Compliance & Operations',
    },
    'dms-repository': {
      title: 'Document Management (DMS)',
      subtitle: 'Repositori File, SK PDF & SHA-256',
      group: 'Compliance & Operations',
    },
    'sla-monitor': {
      title: 'SLA & Bottleneck Monitor',
      subtitle: 'Pantau Antrean Workflow & Overdue SLA',
      group: 'Compliance & Operations',
    },
    'it-servicedesk': {
      title: 'IT Servicedesk Operations',
      subtitle: 'Unlock Akun, Reset Sandi & Bantuan User',
      group: 'Compliance & Operations',
    },
    'app-settings': {
      title: 'Application Settings',
      subtitle: 'Identitas Aplikasi, Logo & Parameter Sistem',
      group: 'Compliance & Operations',
    },
    profile: {
      title: 'Profil, Foto 1:1 & Paraf Digital',
      subtitle: 'Kelola akun, avatar .webp & paraf',
      group: 'User Account',
    },
  },
  en: {
    simulator: {
      title: 'Dashboard & 3-Axis Simulator',
      subtitle: 'Route dry-run & 2-Axis overview',
      group: 'Core Workspace',
    },
    transactions: {
      title: 'Sample PO & DCP',
      subtitle: 'Sample transaction implementation & Approval Inbox',
      group: 'Core Workspace',
    },
    'doa-matrix': {
      title: 'Contextual DoA Policy Matrix',
      subtitle: 'DoA Decrees, Plafond & PDF DMS',
      group: 'Governance & Master Data',
    },
    'approver-matrix': {
      title: 'Org Tree & Approver Matrix',
      subtitle: '3-Axis User Assignment & Leave Plt',
      group: 'Governance & Master Data',
    },
    'user-management': {
      title: 'User Management (Master User)',
      subtitle: 'Manage UserIds, Ranks & Org Units',
      group: 'Identity & Access (IAM)',
    },
    'menu-rbac': {
      title: 'Menu Management (RBAC)',
      subtitle: 'Configure Menus, Roles & Permissions',
      group: 'Identity & Access (IAM)',
    },
    'abac-management': {
      title: 'ABAC Policy Management',
      subtitle: 'Attribute-Based Access Control',
      group: 'Identity & Access (IAM)',
    },
    'audit-trail': {
      title: 'Audit Trail Inspector (jsonb)',
      subtitle: 'Immutable Old/New Diff & Forensic Log',
      group: 'Compliance & Operations',
    },
    'dms-repository': {
      title: 'Document Management (DMS)',
      subtitle: 'File Repository, SK PDF & SHA-256',
      group: 'Compliance & Operations',
    },
    'sla-monitor': {
      title: 'SLA & Bottleneck Monitor',
      subtitle: 'Track Workflow Queue & Overdue SLA',
      group: 'Compliance & Operations',
    },
    'it-servicedesk': {
      title: 'IT Servicedesk Operations',
      subtitle: 'Account Unlock, Password Reset & Support',
      group: 'Compliance & Operations',
    },
    'app-settings': {
      title: 'Application Settings',
      subtitle: 'App Identity, Logo & System Parameters',
      group: 'Compliance & Operations',
    },
    profile: {
      title: 'Profile, 1:1 Photo & Digital Paraf',
      subtitle: 'Manage account, .webp avatar & signature',
      group: 'User Account',
    },
  },
};

const resources = {
  id: {
    translation: {
      appTitle: 'CoreEnterprise Portal',
      appSubtitle: 'Otorisasi 2 Dimensi, Contextual DoA Header-Detail & 3-Axis Approver Resolution',
      axis1Label: 'Sumbu 1: Level Jabatan (Vertikal)',
      axis2Label: 'Sumbu 2: Peran Sistem (Horizontal)',
      doaMatrixTitle: 'Matriks Kebijakan DoA (Header-Detail & Lampiran SK)',
      approverMatrixTitle: 'Matriks Penugasan Approver (3-Axis Resolution)',
      dbEngine: 'Mesin Database',
      themeToggle: 'Ubah Tema',
      language: 'Bahasa',
      searchMenuPlaceholder: 'Cari menu navigasi...',
      myProfileBtn: 'Profil Saya',
      signOutBtn: 'Keluar',
      pendingDocsBtn: 'Dokumen Menunggu Approval Anda',
      kpiInboxTitle: 'Approval Inbox Anda',
      kpiInboxQueue: 'Antrean',
      kpiInboxWaiting: 'Menunggu keputusan Anda',
      kpiInboxClear: 'Seluruh dokumen selesai',
      kpiAxis1Title: 'Otoritas Sumbu 1 (Rank)',
      kpiAxis2Title: 'Hak Akses Sumbu 2 (RBAC)',
      kpiAxis2ActiveRoles: 'Role Aktif',
      kpiAxis2AuthorizedPerms: 'Permission Terotorisasi',
      kpiComplianceTitle: 'Status Kepatuhan & DB',
      kpiComplianceValue: '100% Patuh',
      kpiComplianceSub: 'SK DoA DMS + Audit jsonb Aktif',
      simCardTitle: '3-Axis Workflow Route Simulator & Pre-Submit Dry-Run',
      simCardSubtitle:
        'Uji resolusi rute persetujuan berjenjang secara real-time berdasarkan Pengaju, Jenis Dokumen, Sub-Kategori, dan Nilai Plafond',
      simRequesterLabel: 'Pengaju (Requester & OrgUnit)',
      simDocTypeLabel: 'Jenis Dokumen (DocTypeCode)',
      simSubCategoryLabel: 'Header Sub-Kategori (Axis 3)',
      simAmountLabel: 'Nilai Transaksi (IDR)',
      menuProfilePage: 'Halaman Profil, Foto 1:1 & Paraf',
      menuQuickModalProfile: 'Quick Modal Profil & Sandi',
      menuThemeCustomizer: 'Kustomisasi Tema & Warna Korporat',
      menuRotateJwt: 'Rotate JWT Session (HttpOnly Cookie)',
      menuSignOutFull: 'Keluar (Sign Out & Revoke Token)',
    },
  },
  en: {
    translation: {
      appTitle: 'CoreEnterprise Portal',
      appSubtitle: '2-Axis Authorization, Contextual DoA Header-Detail & 3-Axis Approver Resolution',
      axis1Label: 'Axis 1: Job Level (Vertical Hierarchy)',
      axis2Label: 'Axis 2: System Role (Horizontal RBAC)',
      doaMatrixTitle: 'DoA Policy Matrix (Header-Detail & Official SK Attachment)',
      approverMatrixTitle: 'Approver Authority Assignments (3-Axis Resolution)',
      dbEngine: 'Database Engine',
      themeToggle: 'Toggle Theme',
      language: 'Language',
      searchMenuPlaceholder: 'Search navigation menu...',
      myProfileBtn: 'My Profile',
      signOutBtn: 'Sign Out',
      pendingDocsBtn: 'Documents Awaiting Your Approval',
      kpiInboxTitle: 'Your Approval Inbox',
      kpiInboxQueue: 'Queued',
      kpiInboxWaiting: 'Awaiting your decision',
      kpiInboxClear: 'All documents completed',
      kpiAxis1Title: 'Axis 1 Authority (Rank)',
      kpiAxis2Title: 'Axis 2 Access (RBAC)',
      kpiAxis2ActiveRoles: 'Active Roles',
      kpiAxis2AuthorizedPerms: 'Authorized Permissions',
      kpiComplianceTitle: 'Compliance & DB Status',
      kpiComplianceValue: '100% Compliant',
      kpiComplianceSub: 'DoA SK DMS + Audit jsonb Active',
      simCardTitle: '3-Axis Workflow Route Simulator & Pre-Submit Dry-Run',
      simCardSubtitle:
        'Test multi-step approval routing resolution in real time based on Requester, Document Type, Sub-Category, and Plafond Amount',
      simRequesterLabel: 'Requester (User & OrgUnit)',
      simDocTypeLabel: 'Document Type (DocTypeCode)',
      simSubCategoryLabel: 'Header Sub-Category (Axis 3)',
      simAmountLabel: 'Transaction Amount (IDR)',
      menuProfilePage: 'Profile Page, 1:1 Photo & Digital Paraf',
      menuQuickModalProfile: 'Quick Profile & Password Modal',
      menuThemeCustomizer: 'Theme & Corporate Palette Customizer',
      menuRotateJwt: 'Rotate JWT Session (HttpOnly Cookie)',
      menuSignOutFull: 'Sign Out (Revoke Session Token)',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('ce_lang') || 'id',
  fallbackLng: 'id',
  interpolation: {
    escapeValue: false,
  },
});

export interface DynamicI18nEntry {
  id?: string;
  translationKey: string;
  moduleGroup?: string;
  textId: string;
  textEn: string;
  description?: string;
  isSystemCore?: boolean;
}

export function applyDynamicI18nEntries(entries?: DynamicI18nEntry[]) {
  if (!entries || entries.length === 0) return;

  const idPatch: Record<string, string> = {};
  const enPatch: Record<string, string> = {};

  for (const item of entries) {
    if (!item.translationKey) continue;
    idPatch[item.translationKey] = item.textId;
    enPatch[item.translationKey] = item.textEn;

    // Also synchronize menu.<menuCode>.title / subtitle / group with MENU_TRANSLATIONS
    if (item.translationKey.startsWith('menu.')) {
      const parts = item.translationKey.split('.');
      if (parts.length === 3) {
        const menuCode = parts[1];
        const field = parts[2] as 'title' | 'subtitle' | 'group';
        if (MENU_TRANSLATIONS.id[menuCode] && (field === 'title' || field === 'subtitle' || field === 'group')) {
          MENU_TRANSLATIONS.id[menuCode][field] = item.textId;
        }
        if (MENU_TRANSLATIONS.en[menuCode] && (field === 'title' || field === 'subtitle' || field === 'group')) {
          MENU_TRANSLATIONS.en[menuCode][field] = item.textEn;
        }
      }
    }
  }

  i18n.addResourceBundle('id', 'translation', idPatch, true, true);
  i18n.addResourceBundle('en', 'translation', enPatch, true, true);
  // Trigger language refresh so active components re-render with updated bundle
  i18n.changeLanguage(i18n.language);
}

export default i18n;
