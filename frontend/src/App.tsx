import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  AppShell,
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Burger,
  Button,
  Card,
  Collapse,
  Divider,
  Grid,
  Group,
  Indicator,
  Loader,
  LoadingOverlay,
  Menu,
  NavLink,
  NumberInput,
  Paper,
  Popover,
  RingProgress,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Timeline,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowRight,
  IconBell,
  IconBuildingSkyscraper,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconChevronsDown,
  IconChevronsUp,
  IconClockExclamation,
  IconDatabase,
  IconFileCertificate,
  IconFileDatabase,
  IconHeadset,
  IconHierarchy2,
  IconInbox,
  IconLogout,
  IconMoon,
  IconPalette,
  IconPlayerPlay,
  IconRefresh,
  IconRoute,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconShieldCog,
  IconShieldLock,
  IconSparkles,
  IconSpeakerphone,
  IconSun,
  IconUserCheck,
  IconUserCircle,
  IconUsers,
} from '@tabler/icons-react';
import { useIsFetching, useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { applyDynamicI18nEntries, MENU_TRANSLATIONS } from './i18n';
import { apiClient } from './lib/apiClient';
import { useAppStore, UserIdentity } from './store/useAppStore';
import { useAccess } from './hooks/useAccess';
import { TransactionsAndInboxView } from './components/TransactionsAndInboxView';
import { DoAPolicyMatrixView } from './components/DoAPolicyMatrixView';
import { ApproverAndOrgTreeView } from './components/ApproverAndOrgTreeView';
import { AuditAndDmsView, AuditTrailView, DmsRepositoryView } from './components/AuditAndDmsView';
import { UserProfileModal } from './components/UserProfileModal';
import { UserProfileView } from './components/UserProfileView';
import { ItServicedeskView, ServicedeskAndAdminView, SlaMonitorView } from './components/ServicedeskAndAdminView';
import { UserManagementView } from './components/UserManagementView';
import { MenuAndRbacManagementView } from './components/MenuAndRbacManagementView';
import { AbacManagementView } from './components/AbacManagementView';
import { ApplicationSettingsView, renderAppLogoIcon } from './components/ApplicationSettingsView';
import { LoginPage } from './components/LoginPage';
import { ThemeCustomizerDrawer } from './components/ThemeCustomizerDrawer';

const FALLBACK_USERS: UserIdentity[] = [
  {
    id: '00000000-0000-0000-0000-000000001003',
    employeeNumber: 'EMP-1003',
    username: 'user03',
    email: 'user03.staff.agro@coreenterprise.local',
    fullName: 'User03 - Andi Pratama (Staff Dept. Agronomy)',
    jobLevel: 'STAFF',
    jobRank: 10,
    orgUnitId: 'ORG-DEPT-AGRO',
    orgUnitCode: 'DEPT-AGRO',
    orgUnitType: 'DEPARTMENT',
    roles: ['EMPLOYEE'],
    permissions: ['Transaction.Read', 'Transaction.Create', 'Workflow.Simulate'],
  },
  {
    id: '00000000-0000-0000-0000-000000001004',
    employeeNumber: 'EMP-1004',
    username: 'user04',
    email: 'user04.staff.mill@coreenterprise.local',
    fullName: 'User04 - Dedi Kurniawan (Staff Dept. Mill)',
    jobLevel: 'STAFF',
    jobRank: 10,
    orgUnitId: 'ORG-DEPT-MILL',
    orgUnitCode: 'DEPT-MILL',
    orgUnitType: 'DEPARTMENT',
    roles: ['EMPLOYEE'],
    permissions: ['Transaction.Read', 'Transaction.Create', 'Workflow.Simulate'],
  },
  {
    id: '00000000-0000-0000-0000-000000001001',
    employeeNumber: 'EMP-1001',
    username: 'user01',
    email: 'user01.mgr.mill@coreenterprise.local',
    fullName: 'User01 - Hendra Wijaya (Mgr Mill / Asset Specialist)',
    jobLevel: 'MGR',
    jobRank: 20,
    orgUnitId: 'ORG-DEPT-MILL',
    orgUnitCode: 'DEPT-MILL',
    orgUnitType: 'DEPARTMENT',
    roles: ['EMPLOYEE'],
    permissions: ['Transaction.Read', 'Transaction.Create', 'Workflow.Approve', 'Workflow.Simulate'],
  },
  {
    id: '00000000-0000-0000-0000-000000001002',
    employeeNumber: 'EMP-1002',
    username: 'user02',
    email: 'user02.mgr.agro@coreenterprise.local',
    fullName: 'User02 - Rina Kusuma (Mgr Agronomy / AgroChem Specialist)',
    jobLevel: 'MGR',
    jobRank: 20,
    orgUnitId: 'ORG-DEPT-AGRO',
    orgUnitCode: 'DEPT-AGRO',
    orgUnitType: 'DEPARTMENT',
    roles: ['EMPLOYEE'],
    permissions: ['Transaction.Read', 'Transaction.Create', 'Workflow.Approve', 'Workflow.Simulate'],
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    employeeNumber: 'EMP-2001',
    username: 'am.sum1',
    email: 'am.sum1@coreenterprise.local',
    fullName: 'Edy Ependi (Area Manager Sumatera 1)',
    jobLevel: 'AM',
    jobRank: 30,
    orgUnitId: 'ORG-AREA-SUM1',
    orgUnitCode: 'AREA-SUM1',
    orgUnitType: 'AREA',
    roles: ['EMPLOYEE', 'MASTER_DATA'],
    permissions: [
      'Transaction.Read',
      'Transaction.Create',
      'Workflow.Approve',
      'Workflow.Simulate',
      'MasterData.Read',
      'MasterData.Write',
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000008001',
    employeeNumber: 'EMP-8001',
    username: 'servicedesk',
    email: 'servicedesk@coreenterprise.local',
    fullName: 'Rizky Pratama (IT Servicedesk Support)',
    jobLevel: 'STAFF',
    jobRank: 10,
    orgUnitId: 'ORG-HO',
    orgUnitCode: 'HO',
    orgUnitType: 'COMPANY',
    roles: ['SERVICEDESK'],
    permissions: ['Transaction.Read', 'MasterData.Read', 'Servicedesk.Manage', 'Workflow.Simulate'],
  },
  {
    id: '00000000-0000-0000-0000-000000009001',
    employeeNumber: 'EMP-9001',
    username: 'auditor',
    email: 'auditor@coreenterprise.local',
    fullName: 'Siti Rahma (Internal Auditor)',
    jobLevel: 'MGR',
    jobRank: 20,
    orgUnitId: 'ORG-HO',
    orgUnitCode: 'HO',
    orgUnitType: 'COMPANY',
    roles: ['AUDITOR'],
    permissions: ['Transaction.Read', 'MasterData.Read', 'AuditLog.Read', 'Workflow.Simulate'],
  },
  {
    id: '00000000-0000-0000-0000-000000000001',
    employeeNumber: 'EMP-0001',
    username: 'admin',
    email: 'admin@coreenterprise.local',
    fullName: 'Budi Santoso (SuperAdmin & MasterData)',
    jobLevel: 'AM',
    jobRank: 30,
    orgUnitId: 'ORG-HO',
    orgUnitCode: 'HO',
    orgUnitType: 'COMPANY',
    roles: ['SUPERADMIN', 'MASTER_DATA', 'EMPLOYEE'],
    permissions: [
      'Transaction.Read',
      'Transaction.Create',
      'Workflow.Approve',
      'Workflow.Simulate',
      'MasterData.Read',
      'MasterData.Write',
      'AuditLog.Read',
      'Servicedesk.Manage',
      'System.Admin',
    ],
  },
];

interface NavMenuItem {
  menuCode: string;
  title: string;
  subtitle: string;
  groupCategory: string;
  iconName: string;
  sortOrder: number;
  isVisible: boolean;
  allowedRoleCodes?: string[];
}

const DEFAULT_MENUS: NavMenuItem[] = [
  {
    menuCode: 'simulator',
    title: 'Dashboard & 3-Axis Simulator',
    subtitle: 'Simulasi rute & ikhtisar 2-Axis',
    groupCategory: 'Core Workspace',
    iconName: 'IconRoute',
    sortOrder: 10,
    isVisible: true,
    allowedRoleCodes: ['EMPLOYEE', 'AUDITOR', 'SERVICEDESK', 'MASTER_DATA', 'SUPERADMIN'],
  },
  {
    menuCode: 'transactions',
    title: 'Contoh PO & DCP',
    subtitle: 'Contoh implementasi transaksi & Approval Inbox',
    groupCategory: 'Core Workspace',
    iconName: 'IconInbox',
    sortOrder: 20,
    isVisible: true,
    allowedRoleCodes: ['EMPLOYEE', 'AUDITOR', 'SERVICEDESK', 'MASTER_DATA', 'SUPERADMIN'],
  },
  {
    menuCode: 'doa-matrix',
    title: 'Contextual DoA Policy Matrix',
    subtitle: 'Daftar SK DoA, Plafond & PDF',
    groupCategory: 'Governance & Master Data',
    iconName: 'IconFileCertificate',
    sortOrder: 30,
    isVisible: true,
    allowedRoleCodes: ['EMPLOYEE', 'AUDITOR', 'SERVICEDESK', 'MASTER_DATA', 'SUPERADMIN'],
  },
  {
    menuCode: 'approver-matrix',
    title: 'Org Tree & Approver Matrix',
    subtitle: '3-Axis User Assignment & Cuti',
    groupCategory: 'Governance & Master Data',
    iconName: 'IconUserCheck',
    sortOrder: 40,
    isVisible: true,
    allowedRoleCodes: ['EMPLOYEE', 'AUDITOR', 'SERVICEDESK', 'MASTER_DATA', 'SUPERADMIN'],
  },
  {
    menuCode: 'user-management',
    title: 'User Management (Master User)',
    subtitle: 'Kelola UserId, Jabatan & Organisasi',
    groupCategory: 'Identity & Access (IAM)',
    iconName: 'IconUsers',
    sortOrder: 50,
    isVisible: true,
    allowedRoleCodes: ['SUPERADMIN', 'MASTER_DATA', 'SERVICEDESK', 'AUDITOR'],
  },
  {
    menuCode: 'menu-rbac',
    title: 'Menu Management (RBAC)',
    subtitle: 'Konfigurasi Menu, Role & Permission',
    groupCategory: 'Identity & Access (IAM)',
    iconName: 'IconShieldCog',
    sortOrder: 60,
    isVisible: true,
    allowedRoleCodes: ['SUPERADMIN', 'AUDITOR'],
  },
  {
    menuCode: 'abac-management',
    title: 'ABAC Policy Management',
    subtitle: 'Attribute-Based Access Control',
    groupCategory: 'Identity & Access (IAM)',
    iconName: 'IconShieldLock',
    sortOrder: 70,
    isVisible: true,
    allowedRoleCodes: ['SUPERADMIN', 'MASTER_DATA', 'AUDITOR'],
  },
  {
    menuCode: 'audit-trail',
    title: 'Audit Trail Inspector (jsonb)',
    subtitle: 'Immutable Old/New Diff & Forensic Log',
    groupCategory: 'Compliance & Operations',
    iconName: 'IconShieldCheck',
    sortOrder: 75,
    isVisible: true,
    allowedRoleCodes: ['AUDITOR', 'SUPERADMIN', 'MASTER_DATA'],
  },
  {
    menuCode: 'dms-repository',
    title: 'Document Management (DMS)',
    subtitle: 'Repositori File, SK PDF & SHA-256',
    groupCategory: 'Compliance & Operations',
    iconName: 'IconFileDatabase',
    sortOrder: 80,
    isVisible: true,
    allowedRoleCodes: ['EMPLOYEE', 'AUDITOR', 'SERVICEDESK', 'MASTER_DATA', 'SUPERADMIN'],
  },
  {
    menuCode: 'sla-monitor',
    title: 'SLA & Bottleneck Monitor',
    subtitle: 'Pantau Antrean Workflow & Overdue SLA',
    groupCategory: 'Compliance & Operations',
    iconName: 'IconClockExclamation',
    sortOrder: 85,
    isVisible: true,
    allowedRoleCodes: ['SERVICEDESK', 'SUPERADMIN', 'AUDITOR', 'MASTER_DATA'],
  },
  {
    menuCode: 'it-servicedesk',
    title: 'IT Servicedesk Operations',
    subtitle: 'Unlock Akun, Reset Sandi & Bantuan User',
    groupCategory: 'Compliance & Operations',
    iconName: 'IconHeadset',
    sortOrder: 90,
    isVisible: true,
    allowedRoleCodes: ['SERVICEDESK', 'SUPERADMIN', 'AUDITOR'],
  },
  {
    menuCode: 'app-settings',
    title: 'Application Settings',
    subtitle: 'Identitas Aplikasi, Logo & Parameter Sistem',
    groupCategory: 'Compliance & Operations',
    iconName: 'IconSettings',
    sortOrder: 95,
    isVisible: true,
    allowedRoleCodes: ['SUPERADMIN', 'MASTER_DATA', 'AUDITOR'],
  },
];

const PROFILE_PAGE_META: NavMenuItem = {
  menuCode: 'profile',
  title: 'Profil, Foto 1:1 & Paraf Digital',
  subtitle: 'Kelola akun, avatar .webp & paraf',
  groupCategory: 'User Account',
  iconName: 'IconUserCircle',
  sortOrder: 100,
  isVisible: true,
};

function renderMenuIcon(iconName: string, size = 18) {
  switch (iconName) {
    case 'IconInbox':
      return <IconInbox size={size} />;
    case 'IconFileCertificate':
      return <IconFileCertificate size={size} />;
    case 'IconFileDatabase':
      return <IconFileDatabase size={size} />;
    case 'IconClockExclamation':
      return <IconClockExclamation size={size} />;
    case 'IconUserCheck':
      return <IconUserCheck size={size} />;
    case 'IconUsers':
      return <IconUsers size={size} />;
    case 'IconShieldCog':
      return <IconShieldCog size={size} />;
    case 'IconShieldLock':
      return <IconShieldLock size={size} />;
    case 'IconShieldCheck':
      return <IconShieldCheck size={size} />;
    case 'IconHeadset':
      return <IconHeadset size={size} />;
    case 'IconSettings':
      return <IconSettings size={size} />;
    case 'IconUserCircle':
      return <IconUserCircle size={size} />;
    default:
      return <IconRoute size={size} />;
  }
}

export function App() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isFetchingCount = useIsFetching();
  const isMutatingCount = useIsMutating();
  const {
    isAuthenticated,
    colorScheme,
    toggleColorScheme,
    primaryColor,
    language,
    setLanguage,
    appTitle,
    appSubtitle,
    appLogoIcon,
    appVersionBadge,
    systemAnnouncementBanner,
    activeRequestsCount,
    setAppBranding,
    setCurrentUser,
    logout,
  } = useAppStore();
  const { currentUser, isReadOnlyAuditor } = useAccess();
  const isGlobalLoading = isFetchingCount > 0 || isMutatingCount > 0 || activeRequestsCount > 0;

  const [mobileNavOpened, { toggle: toggleMobileNav }] = useDisclosure();
  const [desktopNavOpened, { toggle: toggleDesktopNav }] = useDisclosure(true);
  const [activeMenu, setActiveMenu] = useState<string>('simulator');
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);

  // Simulator State
  const [simRequesterUsername, setSimRequesterUsername] = useState<string>('user03');
  const [simDocType, setSimDocType] = useState<string>('DCP');
  const [simSubCategory, setSimSubCategory] = useState<string>('GENERAL');
  const [simAmount, setSimAmount] = useState<number>(120000000);

  const { data: dbUsers = FALLBACK_USERS } = useQuery<UserIdentity[]>({
    queryKey: ['demo-users'],
    queryFn: async () => {
      const res = await apiClient.get<UserIdentity[]>('/Auth/demo-users');
      return res.data;
    },
  });

  useEffect(() => {
    if (dbUsers.length > 0 && isAuthenticated) {
      const matched = dbUsers.find((u) => u.username === currentUser.username);
      if (matched && matched.id !== currentUser.id) {
        setCurrentUser(matched);
      }
    }
  }, [dbUsers, isAuthenticated, currentUser.username, currentUser.id, setCurrentUser]);

  const { data: summary } = useQuery<any>({
    queryKey: ['system-foundation-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/SystemHealth/summary');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: apiMenus } = useQuery<NavMenuItem[]>({
    queryKey: ['app-menus'],
    queryFn: async () => {
      const res = await apiClient.get('/SuperAdmin/menus');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: appSettingsData } = useQuery<any>({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/AppSettings');
      return res.data;
    },
  });

  useEffect(() => {
    if (appSettingsData?.branding) {
      setAppBranding(appSettingsData.branding);
      if (appSettingsData.branding.appTitle) {
        document.title = appSettingsData.branding.appTitle;
      }
    }
    if (appSettingsData?.i18nEntries) {
      applyDynamicI18nEntries(appSettingsData.i18nEntries);
    }
  }, [appSettingsData, setAppBranding]);

  const { data: inboxItems = [] } = useQuery<any[]>({
    queryKey: ['workflow-inbox', currentUser.id],
    queryFn: async () => {
      const res = await apiClient.get(`/Transactions/inbox?userId=${currentUser.id}`);
      return res.data;
    },
    enabled: isAuthenticated && !!currentUser.id && !currentUser.id.startsWith('00000000'),
  });

  const { data: userNotifications = [] } = useQuery<any[]>({
    queryKey: ['user-notifications', currentUser.id],
    queryFn: async () => {
      const res = await apiClient.get(`/Notifications?userId=${currentUser.id}`);
      return res.data;
    },
    enabled: isAuthenticated && !!currentUser.id && !currentUser.id.startsWith('00000000'),
  });

  const simReqUser = dbUsers.find((u) => u.username === simRequesterUsername) || dbUsers[0] || FALLBACK_USERS[0];

  const { data: apiSimResult } = useQuery<any>({
    queryKey: ['workflow-sim', simReqUser.id, simDocType, simSubCategory, simAmount],
    queryFn: async () => {
      const res = await apiClient.post('/WorkflowSimulator/simulate', {
        requesterUserId: simReqUser.id,
        docTypeCode: simDocType,
        subCategoryCode: simSubCategory,
        transactionAmount: simAmount,
      });
      return res.data;
    },
    enabled: isAuthenticated && !!simReqUser?.id && !simReqUser.id.startsWith('00000000'),
  });

  // Render Enterprise Login Page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage demoUsers={dbUsers} />;
  }

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    try {
      await apiClient.post('/Auth/logout');
    } catch {
      // ignore
    }
    logout();
    notifications.show({
      title: 'Signed Out',
      message: 'Sesi Anda telah diakhiri dan Refresh Token dicabut.',
      color: 'gray',
    });
  };

  const localizedMenus = (apiMenus && apiMenus.length > 0 ? apiMenus : DEFAULT_MENUS).map((m) => {
    const dict = MENU_TRANSLATIONS[language]?.[m.menuCode];
    const idDefault = MENU_TRANSLATIONS.id?.[m.menuCode];
    // Translate default menus automatically when switching ID <-> EN, while respecting custom edits from Menu Management
    const isDefaultTitle = !idDefault || m.title === idDefault.title;
    const isDefaultSubtitle = !idDefault || m.subtitle === idDefault.subtitle;
    return {
      ...m,
      title: dict && isDefaultTitle ? dict.title : m.title,
      subtitle: dict && isDefaultSubtitle ? dict.subtitle : m.subtitle,
      groupCategory: dict ? dict.group : m.groupCategory,
    };
  });

  const userRoleSet = new Set((currentUser.roles || []).map((r) => r.toUpperCase()));
  const isSuperAdmin = userRoleSet.has('SUPERADMIN');

  const effectiveMenus = localizedMenus.filter((m) => {
    if (m.isVisible === false) return false;
    // Exclude User Account / profile menu from left vertical sidebar (accessible via bottom-left & top-right profile buttons)
    if (m.menuCode === 'profile' || m.groupCategory === 'User Account') return false;
    // Enforce RBAC allowedRoleCodes filtering for the currently logged-in user
    if (!isSuperAdmin && m.allowedRoleCodes && m.allowedRoleCodes.length > 0) {
      const hasRoleMatch = m.allowedRoleCodes.some((allowed) => userRoleSet.has(allowed.toUpperCase()));
      if (!hasRoleMatch) return false;
    }
    if (menuSearch.trim()) {
      const q = menuSearch.trim().toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.groupCategory.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // If the current activeMenu is not accessible to the newly logged-in user's role, fallback to simulator
  const isCurrentMenuAuthorized =
    activeMenu === 'profile' || effectiveMenus.some((m) => m.menuCode === activeMenu);
  const resolvedActiveMenu = isCurrentMenuAuthorized
    ? activeMenu
    : effectiveMenus[0]?.menuCode || 'simulator';

  const menuGroups = Array.from(new Set(effectiveMenus.map((m) => m.groupCategory)));

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const expandAllGroups = () => {
    setCollapsedGroups({});
  };

  const collapseAllGroups = () => {
    const next: Record<string, boolean> = {};
    menuGroups.forEach((g) => {
      next[g] = true;
    });
    setCollapsedGroups(next);
  };

  const allGroupsCollapsed =
    menuGroups.length > 0 && menuGroups.every((g) => !!collapsedGroups[g]);

  const profileTranslated: NavMenuItem = {
    ...PROFILE_PAGE_META,
    title: MENU_TRANSLATIONS[language]?.profile?.title || PROFILE_PAGE_META.title,
    subtitle: MENU_TRANSLATIONS[language]?.profile?.subtitle || PROFILE_PAGE_META.subtitle,
    groupCategory: MENU_TRANSLATIONS[language]?.profile?.group || PROFILE_PAGE_META.groupCategory,
  };

  const activeMenuObj =
    resolvedActiveMenu === 'profile'
      ? profileTranslated
      : localizedMenus.find((m) => m.menuCode === resolvedActiveMenu) ||
        effectiveMenus[0] ||
        DEFAULT_MENUS[0];

  const defaultIdSubtitle =
    'Otorisasi 2 Dimensi, Contextual DoA Header-Detail & 3-Axis Approver Resolution';
  const displayedSubtitle =
    language === 'en' && (!appSubtitle || appSubtitle === defaultIdSubtitle)
      ? t('appSubtitle')
      : appSubtitle || t('appSubtitle');

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 296,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileNavOpened, desktop: !desktopNavOpened },
      }}
      padding="md"
      styles={{
        main: {
          backgroundColor: colorScheme === 'dark' ? '#0b1017' : '#f4f6fa',
          minHeight: '100vh',
        },
        header: {
          backdropFilter: 'blur(10px)',
          backgroundColor:
            colorScheme === 'dark' ? 'rgba(18, 24, 36, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        },
        navbar: {
          backgroundColor: colorScheme === 'dark' ? '#111722' : '#ffffff',
        },
      }}
    >
      {/* ENTERPRISE TOP HEADER */}
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={mobileNavOpened} onClick={toggleMobileNav} hiddenFrom="sm" size="sm" />
            <Burger opened={desktopNavOpened} onClick={toggleDesktopNav} visibleFrom="sm" size="sm" />

            <ThemeIcon
              size={38}
              radius="md"
              variant="gradient"
              gradient={{ from: primaryColor, to: 'cyan', deg: 135 }}
            >
              {renderAppLogoIcon(appLogoIcon, 21)}
            </ThemeIcon>
            <div>
              <Group gap={6}>
                <Title order={5} style={{ letterSpacing: '-0.2px' }}>
                  {appTitle || t('appTitle')}
                </Title>
                <Badge size="xs" color={primaryColor} variant="light" visibleFrom="md">
                  {appVersionBadge || 'Enterprise v1.4.0'}
                </Badge>
              </Group>
              <Text size="11px" c="dimmed" visibleFrom="sm">
                {displayedSubtitle}
              </Text>
            </div>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Badge color="teal" variant="light" leftSection={<IconDatabase size={12} />} visibleFrom="lg">
              {summary?.databaseEngine || 'PostgreSQL 16'}
            </Badge>

            <SegmentedControl
              size="xs"
              value={language}
              onChange={(val) => setLanguage(val as 'id' | 'en')}
              data={[
                { label: 'ID', value: 'id' },
                { label: 'EN', value: 'en' },
              ]}
            />

            <Tooltip label="Theme & Corporate Palette Customizer">
              <ActionIcon variant="default" size="lg" radius="md" onClick={() => setThemeDrawerOpen(true)}>
                <IconPalette size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={colorScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <ActionIcon variant="default" size="lg" radius="md" onClick={toggleColorScheme}>
                {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>

            {/* Real-time Notification Center */}
            <Popover width={390} position="bottom-end" withArrow shadow="lg">
              <Popover.Target>
                <Indicator inline label={unreadCount} size={16} disabled={unreadCount === 0} color="red">
                  <ActionIcon variant="default" size="lg" radius="md">
                    <IconBell size={18} />
                  </ActionIcon>
                </Indicator>
              </Popover.Target>
              <Popover.Dropdown p="sm">
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <div>
                    <Group gap={6}>
                      <Text fw={700} size="sm">
                        Notification Center
                      </Text>
                      <Badge size="xs" color={unreadCount > 0 ? 'red' : 'gray'} variant="light">
                        {unreadCount} Unread
                      </Badge>
                    </Group>
                    <Text size="10px" c="dimmed">
                      Penerima: @{currentUser.username}
                    </Text>
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="teal"
                      leftSection={<IconCheck size={12} />}
                      onClick={async () => {
                        try {
                          await apiClient.post(`/Notifications/read-all?userId=${currentUser.id}`);
                          queryClient.invalidateQueries({ queryKey: ['user-notifications', currentUser.id] });
                          notifications.show({
                            title: 'Notifikasi Diperbarui',
                            message: 'Seluruh notifikasi telah ditandai sudah dibaca (Read).',
                            color: 'teal',
                          });
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Mark All as Read
                    </Button>
                  )}
                </Group>
                <Divider mb="xs" />
                {userNotifications.length === 0 ? (
                  <Text size="xs" c="dimmed" py="sm" ta="center">
                    Belum ada notifikasi baru untuk {currentUser.fullName}.
                  </Text>
                ) : (
                  <ScrollArea.Autosize mah={340}>
                    <Stack gap={6}>
                      {userNotifications.slice(0, 12).map((n) => (
                        <Paper
                          key={n.id}
                          withBorder
                          p="xs"
                          radius="md"
                          onClick={async () => {
                            if (!n.isRead) {
                              try {
                                await apiClient.post(`/Notifications/${n.id}/read`);
                                queryClient.invalidateQueries({ queryKey: ['user-notifications', currentUser.id] });
                              } catch {
                                // ignore
                              }
                            }
                            if (n.referenceTransactionId) {
                              setActiveMenu('transactions');
                            }
                          }}
                          style={{
                            cursor: 'pointer',
                            borderLeft: !n.isRead
                              ? `3px solid var(--mantine-color-${primaryColor}-6)`
                              : undefined,
                            backgroundColor: !n.isRead
                              ? colorScheme === 'dark'
                                ? 'rgba(24, 100, 171, 0.14)'
                                : 'rgba(24, 100, 171, 0.04)'
                              : undefined,
                          }}
                        >
                          <Group justify="space-between" wrap="nowrap" mb={2}>
                            <Text size="xs" fw={!n.isRead ? 700 : 600} truncate>
                              {n.title}
                            </Text>
                            {!n.isRead ? (
                              <Badge size="xs" color="blue" variant="filled">
                                BARU
                              </Badge>
                            ) : (
                              <Badge size="xs" color="gray" variant="outline">
                                DIBACA
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {n.message}
                          </Text>
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                )}
              </Popover.Dropdown>
            </Popover>

            {/* Enterprise User Profile Dropdown Menu */}
            <Menu shadow="lg" width={290} position="bottom-end" withArrow>
              <Menu.Target>
                <UnstyledButton
                  style={{
                    padding: '4px 10px',
                    borderRadius: '10px',
                    border: '1px solid rgba(128,128,128,0.22)',
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Avatar
                      size={32}
                      radius="xl"
                      color={primaryColor}
                      src={currentUser.avatarDmsFileId ? `/api/Dms/${currentUser.avatarDmsFileId}/download` : null}
                    >
                      {currentUser.username.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div style={{ lineHeight: 1.15 }} className="mantine-visible-from-md">
                      <Text size="xs" fw={700} truncate maw={145}>
                        {currentUser.fullName}
                      </Text>
                      <Text size="10px" c="dimmed">
                        {currentUser.jobLevel} (Rank {currentUser.jobRank}) • {currentUser.orgUnitCode}
                      </Text>
                    </div>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>2-Axis Security Identity (JWT)</Menu.Label>
                <div style={{ padding: '4px 12px 8px' }}>
                  <Text size="xs" fw={700}>
                    {currentUser.fullName}
                  </Text>
                  <Group gap={4} mt={4}>
                    <Badge size="xs" color="indigo">
                      Axis 1: {currentUser.jobLevel} (Rank {currentUser.jobRank})
                    </Badge>
                    <Badge size="xs" color="cyan" variant="outline">
                      {currentUser.orgUnitCode}
                    </Badge>
                    {currentUser.roles.map((r) => (
                      <Badge key={r} size="xs" color="grape" variant="light">
                        {r}
                      </Badge>
                    ))}
                  </Group>
                </div>

                <Menu.Divider />
                <Menu.Label>Account & Preferences</Menu.Label>
                <Menu.Item leftSection={<IconUserCircle size={16} />} onClick={() => setActiveMenu('profile')}>
                  {t('menuProfilePage')}
                </Menu.Item>
                <Menu.Item leftSection={<IconUserCheck size={16} />} onClick={() => setProfileModalOpen(true)}>
                  {t('menuQuickModalProfile')}
                </Menu.Item>
                <Menu.Item leftSection={<IconPalette size={16} />} onClick={() => setThemeDrawerOpen(true)}>
                  {t('menuThemeCustomizer')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconRefresh size={16} />}
                  onClick={async () => {
                    try {
                      const res = await apiClient.post('/Auth/refresh', {});
                      setCurrentUser(res.data.user, res.data.accessToken);
                      notifications.show({
                        title: 'Refresh Token Rotation Berhasil',
                        message: 'HttpOnly Cookie berhasil dirotasi & JWT baru diterbitkan.',
                        color: 'teal',
                      });
                    } catch (err: any) {
                      notifications.show({
                        title: 'Refresh Token Info',
                        message: err.response?.data?.message || 'Silakan login ulang untuk memperbarui cookie sesi.',
                        color: 'orange',
                      });
                    }
                  }}
                >
                  {t('menuRotateJwt')}
                </Menu.Item>

                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={handleLogout}>
                  {t('menuSignOutFull')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* ENTERPRISE LEFT NAVIGATION SIDEBAR */}
      <AppShell.Navbar p="sm">
        <AppShell.Section mb="xs">
          <Stack gap={6}>
            <TextInput
              size="xs"
              radius="md"
              placeholder={t('searchMenuPlaceholder')}
              leftSection={<IconSearch size={14} />}
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.currentTarget.value)}
            />
            <Group justify="space-between" px={2}>
              <Text size="10px" fw={700} c="dimmed" tt="uppercase">
                {language === 'en' ? 'Menu Groups' : 'Grup Navigasi'} ({menuGroups.length})
              </Text>
              <Group gap={4}>
                <Tooltip label={language === 'en' ? 'Expand All Groups' : 'Buka Semua Grup (Expand All)'}>
                  <Button
                    size="compact-xs"
                    variant={!allGroupsCollapsed ? 'light' : 'subtle'}
                    color={primaryColor}
                    leftSection={<IconChevronsDown size={12} />}
                    onClick={expandAllGroups}
                    styles={{ label: { fontSize: 10 } }}
                  >
                    {language === 'en' ? 'Expand All' : 'Expand All'}
                  </Button>
                </Tooltip>
                <Tooltip label={language === 'en' ? 'Collapse All Groups' : 'Tutup Semua Grup (Collapse All)'}>
                  <Button
                    size="compact-xs"
                    variant={allGroupsCollapsed ? 'light' : 'subtle'}
                    color="gray"
                    leftSection={<IconChevronsUp size={12} />}
                    onClick={collapseAllGroups}
                    styles={{ label: { fontSize: 10 } }}
                  >
                    {language === 'en' ? 'Collapse All' : 'Collapse All'}
                  </Button>
                </Tooltip>
              </Group>
            </Group>
          </Stack>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} mx="-xs" px="xs">
          <Stack gap={6}>
            {menuGroups.map((groupName, gIdx) => {
              const groupItems = effectiveMenus.filter((m) => m.groupCategory === groupName);
              const isGroupExpanded = !!menuSearch.trim() || !collapsedGroups[groupName];
              const hasActiveItem = groupItems.some((m) => m.menuCode === resolvedActiveMenu);

              return (
                <Box key={groupName}>
                  {gIdx > 0 && <Divider my={4} />}
                  <UnstyledButton
                    onClick={() => toggleGroupCollapse(groupName)}
                    w="100%"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      backgroundColor: hasActiveItem
                        ? colorScheme === 'dark'
                          ? 'rgba(255, 255, 255, 0.04)'
                          : 'rgba(24, 100, 171, 0.05)'
                        : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                        {isGroupExpanded ? (
                          <IconChevronDown size={13} style={{ opacity: 0.7 }} />
                        ) : (
                          <IconChevronRight size={13} style={{ opacity: 0.7 }} />
                        )}
                        <Text
                          size="10px"
                          fw={800}
                          c={hasActiveItem ? primaryColor : 'dimmed'}
                          tt="uppercase"
                          truncate
                          style={{ letterSpacing: '0.4px' }}
                        >
                          {groupName}
                        </Text>
                      </Group>
                      <Badge size="xs" variant="light" color={hasActiveItem ? primaryColor : 'gray'}>
                        {groupItems.length}
                      </Badge>
                    </Group>
                  </UnstyledButton>

                  <Collapse in={isGroupExpanded} transitionDuration={160}>
                    <Stack gap={2} mt={3} pl={4}>
                      {groupItems.map((item) => {
                        const isActive = resolvedActiveMenu === item.menuCode;
                        return (
                          <NavLink
                            key={item.menuCode}
                            active={isActive}
                            label={item.title}
                            leftSection={
                              <ThemeIcon
                                size={28}
                                radius="md"
                                color={isActive ? primaryColor : 'gray'}
                                variant={isActive ? 'filled' : 'light'}
                              >
                                {renderMenuIcon(item.iconName, 16)}
                              </ThemeIcon>
                            }
                            rightSection={
                              item.menuCode === 'transactions' && inboxItems.length > 0 ? (
                                <Badge size="xs" color="red" variant="filled">
                                  {inboxItems.length}
                                </Badge>
                              ) : undefined
                            }
                            onClick={() => {
                              setActiveMenu(item.menuCode);
                              mobileNavOpened && toggleMobileNav();
                            }}
                            style={{
                              borderRadius: 10,
                              fontWeight: isActive ? 700 : 500,
                              paddingTop: 7,
                              paddingBottom: 7,
                            }}
                          />
                        );
                      })}
                    </Stack>
                  </Collapse>
                </Box>
              );
            })}
          </Stack>
        </AppShell.Section>

        {/* Clean Enterprise Session Card (Replaces Dev Persona Switcher) */}
        <AppShell.Section pt="xs">
          <Paper
            withBorder
            p="xs"
            radius="md"
            style={{
              backgroundColor:
                colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(24, 100, 171, 0.03)',
            }}
          >
            <Group justify="space-between" wrap="nowrap" mb={6}>
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                <Avatar
                  size={34}
                  radius="xl"
                  color={primaryColor}
                  src={currentUser.avatarDmsFileId ? `/api/Dms/${currentUser.avatarDmsFileId}/download` : null}
                >
                  {currentUser.username.slice(0, 2).toUpperCase()}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Text size="xs" fw={700} truncate>
                    {currentUser.fullName}
                  </Text>
                  <Text size="10px" c="dimmed" truncate>
                    @{currentUser.username} • {currentUser.orgUnitCode}
                  </Text>
                </div>
              </Group>
              {isReadOnlyAuditor && (
                <Badge size="xs" color="orange" variant="filled">
                  AUDITOR
                </Badge>
              )}
            </Group>

            <Group gap={4} mb={8}>
              <Badge size="xs" color="indigo" variant="light">
                {currentUser.jobLevel} (Rank {currentUser.jobRank})
              </Badge>
              {currentUser.roles.slice(0, 2).map((r) => (
                <Badge key={r} size="xs" color="grape" variant="outline">
                  {r}
                </Badge>
              ))}
            </Group>

            <Group grow gap="xs">
              <Button
                size="compact-xs"
                variant="default"
                leftSection={<IconUserCircle size={13} />}
                onClick={() => setActiveMenu('profile')}
              >
                {t('myProfileBtn')}
              </Button>
              <Button
                size="compact-xs"
                variant="light"
                color="red"
                leftSection={<IconLogout size={13} />}
                onClick={handleLogout}
              >
                {t('signOutBtn')}
              </Button>
            </Group>
          </Paper>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* ENTERPRISE MAIN CONTENT WORKSPACE */}
      <AppShell.Main style={{ position: 'relative' }}>
        <LoadingOverlay
          visible={isGlobalLoading}
          zIndex={1000}
          overlayProps={{
            radius: 'sm',
            blur: 2,
            fixed: true,
            backgroundOpacity: colorScheme === 'dark' ? 0.45 : 0.35,
          }}
          loaderProps={{
            children: (
              <Paper
                withBorder
                shadow="md"
                px="xl"
                py="md"
                radius="lg"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.96)' : 'rgba(255, 255, 255, 0.96)',
                }}
              >
                <Loader color={primaryColor} size="md" type="oval" />
                <Text size="sm" fw={700}>
                  {language === 'en' ? 'Loading data...' : 'Memuat data...'}
                </Text>
                <Text size="xs" c="dimmed">
                  {language === 'en' ? 'Please wait a moment' : 'Mohon tunggu sebentar'}
                </Text>
              </Paper>
            ),
          }}
        />
        <Stack gap="md">
          {systemAnnouncementBanner && systemAnnouncementBanner.trim() !== '' && (
            <Alert
              icon={<IconSpeakerphone size={18} />}
              color={primaryColor}
              variant="light"
              radius="md"
              title="Pengumuman Sistem (Global Broadcast)"
            >
              {systemAnnouncementBanner}
            </Alert>
          )}

          {/* CONTEXTUAL ENTERPRISE PAGE HEADER BANNER */}
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" align="center">
              <Group gap="md">
                <ThemeIcon
                  size={44}
                  radius="md"
                  variant="gradient"
                  gradient={{ from: primaryColor, to: 'cyan', deg: 135 }}
                >
                  {renderMenuIcon(activeMenuObj.iconName, 22)}
                </ThemeIcon>
                <div>
                  <Breadcrumbs separator={<IconChevronRight size={12} />} mb={2}>
                    <Text size="xs" c="dimmed" fw={600}>
                      {activeMenuObj.groupCategory}
                    </Text>
                    <Text size="xs" fw={700} c={primaryColor}>
                      {activeMenuObj.title}
                    </Text>
                  </Breadcrumbs>
                  <Title order={4}>{activeMenuObj.title}</Title>
                  <Text size="xs" c="dimmed">
                    {activeMenuObj.subtitle}
                  </Text>
                </div>
              </Group>

              <Group gap="xs" visibleFrom="sm">
                {inboxItems.length > 0 && activeMenu !== 'transactions' && (
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    leftSection={<IconInbox size={14} />}
                    rightSection={<IconArrowRight size={14} />}
                    onClick={() => setActiveMenu('transactions')}
                  >
                    {inboxItems.length} {t('pendingDocsBtn')}
                  </Button>
                )}
                <Badge size="md" variant="light" color="indigo">
                  Axis 1: {currentUser.jobLevel} (Rank {currentUser.jobRank})
                </Badge>
                <Badge size="md" variant="outline" color="cyan">
                  Unit: {currentUser.orgUnitCode}
                </Badge>
              </Group>
            </Group>
          </Paper>

          {resolvedActiveMenu === 'simulator' && (
            <Stack gap="lg">
              {/* EXECUTIVE KPI SUMMARY CARDS */}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <Card withBorder radius="md" padding="md">
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        {t('kpiInboxTitle')}
                      </Text>
                      <Title order={3} mt={4} c={inboxItems.length > 0 ? 'red' : 'teal'}>
                        {inboxItems.length} {t('kpiInboxQueue')}
                      </Title>
                      <Text size="xs" c="dimmed" mt={2}>
                        {inboxItems.length > 0 ? t('kpiInboxWaiting') : t('kpiInboxClear')}
                      </Text>
                    </div>
                    <RingProgress
                      size={64}
                      thickness={6}
                      roundCaps
                      sections={[{ value: inboxItems.length > 0 ? 75 : 100, color: inboxItems.length > 0 ? 'red' : 'teal' }]}
                      label={
                        <Group justify="center">
                          <IconInbox size={18} />
                        </Group>
                      }
                    />
                  </Group>
                </Card>

                <Card withBorder radius="md" padding="md">
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        {t('kpiAxis1Title')}
                      </Text>
                      <Title order={3} mt={4}>
                        {currentUser.jobLevel} • {currentUser.jobRank}
                      </Title>
                      <Text size="xs" c="dimmed" mt={2}>
                        Unit: {currentUser.orgUnitCode} ({currentUser.orgUnitType})
                      </Text>
                    </div>
                    <RingProgress
                      size={64}
                      thickness={6}
                      roundCaps
                      sections={[{ value: Math.min(100, (currentUser.jobRank / 60) * 100), color: 'indigo' }]}
                      label={
                        <Group justify="center">
                          <IconHierarchy2 size={18} />
                        </Group>
                      }
                    />
                  </Group>
                </Card>

                <Card withBorder radius="md" padding="md">
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        {t('kpiAxis2Title')}
                      </Text>
                      <Title order={3} mt={4}>
                        {currentUser.roles.length} {t('kpiAxis2ActiveRoles')}
                      </Title>
                      <Text size="xs" c="dimmed" mt={2}>
                        {currentUser.permissions.length} {t('kpiAxis2AuthorizedPerms')}
                      </Text>
                    </div>
                    <ThemeIcon size={52} radius="xl" color="grape" variant="light">
                      <IconShieldCog size={26} />
                    </ThemeIcon>
                  </Group>
                </Card>

                <Card withBorder radius="md" padding="md">
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        {t('kpiComplianceTitle')}
                      </Text>
                      <Title order={3} mt={4} c="teal">
                        {t('kpiComplianceValue')}
                      </Title>
                      <Text size="xs" c="dimmed" mt={2}>
                        {t('kpiComplianceSub')}
                      </Text>
                    </div>
                    <ThemeIcon size={52} radius="xl" color="teal" variant="light">
                      <IconSparkles size={26} />
                    </ThemeIcon>
                  </Group>
                </Card>
              </SimpleGrid>

              {/* 3-AXIS WORKFLOW ROUTE SIMULATOR */}
              <Card withBorder radius="md">
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <ThemeIcon color={primaryColor} variant="light" size="lg" radius="md">
                      <IconRoute size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={4}>{t('simCardTitle')}</Title>
                      <Text size="xs" c="dimmed">
                        {t('simCardSubtitle')}
                      </Text>
                    </div>
                  </Group>
                  <Badge color={apiSimResult?.isValidForSubmit !== false ? 'teal' : 'red'} size="lg" variant="filled">
                    {apiSimResult?.isValidForSubmit !== false ? 'DRY-RUN PASSED (READY TO SUBMIT)' : 'DRY-RUN BLOCKED'}
                  </Badge>
                </Group>

                <Paper withBorder p="md" radius="md" mb="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                      <Select
                        label={t('simRequesterLabel')}
                        value={simRequesterUsername}
                        onChange={(v) => setSimRequesterUsername(v || 'user03')}
                        data={dbUsers.map((u) => ({
                          value: u.username,
                          label: `${u.username} (${u.jobLevel} @ ${u.orgUnitCode})`,
                        }))}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                      <Select
                        label={t('simDocTypeLabel')}
                        value={simDocType}
                        onChange={(v) => {
                          const nextDoc = v || 'PO';
                          setSimDocType(nextDoc);
                          setSimSubCategory(nextDoc === 'PO' ? 'ASSET' : 'GENERAL');
                        }}
                        data={[
                          { value: 'PO', label: 'PO — Purchase Order' },
                          { value: 'DCP', label: 'DCP — Direct Cash Payment' },
                        ]}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                      <Select
                        label={t('simSubCategoryLabel')}
                        value={simSubCategory}
                        onChange={(v) => setSimSubCategory(v || 'GENERAL')}
                        data={
                          simDocType === 'PO'
                            ? [
                                { value: 'ASSET', label: 'ASSET (Rute ke User01 - Mgr Asset)' },
                                { value: 'AGRO_CHEM', label: 'AGRO_CHEM (Rute ke User02 - Mgr Agro)' },
                                { value: 'GENERAL', label: 'GENERAL (Rute Manager Dept)' },
                              ]
                            : [{ value: 'GENERAL', label: 'GENERAL (Operasional Kebun/Pabrik)' }]
                        }
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                      <NumberInput
                        label={t('simAmountLabel')}
                        value={simAmount}
                        onChange={(v) => setSimAmount(Number(v) || 0)}
                        thousandSeparator="."
                        decimalSeparator=","
                        step={10000000}
                        min={1000000}
                      />
                    </Grid.Col>
                  </Grid>
                </Paper>

                {apiSimResult && !apiSimResult.isValidForSubmit && (
                  <Alert icon={<IconAlertCircle size={18} />} color="red" mb="md" title="Validasi Pre-Submit Dry-Run Gagal">
                    {apiSimResult.validationErrorMessage}
                  </Alert>
                )}

                <Timeline active={(apiSimResult?.steps || []).length} bulletSize={28} lineWidth={2}>
                  {(apiSimResult?.steps || []).map((s: any) => (
                    <Timeline.Item
                      key={s.sequence}
                      bullet={s.stepStatus === 'SKIPPED' ? <IconPlayerPlay size={14} /> : <IconCheck size={14} />}
                      color={s.stepStatus === 'SKIPPED' ? 'gray' : s.stepRoleType === 'FINAL_APPROVAL' ? 'teal' : primaryColor}
                      title={
                        <Group gap="xs">
                          <Text fw={700} size="sm">
                            Step #{s.sequence}: {s.targetJobLevelName} ({s.targetJobLevelCode})
                          </Text>
                          <Badge size="xs" color={s.stepStatus === 'SKIPPED' ? 'gray' : s.stepStatus === 'PENDING' ? 'blue' : 'cyan'}>
                            {s.stepStatus}
                          </Badge>
                          <Badge size="xs" color={s.stepRoleType === 'FINAL_APPROVAL' ? 'teal' : 'orange'} variant="outline">
                            {s.stepRoleType} (Plafond: {formatIDR(s.plafondLimitAtStep)})
                          </Badge>
                        </Group>
                      }
                    >
                      <Text size="sm" mt={4}>
                        Pejabat Approver: <strong>{s.assignedUserFullName}</strong> pada Unit <strong>{s.resolvedOrgUnitCode}</strong> (SLA:{' '}
                        {s.slaHours} Jam)
                      </Text>
                      <Text size="xs" c="dimmed">
                        Trace Resolusi: {s.resolutionTrace}
                      </Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Card withBorder radius="md">
                  <Group mb="sm">
                    <ThemeIcon color="blue" variant="light" radius="md">
                      <IconHierarchy2 size={18} />
                    </ThemeIcon>
                    <Title order={5}>{t('axis1Label')}</Title>
                  </Group>
                  <Group gap="xs">
                    {(summary?.jobLevels || []).map((jl: any) => (
                      <Badge key={jl.code} variant="light" color="blue" size="md">
                        {jl.rankOrder} - {jl.name} ({jl.code})
                      </Badge>
                    ))}
                  </Group>
                </Card>

                <Card withBorder radius="md">
                  <Group mb="sm">
                    <ThemeIcon color="grape" variant="light" radius="md">
                      <IconBuildingSkyscraper size={18} />
                    </ThemeIcon>
                    <Title order={5}>{t('axis2Label')}</Title>
                  </Group>
                  <Group gap="xs">
                    {(summary?.systemRoles || []).map((role: any) => (
                      <Badge key={role.code} variant="light" color="grape" size="md">
                        {role.code}: {role.name}
                      </Badge>
                    ))}
                  </Group>
                </Card>
              </SimpleGrid>
            </Stack>
          )}

          {resolvedActiveMenu === 'transactions' && <TransactionsAndInboxView currentUser={currentUser} />}
          {resolvedActiveMenu === 'doa-matrix' && <DoAPolicyMatrixView />}
          {resolvedActiveMenu === 'approver-matrix' && <ApproverAndOrgTreeView users={dbUsers} />}
          {resolvedActiveMenu === 'user-management' && <UserManagementView />}
          {resolvedActiveMenu === 'menu-rbac' && <MenuAndRbacManagementView />}
          {resolvedActiveMenu === 'abac-management' && <AbacManagementView />}
          {resolvedActiveMenu === 'audit-trail' && <AuditTrailView />}
          {resolvedActiveMenu === 'dms-repository' && <DmsRepositoryView />}
          {resolvedActiveMenu === 'sla-monitor' && <SlaMonitorView />}
          {resolvedActiveMenu === 'it-servicedesk' && <ItServicedeskView />}
          {resolvedActiveMenu === 'audit-dms' && <AuditAndDmsView />}
          {resolvedActiveMenu === 'servicedesk-admin' && <ServicedeskAndAdminView />}
          {resolvedActiveMenu === 'app-settings' && <ApplicationSettingsView />}
          {resolvedActiveMenu === 'profile' && <UserProfileView currentUser={currentUser} />}
        </Stack>
      </AppShell.Main>

      <UserProfileModal
        opened={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={currentUser}
      />

      <ThemeCustomizerDrawer
        opened={themeDrawerOpen}
        onClose={() => setThemeDrawerOpen(false)}
      />
    </AppShell>
  );
}
