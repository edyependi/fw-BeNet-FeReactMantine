import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Grid,
  Group,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAffiliate,
  IconAlertTriangle,
  IconBriefcase,
  IconBuildingBank,
  IconBuildingFactory2,
  IconBuildingSkyscraper,
  IconChartDonut3,
  IconCheck,
  IconCpu,
  IconCrown,
  IconDeviceFloppy,
  IconDiamond,
  IconEdit,
  IconEye,
  IconFlame,
  IconHexagonLetterC,
  IconKey,
  IconLanguage,
  IconLeaf,
  IconMail,
  IconMailForward,
  IconPlus,
  IconRocket,
  IconSearch,
  IconSend,
  IconServer,
  IconSettings,
  IconShieldLock,
  IconSparkles,
  IconSpeakerphone,
  IconStack2,
  IconTrash,
  IconWorld,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAccess } from '../hooks/useAccess';
import { applyDynamicI18nEntries } from '../i18n';
import { useAppStore } from '../store/useAppStore';
import {
  EnterpriseFormSection,
  EnterpriseModalShell,
  EnterpriseSwitchCard,
} from './EnterpriseModalShell';

export interface LogoOption {
  value: string;
  label: string;
  category: string;
}

export const APP_LOGO_OPTIONS: LogoOption[] = [
  { value: 'IconShieldLock', label: 'Shield Lock', category: 'Security & Governance' },
  { value: 'IconBuildingSkyscraper', label: 'Skyscraper', category: 'Corporate Holding' },
  { value: 'IconBuildingBank', label: 'Enterprise Bank', category: 'Finance & Treasury' },
  { value: 'IconLeaf', label: 'Agribusiness Leaf', category: 'Plantation & Agro' },
  { value: 'IconBuildingFactory2', label: 'Industrial Mill', category: 'Mill & Engineering' },
  { value: 'IconCrown', label: 'Executive Crown', category: 'Board & Executive' },
  { value: 'IconDiamond', label: 'Enterprise Diamond', category: 'Premium Suite' },
  { value: 'IconCpu', label: 'Digital Core CPU', category: 'Technology & AI' },
  { value: 'IconWorld', label: 'Global Network', category: 'Multi-Regional' },
  { value: 'IconBriefcase', label: 'Corporate Briefcase', category: 'Procurement & B2B' },
  { value: 'IconRocket', label: 'Velocity Rocket', category: 'Fast Operations' },
  { value: 'IconStack2', label: 'Multi-Axis Stack', category: '3-Axis Architecture' },
  { value: 'IconAffiliate', label: 'Org Graph Node', category: 'Hierarchy Network' },
  { value: 'IconChartDonut3', label: 'Analytics Ring', category: 'BI & Insights' },
  { value: 'IconFlame', label: 'Energy Flame', category: 'Energy & Resources' },
  { value: 'IconHexagonLetterC', label: 'Hexagon Core (C)', category: 'Brand Monogram' },
];

export function renderAppLogoIcon(iconName: string, size = 21, color?: string) {
  const props = { size, color };
  switch (iconName) {
    case 'IconBuildingSkyscraper':
      return <IconBuildingSkyscraper {...props} />;
    case 'IconBuildingBank':
      return <IconBuildingBank {...props} />;
    case 'IconLeaf':
      return <IconLeaf {...props} />;
    case 'IconBuildingFactory2':
      return <IconBuildingFactory2 {...props} />;
    case 'IconCrown':
      return <IconCrown {...props} />;
    case 'IconDiamond':
      return <IconDiamond {...props} />;
    case 'IconCpu':
      return <IconCpu {...props} />;
    case 'IconWorld':
      return <IconWorld {...props} />;
    case 'IconBriefcase':
      return <IconBriefcase {...props} />;
    case 'IconRocket':
      return <IconRocket {...props} />;
    case 'IconStack2':
      return <IconStack2 {...props} />;
    case 'IconAffiliate':
      return <IconAffiliate {...props} />;
    case 'IconChartDonut3':
      return <IconChartDonut3 {...props} />;
    case 'IconFlame':
      return <IconFlame {...props} />;
    case 'IconHexagonLetterC':
      return <IconHexagonLetterC {...props} />;
    default:
      return <IconShieldLock {...props} />;
  }
}

export function ApplicationSettingsView() {
  const queryClient = useQueryClient();
  const { canManageSystemAdmin, canWriteMasterData, isReadOnlyAuditor } = useAccess();
  const canEditSettings = (canManageSystemAdmin || canWriteMasterData) && !isReadOnlyAuditor;

  const {
    primaryColor,
    colorScheme,
    language,
    setLanguage,
    appTitle: storeTitle,
    appSubtitle: storeSubtitle,
    appLogoIcon: storeLogoIcon,
    appVersionBadge: storeBadge,
    companyName: storeCompany,
    systemAnnouncementBanner: storeBanner,
    setAppBranding,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<string | null>('branding');

  // Branding Form State
  const [titleInput, setTitleInput] = useState(storeTitle);
  const [subtitleInput, setSubtitleInput] = useState(storeSubtitle);
  const [logoIconInput, setLogoIconInput] = useState(storeLogoIcon);
  const [versionBadgeInput, setVersionBadgeInput] = useState(storeBadge);
  const [companyNameInput, setCompanyNameInput] = useState(storeCompany);
  const [bannerInput, setBannerInput] = useState(storeBanner);

  // Email Admin Account & SMTP Config State
  const [adminSenderEmail, setAdminSenderEmail] = useState('noreply-admin@coreenterprise.co.id');
  const [adminSenderName, setAdminSenderName] = useState('CoreEnterprise System Administrator');
  const [adminSupportReplyTo, setAdminSupportReplyTo] = useState('it-servicedesk@coreenterprise.co.id');
  const [ccSecurityAuditEmail, setCcSecurityAuditEmail] = useState('security-audit@coreenterprise.co.id');
  const [smtpHost, setSmtpHost] = useState('smtp.coreenterprise.co.id');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('noreply-admin@coreenterprise.co.id');
  const [smtpUseSsl, setSmtpUseSsl] = useState(true);
  const [emailNotificationEnabled, setEmailNotificationEnabled] = useState(true);
  const [testRecipientEmail, setTestRecipientEmail] = useState('budi.santoso@coreenterprise.local');
  const [selectedOutboxEmail, setSelectedOutboxEmail] = useState<any | null>(null);

  // Parameter Table Filter State
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Parameter Modal State
  const [paramModalOpen, setParamModalOpen] = useState(false);
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [isEditingSystemCore, setIsEditingSystemCore] = useState(false);
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('WORKFLOW');
  const [valueType, setValueType] = useState('STRING');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // i18n Dictionary Filter & Modal State
  const [i18nModuleFilter, setI18nModuleFilter] = useState('ALL');
  const [i18nSearch, setI18nSearch] = useState('');
  const [i18nModalOpen, setI18nModalOpen] = useState(false);
  const [editingI18nId, setEditingI18nId] = useState<string | null>(null);
  const [isEditingI18nCore, setIsEditingI18nCore] = useState(false);
  const [translationKey, setTranslationKey] = useState('');
  const [moduleGroup, setModuleGroup] = useState('GENERAL_UI');
  const [textId, setTextId] = useState('');
  const [textEn, setTextEn] = useState('');
  const [i18nDescription, setI18nDescription] = useState('');

  const { data: settingsData } = useQuery<{
    branding: any;
    emailConfig?: any;
    emailOutboxLogs?: any[];
    items: any[];
    i18nEntries: any[];
  }>({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/AppSettings');
      return res.data;
    },
  });

  useEffect(() => {
    if (settingsData?.branding) {
      const b = settingsData.branding;
      setTitleInput(b.appTitle);
      setSubtitleInput(b.appSubtitle);
      setLogoIconInput(b.appLogoIcon);
      setVersionBadgeInput(b.appVersionBadge);
      setCompanyNameInput(b.companyName);
      setBannerInput(b.systemAnnouncementBanner || '');
      setAppBranding(b);
    }
    if (settingsData?.emailConfig) {
      const ec = settingsData.emailConfig;
      setAdminSenderEmail(ec.adminSenderEmail || 'noreply-admin@coreenterprise.co.id');
      setAdminSenderName(ec.adminSenderName || 'CoreEnterprise System Administrator');
      setAdminSupportReplyTo(ec.adminSupportReplyTo || 'it-servicedesk@coreenterprise.co.id');
      setCcSecurityAuditEmail(ec.ccSecurityAuditEmail ?? 'security-audit@coreenterprise.co.id');
      setSmtpHost(ec.smtpHost || 'smtp.coreenterprise.co.id');
      setSmtpPort(ec.smtpPort || '587');
      setSmtpUsername(ec.smtpUsername || 'noreply-admin@coreenterprise.co.id');
      setSmtpUseSsl(ec.smtpUseSsl !== false);
      setEmailNotificationEnabled(ec.emailNotificationEnabled !== false);
    }
    if (settingsData?.i18nEntries) {
      applyDynamicI18nEntries(settingsData.i18nEntries);
    }
  }, [settingsData, setAppBranding]);

  const saveEmailConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/AppSettings/email-config', {
        adminSenderEmail,
        adminSenderName,
        adminSupportReplyTo,
        ccSecurityAuditEmail,
        smtpHost,
        smtpPort,
        smtpUsername,
        smtpUseSsl,
        emailNotificationEnabled,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Akun Email Admin Aplikasi Disimpan',
        message: data.message,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menyimpan Pengaturan Email',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/AppSettings/email-test', {
        recipientEmail: testRecipientEmail,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Email Uji Coba Terkirim',
        message: data.message,
        color: 'blue',
        icon: <IconMailForward size={16} />,
      });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Mengirim Email Uji Coba',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const saveBrandingMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        appTitle: titleInput,
        appSubtitle: subtitleInput,
        appLogoIcon: logoIconInput,
        appVersionBadge: versionBadgeInput,
        companyName: companyNameInput,
        systemAnnouncementBanner: bannerInput,
      };
      const res = await apiClient.post('/AppSettings/branding', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setAppBranding(data.branding);
      notifications.show({
        title: 'Identitas & Logo Aplikasi Diperbarui',
        message: data.message,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      setAppBranding({
        appTitle: titleInput,
        appSubtitle: subtitleInput,
        appLogoIcon: logoIconInput,
        appVersionBadge: versionBadgeInput,
        companyName: companyNameInput,
        systemAnnouncementBanner: bannerInput,
      });
      notifications.show({
        title: 'Disimpan ke Konfigurasi Lokal',
        message: err.response?.data?.message || 'Identitas aplikasi telah diperbarui pada sesi ini.',
        color: 'blue',
      });
    },
  });

  const openCreateParamModal = () => {
    setEditingParamId(null);
    setIsEditingSystemCore(false);
    setSettingKey('CUSTOM_PARAM_KEY');
    setSettingValue('');
    setDisplayName('');
    setCategory('WORKFLOW');
    setValueType('STRING');
    setDescription('');
    setIsPublic(true);
    setParamModalOpen(true);
  };

  const openEditParamModal = (item: any) => {
    setEditingParamId(item.id);
    setIsEditingSystemCore(!!item.isSystemCore);
    setSettingKey(item.settingKey);
    setSettingValue(item.settingValue);
    setDisplayName(item.displayName);
    setCategory(item.category || 'GENERAL');
    setValueType(item.valueType || 'STRING');
    setDescription(item.description || '');
    setIsPublic(item.isPublic !== false);
    setParamModalOpen(true);
  };

  const saveParamMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        settingKey,
        settingValue,
        displayName,
        category,
        valueType,
        description,
        isPublic,
      };
      if (editingParamId) {
        const res = await apiClient.put(`/AppSettings/${editingParamId}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/AppSettings', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      notifications.show({
        title: editingParamId ? 'Parameter Diperbarui' : 'Parameter Baru Ditambahkan',
        message: data.message,
        color: 'green',
      });
      setParamModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menyimpan Parameter',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const deleteParamMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/AppSettings/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Parameter Dihapus',
        message: data.message,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Tidak Dapat Menghapus Parameter',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  // i18n Dictionary Modal & Mutations
  const openCreateI18nModal = () => {
    setEditingI18nId(null);
    setIsEditingI18nCore(false);
    setTranslationKey('custom.labelKey');
    setModuleGroup('GENERAL_UI');
    setTextId('');
    setTextEn('');
    setI18nDescription('');
    setI18nModalOpen(true);
  };

  const openEditI18nModal = (entry: any) => {
    setEditingI18nId(entry.id);
    setIsEditingI18nCore(!!entry.isSystemCore);
    setTranslationKey(entry.translationKey);
    setModuleGroup(entry.moduleGroup || 'GENERAL_UI');
    setTextId(entry.textId);
    setTextEn(entry.textEn);
    setI18nDescription(entry.description || '');
    setI18nModalOpen(true);
  };

  const saveI18nMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        translationKey,
        moduleGroup,
        textId,
        textEn,
        description: i18nDescription,
      };
      if (editingI18nId) {
        const res = await apiClient.put(`/AppSettings/i18n/${editingI18nId}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/AppSettings/i18n', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      notifications.show({
        title: editingI18nId ? 'Terjemahan Diperbarui (ID & EN)' : 'Entri Kamus Baru Ditambahkan',
        message: data.message,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      setI18nModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menyimpan Kamus Bahasa',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const deleteI18nMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/AppSettings/i18n/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Entri Kamus Dihapus',
        message: data.message,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Tidak Dapat Menghapus Key Sistem',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const allItems = settingsData?.items || [];
  const filteredItems = allItems.filter((item) => {
    const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      (item.settingKey || '').toLowerCase().includes(q) ||
      (item.displayName || '').toLowerCase().includes(q) ||
      (item.settingValue || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const allI18nEntries = settingsData?.i18nEntries || [];
  const filteredI18n = allI18nEntries.filter((entry) => {
    const matchMod = i18nModuleFilter === 'ALL' || entry.moduleGroup === i18nModuleFilter;
    const q = i18nSearch.trim().toLowerCase();
    const matchSearch =
      !q ||
      (entry.translationKey || '').toLowerCase().includes(q) ||
      (entry.textId || '').toLowerCase().includes(q) ||
      (entry.textEn || '').toLowerCase().includes(q) ||
      (entry.description || '').toLowerCase().includes(q);
    return matchMod && matchSearch;
  });

  return (
    <Stack gap="lg">
      {isReadOnlyAuditor && (
        <Alert color="orange" icon={<IconAlertTriangle size={18} />} title="Mode Auditor (Global Read-Only)">
          Anda dapat menginspeksi seluruh konfigurasi identitas aplikasi, parameter sistem, dan kamus multi-bahasa, namun perubahan pengaturan dinonaktifkan.
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab} radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="branding" leftSection={<IconSettings size={16} />}>
            1. Identitas Aplikasi, Sub-Judul & Logo
          </Tabs.Tab>
          <Tabs.Tab value="email-config" leftSection={<IconMail size={16} />}>
            2. Akun Email Admin & SMTP Transaksi ({(settingsData?.emailOutboxLogs || []).length} Log)
          </Tabs.Tab>
          <Tabs.Tab value="parameters" leftSection={<IconKey size={16} />}>
            3. Master Parameter & Konfigurasi ({allItems.length})
          </Tabs.Tab>
          <Tabs.Tab value="i18n" leftSection={<IconLanguage size={16} />}>
            4. Kamus Multi-Bahasa (ID & EN) ({allI18nEntries.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* TAB 1: BRANDING, SUBTITLE & LOGO PICKER */}
        <Tabs.Panel value="branding">
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="md" wrap="wrap">
              <Group gap="xs">
                <ThemeIcon size="lg" radius="md" color={primaryColor} variant="light">
                  <IconSettings size={20} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Identitas Aplikasi, Sub-Judul & Kustomisasi Logo Korporat</Title>
                  <Text size="xs" c="dimmed">
                    Ubah judul utama aplikasi, sub-judul arsitektur, nama perusahaan, dan pilih ikon logo yang tampil di Top Header & Halaman Login
                  </Text>
                </div>
              </Group>

              <Button
                color={primaryColor}
                leftSection={<IconDeviceFloppy size={16} />}
                disabled={!canEditSettings}
                loading={saveBrandingMutation.isPending}
                onClick={() => saveBrandingMutation.mutate()}
              >
                Simpan Identitas & Logo Aplikasi
              </Button>
            </Group>

            {/* LIVE INTERACTIVE HEADER PREVIEW */}
            <Paper
              withBorder
              p="md"
              radius="md"
              mb="md"
              style={{
                background:
                  colorScheme === 'dark'
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'linear-gradient(135deg, #f8fafc 0%, #eef5ff 100%)',
              }}
            >
              <Group justify="space-between" wrap="wrap">
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon
                    size={44}
                    radius="md"
                    variant="gradient"
                    gradient={{ from: primaryColor, to: 'cyan', deg: 135 }}
                  >
                    {renderAppLogoIcon(logoIconInput, 24)}
                  </ThemeIcon>
                  <div>
                    <Group gap={6}>
                      <Title order={4} style={{ letterSpacing: '-0.2px' }}>
                        {titleInput || 'CoreEnterprise Portal'}
                      </Title>
                      <Badge size="xs" color={primaryColor} variant="light">
                        {versionBadgeInput || 'Enterprise v1.4.0'}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {subtitleInput || 'Otorisasi 2 Dimensi, Contextual DoA Header-Detail & 3-Axis Approver Resolution'}
                    </Text>
                  </div>
                </Group>

                <Badge variant="outline" color={primaryColor} leftSection={<IconSparkles size={12} />}>
                  Live Header Preview ({companyNameInput || 'Corporate Entity'})
                </Badge>
              </Group>
            </Paper>

            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput
                  label="Judul Utama Aplikasi (App Title)"
                  placeholder="CoreEnterprise Portal"
                  required
                  disabled={!canEditSettings}
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 5 }}>
                <TextInput
                  label="Nama Perusahaan / Entitas Hukum"
                  placeholder="PT CoreEnterprise Nusantara Tbk"
                  disabled={!canEditSettings}
                  value={companyNameInput}
                  onChange={(e) => setCompanyNameInput(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 3 }}>
                <TextInput
                  label="Label Badge Versi Aplikasi"
                  placeholder="Enterprise v1.4.0"
                  disabled={!canEditSettings}
                  value={versionBadgeInput}
                  onChange={(e) => setVersionBadgeInput(e.currentTarget.value)}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 7 }}>
                <TextInput
                  label="Sub-Judul Aplikasi (App Subtitle)"
                  placeholder="Otorisasi 2 Dimensi, Contextual DoA Header-Detail & 3-Axis Approver Resolution"
                  required
                  disabled={!canEditSettings}
                  value={subtitleInput}
                  onChange={(e) => setSubtitleInput(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 5 }}>
                <TextInput
                  label="Pengumuman Global / Maintenance Banner (Opsional)"
                  placeholder="Kosongkan jika tidak ada pengumuman aktif"
                  leftSection={<IconSpeakerphone size={16} />}
                  disabled={!canEditSettings}
                  value={bannerInput}
                  onChange={(e) => setBannerInput(e.currentTarget.value)}
                />
              </Grid.Col>
            </Grid>

            {/* VISUAL LOGO ICON PICKER GRID */}
            <Box mt="md">
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                  Pilih Ikon Logo Utama Aplikasi ({APP_LOGO_OPTIONS.length} Pilihan Ikon Enterprise)
                </Text>
                <Badge size="xs" variant="light" color={primaryColor}>
                  Terpilih: {logoIconInput}
                </Badge>
              </Group>

              <SimpleGrid cols={{ base: 2, sm: 4, md: 8 }} spacing="xs">
                {APP_LOGO_OPTIONS.map((opt) => {
                  const isSelected = logoIconInput === opt.value;
                  return (
                    <UnstyledButton
                      key={opt.value}
                      disabled={!canEditSettings}
                      onClick={() => setLogoIconInput(opt.value)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: isSelected
                          ? `2px solid var(--mantine-color-${primaryColor}-6)`
                          : '1px solid rgba(128, 128, 128, 0.22)',
                        backgroundColor: isSelected
                          ? colorScheme === 'dark'
                            ? 'rgba(24, 100, 171, 0.2)'
                            : 'rgba(24, 100, 171, 0.06)'
                          : 'transparent',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                      }}
                    >
                      <Stack align="center" gap={6}>
                        <ThemeIcon
                          size={36}
                          radius="md"
                          variant={isSelected ? 'gradient' : 'light'}
                          gradient={{ from: primaryColor, to: 'cyan', deg: 135 }}
                          color={isSelected ? primaryColor : 'gray'}
                        >
                          {renderAppLogoIcon(opt.value, 20)}
                        </ThemeIcon>
                        <div>
                          <Text size="11px" fw={isSelected ? 700 : 600} lineClamp={1}>
                            {opt.label}
                          </Text>
                          <Text size="9px" c="dimmed" lineClamp={1}>
                            {opt.category}
                          </Text>
                        </div>
                      </Stack>
                    </UnstyledButton>
                  );
                })}
              </SimpleGrid>
            </Box>
          </Card>
        </Tabs.Panel>

        {/* TAB 2: AKUN EMAIL ADMIN APLIKASI, SMTP RELAY & LOG OUTBOX TRANSAKSI */}
        <Tabs.Panel value="email-config">
          <Stack gap="lg">
            <Card withBorder radius="md" padding="lg">
              <Group justify="space-between" mb="md" wrap="wrap">
                <Group gap="xs">
                  <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                    <IconMail size={20} />
                  </ThemeIcon>
                  <div>
                    <Title order={4}>Konfigurasi Akun Email Admin Aplikasi & SMTP Transaksi Global</Title>
                    <Text size="xs" c="dimmed">
                      Digunakan secara terpusat untuk mengirim email pemberitahuan otomatis saat IT Servicedesk mengunci/membuka akun, mereset kata sandi, serta notifikasi persetujuan modul transaksi (PO, DCP, Workflow)
                    </Text>
                  </div>
                </Group>

                <Button
                  color="blue"
                  leftSection={<IconDeviceFloppy size={16} />}
                  disabled={!canEditSettings}
                  loading={saveEmailConfigMutation.isPending}
                  onClick={() => saveEmailConfigMutation.mutate()}
                >
                  Simpan Akun Email Admin Aplikasi
                </Button>
              </Group>

              {/* LIVE OUTBOUND EMAIL HEADER PREVIEW */}
              <Paper
                withBorder
                p="md"
                radius="md"
                mb="md"
                style={{
                  background:
                    colorScheme === 'dark'
                      ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)'
                      : 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                }}
              >
                <Group justify="space-between" wrap="wrap">
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Badge size="xs" color={emailNotificationEnabled ? 'teal' : 'red'} variant="filled">
                        {emailNotificationEnabled ? 'EMAIL ENGINE ACTIVE' : 'EMAIL ENGINE DISABLED'}
                      </Badge>
                      <Text size="xs" fw={700}>
                        From: {adminSenderName || 'CoreEnterprise System Administrator'} &lt;{adminSenderEmail || 'noreply-admin@coreenterprise.co.id'}&gt;
                      </Text>
                    </Group>
                    <Group gap="md" wrap="wrap">
                      <Text size="xs" c="dimmed">
                        <b>Reply-To Helpdesk:</b> {adminSupportReplyTo || '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        <b>CC Security Audit:</b> {ccSecurityAuditEmail || '(Tidak ada CC)'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        <b>SMTP Relay:</b> {smtpHost}:{smtpPort} ({smtpUseSsl ? 'STARTTLS/SSL' : 'Plain'})
                      </Text>
                    </Group>
                  </Stack>

                  <Group gap="xs">
                    <TextInput
                      size="xs"
                      placeholder="Email tujuan uji coba..."
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.currentTarget.value)}
                      style={{ width: 240 }}
                    />
                    <Button
                      size="xs"
                      variant="light"
                      color="indigo"
                      leftSection={<IconSend size={14} />}
                      loading={sendTestEmailMutation.isPending}
                      onClick={() => sendTestEmailMutation.mutate()}
                    >
                      Uji Kirim Email
                    </Button>
                  </Group>
                </Group>
              </Paper>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <EnterpriseFormSection
                    title="1. Identitas Akun Email Admin Aplikasi (Sender & Reply-To)"
                    subtitle="Alamat email resmi pengirim notifikasi keamanan akun (Lock/Unlock/Reset Password) dan transaksi"
                    icon={<IconMail size={16} />}
                    iconColor="blue"
                  >
                    <Stack gap="sm">
                      <TextInput
                        label="Alamat Email Admin Aplikasi (ADMIN_SENDER_EMAIL)"
                        placeholder="noreply-admin@coreenterprise.co.id"
                        required
                        disabled={!canEditSettings}
                        value={adminSenderEmail}
                        onChange={(e) => setAdminSenderEmail(e.currentTarget.value)}
                      />
                      <TextInput
                        label="Nama Tampilan Pengirim Email (ADMIN_SENDER_NAME)"
                        placeholder="CoreEnterprise System Administrator"
                        required
                        disabled={!canEditSettings}
                        value={adminSenderName}
                        onChange={(e) => setAdminSenderName(e.currentTarget.value)}
                      />
                      <TextInput
                        label="Alamat Email Reply-To / Helpdesk IT (ADMIN_SUPPORT_REPLY_TO)"
                        placeholder="it-servicedesk@coreenterprise.co.id"
                        disabled={!canEditSettings}
                        value={adminSupportReplyTo}
                        onChange={(e) => setAdminSupportReplyTo(e.currentTarget.value)}
                      />
                      <TextInput
                        label="Alamat CC Audit Keamanan & Transaksi Penting (EMAIL_CC_SECURITY_AUDIT)"
                        placeholder="security-audit@coreenterprise.co.id (Kosongkan jika tidak perlu CC)"
                        disabled={!canEditSettings}
                        value={ccSecurityAuditEmail}
                        onChange={(e) => setCcSecurityAuditEmail(e.currentTarget.value)}
                      />
                    </Stack>
                  </EnterpriseFormSection>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <EnterpriseFormSection
                    title="2. Konfigurasi Server Relay SMTP & Status Pengiriman"
                    subtitle="Parameter koneksi server email korporat untuk pengiriman pesan keluar"
                    icon={<IconServer size={16} />}
                    iconColor="indigo"
                  >
                    <Stack gap="sm">
                      <Grid>
                        <Grid.Col span={{ base: 12, md: 8 }}>
                          <TextInput
                            label="Host Server SMTP (SMTP_HOST)"
                            placeholder="smtp.coreenterprise.co.id"
                            disabled={!canEditSettings}
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.currentTarget.value)}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <TextInput
                            label="Port SMTP (SMTP_PORT)"
                            placeholder="587"
                            disabled={!canEditSettings}
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(e.currentTarget.value)}
                          />
                        </Grid.Col>
                      </Grid>

                      <TextInput
                        label="Username Autentikasi Akun Email Admin (SMTP_USERNAME)"
                        placeholder="noreply-admin@coreenterprise.co.id"
                        disabled={!canEditSettings}
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.currentTarget.value)}
                      />

                      <EnterpriseSwitchCard
                        checked={smtpUseSsl}
                        onChange={(val) => canEditSettings && setSmtpUseSsl(val)}
                        title={smtpUseSsl ? 'Enkripsi Transport: STARTTLS / SSL Aktif' : 'Enkripsi Transport: Plain SMTP'}
                        description="Mengamankan koneksi pengiriman email keluar menggunakan sertifikat TLS korporat"
                        activeColor="indigo"
                      />

                      <EnterpriseSwitchCard
                        checked={emailNotificationEnabled}
                        onChange={(val) => canEditSettings && setEmailNotificationEnabled(val)}
                        title={
                          emailNotificationEnabled
                            ? 'Pengiriman Email Otomatis: AKTIF (Servicedesk & Transaksi)'
                            : 'Pengiriman Email Otomatis: NONAKTIF'
                        }
                        description="Saat aktif, setiap tindakan Lock/Unlock Akun, Reset Password, dan Keputusan Approval otomatis mengirim email ke pengguna terkait"
                        activeColor="teal"
                      />
                    </Stack>
                  </EnterpriseFormSection>
                </Grid.Col>
              </Grid>
            </Card>

            {/* TABEL LOG OUTBOX PENGIRIMAN EMAIL APLIKASI */}
            <Card withBorder radius="md" padding="lg">
              <Group justify="space-between" mb="md" wrap="wrap">
                <Group gap="xs">
                  <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                    <IconMailForward size={20} />
                  </ThemeIcon>
                  <div>
                    <Title order={4}>Log Pengiriman Email Aplikasi (Email Outbox & Security Audit Trail)</Title>
                    <Text size="xs" c="dimmed">
                      Rekam jejak seluruh email pemberitahuan yang dikirim oleh Akun Email Admin Aplikasi ke pengguna (Lock/Unlock Akun, Reset Password, dan Transaksi)
                    </Text>
                  </div>
                </Group>
                <Badge color="teal" variant="light" size="lg">
                  {(settingsData?.emailOutboxLogs || []).length} Email Tercatat
                </Badge>
              </Group>

              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Waktu Kirim</Table.Th>
                    <Table.Th>Modul & Event</Table.Th>
                    <Table.Th>Pengirim (Email Admin)</Table.Th>
                    <Table.Th>Penerima (Email User)</Table.Th>
                    <Table.Th>Subjek Email</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th ta="right">Isi Email</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(settingsData?.emailOutboxLogs || []).length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7} ta="center" py="lg">
                        <Text size="xs" c="dimmed">
                          Belum ada riwayat pengiriman email. Coba lakukan Lock/Unlock Akun atau Reset Password di menu IT Servicedesk, atau klik tombol "Uji Kirim Email" di atas.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    (settingsData?.emailOutboxLogs || []).map((log: any) => (
                      <Table.Tr key={log.id}>
                        <Table.Td>
                          <Text size="xs" fw={600}>
                            {new Date(log.createdAt).toLocaleString('id-ID')}
                          </Text>
                          {log.referenceCode && (
                            <Code fz="10px">{log.referenceCode}</Code>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="xs"
                            color={
                              log.eventType?.includes('LOCKED') && !log.eventType?.includes('UNLOCKED')
                                ? 'red'
                                : log.eventType?.includes('UNLOCKED')
                                ? 'teal'
                                : log.eventType?.includes('PASSWORD_RESET')
                                ? 'orange'
                                : 'blue'
                            }
                          >
                            {log.eventType}
                          </Badge>
                          <Text size="10px" c="dimmed" mt={2}>
                            Sumber: {log.moduleSource}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={600}>
                            {log.senderName}
                          </Text>
                          <Code fz="10px">{log.senderEmail}</Code>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={700}>
                            {log.recipientName}
                          </Text>
                          <Code fz="10px" color="blue">
                            {log.recipientEmail}
                          </Code>
                        </Table.Td>
                        <Table.Td style={{ maxWidth: 280 }}>
                          <Text size="xs" fw={600} lineClamp={2}>
                            {log.subject}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" color={log.deliveryStatus === 'DISABLED_SKIPPED' ? 'gray' : 'teal'} variant="light">
                            {log.deliveryStatus}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="blue"
                            leftSection={<IconEye size={13} />}
                            onClick={() => setSelectedOutboxEmail(log)}
                          >
                            Lihat Email
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Card>
          </Stack>
        </Tabs.Panel>

        {/* TAB 3: TABEL MASTER PARAMETER & KONFIGURASI APLIKASI */}
        <Tabs.Panel value="parameters">
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="md" wrap="wrap">
              <Group gap="xs">
                <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                  <IconKey size={20} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Tabel Master Parameter & Konfigurasi Sistem (Key-Value Registry)</Title>
                  <Text size="xs" c="dimmed">
                    Daftar seluruh parameter pengaturan aplikasi (Branding, SLA Workflow, Keamanan JWT, DMS, dan Parameter Kustom) yang tersimpan di PostgreSQL
                  </Text>
                </div>
              </Group>

              <Button
                color="teal"
                leftSection={<IconPlus size={16} />}
                disabled={!canEditSettings}
                onClick={openCreateParamModal}
              >
                + Tambah Parameter Konfigurasi
              </Button>
            </Group>

            <Grid mb="md" align="center">
              <Grid.Col span={{ base: 12, md: 5 }}>
                <TextInput
                  placeholder="Cari berdasarkan SettingKey, Nama Parameter, atau Nilai..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 7 }}>
                <SegmentedControl
                  fullWidth
                  size="xs"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  data={[
                    { label: `Semua (${allItems.length})`, value: 'ALL' },
                    { label: 'BRANDING', value: 'BRANDING' },
                    { label: 'EMAIL', value: 'EMAIL' },
                    { label: 'WORKFLOW', value: 'WORKFLOW' },
                    { label: 'SECURITY', value: 'SECURITY' },
                    { label: 'DMS', value: 'DMS' },
                    { label: 'GENERAL', value: 'GENERAL' },
                  ]}
                />
              </Grid.Col>
            </Grid>

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Kode Parameter (SettingKey)</Table.Th>
                  <Table.Th>Nama & Deskripsi Parameter</Table.Th>
                  <Table.Th>Kategori</Table.Th>
                  <Table.Th>Nilai Aktif (SettingValue)</Table.Th>
                  <Table.Th>Tipe</Table.Th>
                  <Table.Th>Sifat</Table.Th>
                  <Table.Th ta="right">Aksi</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredItems.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Text size="xs" fw={700} ff="monospace">
                        {item.settingKey}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 280 }}>
                      <Text size="sm" fw={600}>
                        {item.displayName}
                      </Text>
                      {item.description && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {item.description}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="xs"
                        variant="light"
                        color={
                          item.category === 'BRANDING'
                            ? 'blue'
                            : item.category === 'WORKFLOW'
                            ? 'indigo'
                            : item.category === 'SECURITY'
                            ? 'grape'
                            : 'teal'
                        }
                      >
                        {item.category}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 260 }}>
                      {item.valueType === 'ICON' ? (
                        <Group gap="xs">
                          <ThemeIcon size={26} radius="md" color={primaryColor} variant="light">
                            {renderAppLogoIcon(item.settingValue, 15)}
                          </ThemeIcon>
                          <Text size="xs" fw={700}>
                            {item.settingValue}
                          </Text>
                        </Group>
                      ) : (
                        <Text size="sm" fw={700} truncate>
                          {item.settingValue || (
                            <Text span c="dimmed" size="xs">
                              (Kosong)
                            </Text>
                          )}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" variant="outline" color="gray">
                        {item.valueType}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" color={item.isSystemCore ? 'indigo' : 'cyan'} variant="light">
                        {item.isSystemCore ? 'CORE SYSTEM' : 'CUSTOM'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} justify="flex-end" wrap="nowrap">
                        <Button
                          size="compact-xs"
                          variant="light"
                          leftSection={<IconEdit size={13} />}
                          disabled={!canEditSettings}
                          onClick={() => openEditParamModal(item)}
                        >
                          Edit
                        </Button>
                        <Tooltip
                          label={
                            item.isSystemCore
                              ? 'Parameter inti sistem tidak dapat dihapus'
                              : 'Hapus Parameter Kustom'
                          }
                        >
                          <ActionIcon
                            color="red"
                            variant="light"
                            disabled={!canEditSettings || item.isSystemCore}
                            onClick={() => {
                              if (window.confirm(`Hapus parameter '${item.settingKey}'?`)) {
                                deleteParamMutation.mutate(item.id);
                              }
                            }}
                          >
                            <IconTrash size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        {/* TAB 3: KAMUS MULTI-BAHASA (i18n DICTIONARY — ID & EN) */}
        <Tabs.Panel value="i18n">
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="md" wrap="wrap">
              <Group gap="xs">
                <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
                  <IconLanguage size={22} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Kamus Multi-Bahasa (i18n Dictionary — Bahasa Indonesia & English)</Title>
                  <Text size="xs" c="dimmed">
                    Kelola terjemahan menu navigasi, header aplikasi, kartu KPI dashboard, dan simulator secara dinamis dari PostgreSQL
                  </Text>
                </div>
              </Group>

              <Group gap="xs">
                <Paper withBorder px="xs" py={4} radius="md">
                  <Group gap="xs">
                    <Text size="xs" fw={700} c="dimmed">
                      Bahasa Aktif Saat Ini:
                    </Text>
                    <SegmentedControl
                      size="xs"
                      value={language}
                      onChange={(val) => setLanguage(val as 'id' | 'en')}
                      data={[
                        { label: '🇮🇩 ID (Indonesia)', value: 'id' },
                        { label: '🇬🇧 EN (English)', value: 'en' },
                      ]}
                    />
                  </Group>
                </Paper>

                <Button
                  color="indigo"
                  leftSection={<IconPlus size={16} />}
                  disabled={!canEditSettings}
                  onClick={openCreateI18nModal}
                >
                  + Tambah Key Terjemahan
                </Button>
              </Group>
            </Group>

            <Grid mb="md" align="center">
              <Grid.Col span={{ base: 12, md: 5 }}>
                <TextInput
                  placeholder="Cari berdasarkan TranslationKey, teks Indonesia (ID), atau teks Inggris (EN)..."
                  leftSection={<IconSearch size={16} />}
                  value={i18nSearch}
                  onChange={(e) => setI18nSearch(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 7 }}>
                <SegmentedControl
                  fullWidth
                  size="xs"
                  value={i18nModuleFilter}
                  onChange={setI18nModuleFilter}
                  data={[
                    { label: `Semua (${allI18nEntries.length})`, value: 'ALL' },
                    { label: 'MENU_NAVIGATION', value: 'MENU_NAVIGATION' },
                    { label: 'HEADER_BRANDING', value: 'HEADER_BRANDING' },
                    { label: 'DASHBOARD_KPI', value: 'DASHBOARD_KPI' },
                    { label: 'WORKFLOW_SIMULATOR', value: 'WORKFLOW_SIMULATOR' },
                    { label: 'GENERAL_UI', value: 'GENERAL_UI' },
                  ]}
                />
              </Grid.Col>
            </Grid>

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Translation Key</Table.Th>
                  <Table.Th>Grup Modul</Table.Th>
                  <Table.Th>🇮🇩 Teks Bahasa Indonesia (ID)</Table.Th>
                  <Table.Th>🇬🇧 Teks Bahasa Inggris (EN)</Table.Th>
                  <Table.Th>Sifat</Table.Th>
                  <Table.Th ta="right">Aksi</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredI18n.map((entry) => (
                  <Table.Tr key={entry.id}>
                    <Table.Td>
                      <Code fw={700}>{entry.translationKey}</Code>
                      {entry.description && (
                        <Text size="10px" c="dimmed" mt={2}>
                          {entry.description}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="xs"
                        variant="light"
                        color={
                          entry.moduleGroup === 'MENU_NAVIGATION'
                            ? 'indigo'
                            : entry.moduleGroup === 'HEADER_BRANDING'
                            ? 'blue'
                            : entry.moduleGroup === 'DASHBOARD_KPI'
                            ? 'teal'
                            : 'grape'
                        }
                      >
                        {entry.moduleGroup}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 260 }}>
                      <Text size="sm" fw={language === 'id' ? 700 : 500}>
                        {entry.textId}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 260 }}>
                      <Text size="sm" fw={language === 'en' ? 700 : 500} c={language === 'en' ? 'blue' : undefined}>
                        {entry.textEn}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" color={entry.isSystemCore ? 'indigo' : 'cyan'} variant="light">
                        {entry.isSystemCore ? 'CORE KEY' : 'CUSTOM'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} justify="flex-end" wrap="nowrap">
                        <Button
                          size="compact-xs"
                          variant="light"
                          color="indigo"
                          leftSection={<IconEdit size={13} />}
                          disabled={!canEditSettings}
                          onClick={() => openEditI18nModal(entry)}
                        >
                          Edit ID/EN
                        </Button>
                        <Tooltip
                          label={
                            entry.isSystemCore
                              ? 'Key sistem tidak dapat dihapus (namun teks ID & EN dapat diedit)'
                              : 'Hapus Key Kustom'
                          }
                        >
                          <ActionIcon
                            color="red"
                            variant="light"
                            disabled={!canEditSettings || entry.isSystemCore}
                            onClick={() => {
                              if (window.confirm(`Hapus key terjemahan '${entry.translationKey}'?`)) {
                                deleteI18nMutation.mutate(entry.id);
                              }
                            }}
                          >
                            <IconTrash size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* ENTERPRISE MODAL: ADD / EDIT PARAMETER SETTING */}
      <EnterpriseModalShell
        opened={paramModalOpen}
        onClose={() => setParamModalOpen(false)}
        title={editingParamId ? `Edit Parameter Aplikasi` : 'Tambah Parameter Konfigurasi Baru'}
        subtitle="Simpan parameter operasional, batas SLA, atau pengaturan fitur kustom ke dalam tabel AppSettingItems"
        badgeText={editingParamId ? `EDIT: ${settingKey}` : 'PARAMETER BARU'}
        badgeColor={editingParamId ? 'blue' : 'teal'}
        icon={<IconSettings size={22} />}
        size="lg"
        submitLabel="Simpan Parameter"
        loading={saveParamMutation.isPending}
        onSubmit={() => saveParamMutation.mutate()}
      >
        <EnterpriseFormSection
          title="1. Spesifikasi Kunci & Kategori Parameter"
          subtitle="Kode unik parameter (SettingKey), nama tampilan, kategori modul, dan tipe data"
          icon={<IconKey size={16} />}
          iconColor="blue"
        >
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Kode Parameter (SettingKey)"
                placeholder="WORKFLOW_MAX_REVISION_CYCLES"
                required
                disabled={isEditingSystemCore}
                value={settingKey}
                onChange={(e) => setSettingKey(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <Select
                label="Kategori Modul"
                disabled={isEditingSystemCore}
                value={category}
                onChange={(v) => setCategory(v || 'GENERAL')}
                data={['BRANDING', 'EMAIL', 'WORKFLOW', 'SECURITY', 'DMS', 'NOTIFICATION', 'GENERAL']}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <Select
                label="Tipe Nilai"
                disabled={isEditingSystemCore}
                value={valueType}
                onChange={(v) => setValueType(v || 'STRING')}
                data={['STRING', 'EMAIL', 'NUMBER', 'BOOLEAN', 'ICON', 'JSON']}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <TextInput
                label="Nama Tampilan Parameter (DisplayName)"
                placeholder="Batas Maksimal Siklus Revisi Dokumen"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>

        <EnterpriseFormSection
          title="2. Nilai Aktif & Deskripsi Parameter"
          subtitle="Nilai konfigurasi yang akan dibaca oleh layanan Backend maupun UI"
          icon={<IconSettings size={16} />}
          iconColor="teal"
        >
          <Stack gap="sm">
            {valueType === 'ICON' ? (
              <Select
                label="Pilih Ikon Aplikasi (SettingValue)"
                value={settingValue}
                onChange={(v) => setSettingValue(v || 'IconShieldLock')}
                data={APP_LOGO_OPTIONS.map((o) => ({
                  value: o.value,
                  label: `${o.label} (${o.value}) — ${o.category}`,
                }))}
              />
            ) : (
              <TextInput
                label="Nilai Parameter (SettingValue)"
                placeholder="Masukkan nilai konfigurasi..."
                required
                value={settingValue}
                onChange={(e) => setSettingValue(e.currentTarget.value)}
              />
            )}

            <Textarea
              label="Deskripsi & Dokumentasi Parameter"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />

            <EnterpriseSwitchCard
              checked={isPublic}
              onChange={setIsPublic}
              title={isPublic ? 'Aksesibilitas: PUBLIC (Tersedia Sebelum Login)' : 'Aksesibilitas: INTERNAL (Wajib Login JWT)'}
              description="Parameter PUBLIC dapat diakses oleh halaman Login sebelum autentikasi"
              activeColor="teal"
            />
          </Stack>
        </EnterpriseFormSection>
      </EnterpriseModalShell>

      {/* ENTERPRISE MODAL: ADD / EDIT KAMUS MULTI-BAHASA (i18n DICTIONARY) */}
      <EnterpriseModalShell
        opened={i18nModalOpen}
        onClose={() => setI18nModalOpen(false)}
        title={editingI18nId ? 'Edit Terjemahan Multi-Bahasa (ID & EN)' : 'Tambah Key Kamus Bahasa Baru'}
        subtitle="Perubahan teks Bahasa Indonesia (ID) dan Bahasa Inggris (EN) langsung diterapkan ke antarmuka secara real-time"
        badgeText={editingI18nId ? `KEY: ${translationKey}` : 'NEW I18N KEY'}
        badgeColor="indigo"
        icon={<IconLanguage size={22} />}
        size="lg"
        submitLabel="Simpan Terjemahan (ID & EN)"
        submitColor="indigo"
        loading={saveI18nMutation.isPending}
        onSubmit={() => saveI18nMutation.mutate()}
      >
        <EnterpriseFormSection
          title="1. Identitas Translation Key & Modul"
          subtitle="Format menu.<menuCode>.title otomatis menyinkronkan judul menu di Sidebar"
          icon={<IconKey size={16} />}
          iconColor="indigo"
        >
          <Grid>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <TextInput
                label="Translation Key"
                placeholder="Contoh: menu.transactions.title atau kpiInboxTitle"
                required
                disabled={isEditingI18nCore}
                value={translationKey}
                onChange={(e) => setTranslationKey(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Select
                label="Grup Modul UI"
                disabled={isEditingI18nCore}
                value={moduleGroup}
                onChange={(v) => setModuleGroup(v || 'GENERAL_UI')}
                data={[
                  'MENU_NAVIGATION',
                  'HEADER_BRANDING',
                  'DASHBOARD_KPI',
                  'WORKFLOW_SIMULATOR',
                  'GENERAL_UI',
                ]}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput
                label="Keterangan / Lokasi Penggunaan di Layar"
                placeholder="Penjelasan singkat bagian layar yang menggunakan key ini"
                value={i18nDescription}
                onChange={(e) => setI18nDescription(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>

        <EnterpriseFormSection
          title="2. Teks Terjemahan Dwi-Bahasa (ID & EN)"
          subtitle="Masukkan kalimat dalam Bahasa Indonesia dan Bahasa Inggris"
          icon={<IconLanguage size={16} />}
          iconColor="teal"
        >
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Textarea
              label="🇮🇩 Teks Bahasa Indonesia (ID)"
              placeholder="Masukkan teks dalam Bahasa Indonesia..."
              rows={3}
              required
              value={textId}
              onChange={(e) => setTextId(e.currentTarget.value)}
            />
            <Textarea
              label="🇬🇧 Teks Bahasa Inggris (EN)"
              placeholder="Enter text in English..."
              rows={3}
              required
              value={textEn}
              onChange={(e) => setTextEn(e.currentTarget.value)}
            />
          </SimpleGrid>
        </EnterpriseFormSection>
      </EnterpriseModalShell>

      {/* ENTERPRISE MODAL: INSPEKSI ISI EMAIL OUTBOX */}
      <EnterpriseModalShell
        opened={!!selectedOutboxEmail}
        onClose={() => setSelectedOutboxEmail(null)}
        title="Inspeksi Rincian Pengiriman Email Aplikasi"
        subtitle="Detail amplop SMTP (From, To, Reply-To, CC) dan isi pesan email resmi yang dikirim oleh sistem"
        badgeText={selectedOutboxEmail?.eventType || 'EMAIL DISPATCH'}
        badgeColor="blue"
        icon={<IconMailForward size={22} />}
        size="lg"
        footer={
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSelectedOutboxEmail(null)}>
              Tutup Pratinjau Email
            </Button>
          </Group>
        }
      >
        {selectedOutboxEmail && (
          <Stack gap="md">
            <EnterpriseFormSection
              title="1. Informasi Amplop & Routing SMTP"
              subtitle={`Dikirim melalui ${selectedOutboxEmail.smtpHostUsed || 'SMTP Relay'} pada ${new Date(
                selectedOutboxEmail.createdAt
              ).toLocaleString('id-ID')}`}
              icon={<IconMail size={16} />}
              iconColor="blue"
            >
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                <Paper withBorder p="xs" radius="sm">
                  <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                    Pengirim (Email Admin Aplikasi)
                  </Text>
                  <Text size="xs" fw={700}>
                    {selectedOutboxEmail.senderName}
                  </Text>
                  <Code fz="11px">{selectedOutboxEmail.senderEmail}</Code>
                </Paper>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                    Penerima (Email Pengguna Terkait)
                  </Text>
                  <Text size="xs" fw={700}>
                    {selectedOutboxEmail.recipientName}
                  </Text>
                  <Code fz="11px" color="blue">
                    {selectedOutboxEmail.recipientEmail}
                  </Code>
                </Paper>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                    Reply-To & Salinan Audit (CC)
                  </Text>
                  <Text size="xs">
                    <b>Reply-To:</b> {selectedOutboxEmail.replyToEmail || '-'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    <b>CC:</b> {selectedOutboxEmail.ccEmails || '-'}
                  </Text>
                </Paper>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                    Modul Sumber & Status Pengiriman
                  </Text>
                  <Group gap="xs" mt={4}>
                    <Badge size="xs" color="indigo">
                      {selectedOutboxEmail.moduleSource}
                    </Badge>
                    <Badge size="xs" color="teal">
                      {selectedOutboxEmail.deliveryStatus}
                    </Badge>
                  </Group>
                </Paper>
              </SimpleGrid>
            </EnterpriseFormSection>

            <EnterpriseFormSection
              title="2. Subjek & Isi Pesan Email"
              subtitle={selectedOutboxEmail.subject}
              icon={<IconMailForward size={16} />}
              iconColor="teal"
            >
              <Paper withBorder p="sm" radius="md" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
                {selectedOutboxEmail.bodyText}
              </Paper>
            </EnterpriseFormSection>
          </Stack>
        )}
      </EnterpriseModalShell>
    </Stack>
  );
}
