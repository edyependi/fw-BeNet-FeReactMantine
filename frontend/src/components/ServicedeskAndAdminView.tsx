import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Code,
  Grid,
  Group,
  MultiSelect,
  Paper,
  PasswordInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconBuildingPlus,
  IconCheck,
  IconClockExclamation,
  IconClockHour4,
  IconEye,
  IconHeadset,
  IconKey,
  IconLock,
  IconLockOpen,
  IconMail,
  IconMailForward,
  IconRefresh,
  IconSearch,
  IconShieldCog,
  IconUserCog,
  IconUsers,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAccess } from '../hooks/useAccess';
import { EnterpriseFormSection, EnterpriseModalShell } from './EnterpriseModalShell';

const formatIDR = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

/**
 * MENU 1: Dedicated Workflow SLA & Bottleneck Monitor
 */
export function SlaMonitorView() {
  const queryClient = useQueryClient();
  const { isReadOnlyAuditor } = useAccess();

  const [search, setSearch] = useState('');
  const [slaFilter, setSlaFilter] = useState<string>('ALL');
  const [selectedBottleneck, setSelectedBottleneck] = useState<any | null>(null);

  const { data: bottlenecks = [], isFetching } = useQuery<any[]>({
    queryKey: ['servicedesk-bottlenecks'],
    queryFn: async () => {
      const res = await apiClient.get('/Servicedesk/bottlenecks');
      return res.data;
    },
  });

  const filteredBottlenecks = bottlenecks.filter((b) => {
    if (slaFilter === 'OVERDUE' && !b.isOverdue) return false;
    if (slaFilter === 'ON_TRACK' && b.isOverdue) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        (b.referenceNumber || '').toLowerCase().includes(q) ||
        (b.docTypeCode || '').toLowerCase().includes(q) ||
        (b.subCategoryCode || '').toLowerCase().includes(q) ||
        (b.requesterName || '').toLowerCase().includes(q) ||
        (b.assignedUserName || '').toLowerCase().includes(q) ||
        (b.targetJobLevelCode || '').toLowerCase().includes(q) ||
        (b.resolvedOrgUnitCode || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const overdueCount = bottlenecks.filter((b) => b.isOverdue).length;
  const onTrackCount = bottlenecks.length - overdueCount;
  const totalStuckAmount = bottlenecks.reduce((acc, b) => acc + (Number(b.transactionAmount) || 0), 0);

  return (
    <Stack gap="lg">
      {isReadOnlyAuditor && (
        <Alert color="orange" icon={<IconAlertTriangle size={18} />} title="Mode Auditor (Global Read-Only)">
          Anda dapat menginspeksi seluruh antrean SLA dan bottleneck persetujuan di halaman ini secara penuh (Read-Only).
        </Alert>
      )}

      {/* SLA KPI Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Antrean Pending
              </Text>
              <Title order={3} mt={4}>
                {bottlenecks.length} Tahapan
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Menunggu keputusan Approver
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="blue" variant="light">
              <IconClockHour4 size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Melewati Batas SLA (Overdue)
              </Text>
              <Title order={3} mt={4} c={overdueCount > 0 ? 'red' : 'teal'}>
                {overdueCount} Bottleneck
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Perlu tindak lanjut / eskalasi
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color={overdueCount > 0 ? 'red' : 'teal'} variant="light">
              <IconClockExclamation size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Dalam Target SLA (On-Track)
              </Text>
              <Title order={3} mt={4} c="teal">
                {onTrackCount} Tahapan
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Masih dalam batas jam SLA
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="teal" variant="light">
              <IconCheck size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Nilai Eksposur Tertahan
              </Text>
              <Title order={4} mt={4} c="indigo">
                {formatIDR(totalStuckAmount)}
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Akumulasi dokumen berstatus PENDING
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="indigo" variant="light">
              <IconClockExclamation size={24} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Main SLA & Bottleneck Table */}
      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap">
          <Group gap="sm">
            <ThemeIcon size={40} radius="md" color={overdueCount > 0 ? 'red' : 'blue'} variant="light">
              <IconClockExclamation size={22} />
            </ThemeIcon>
            <div>
              <Title order={4}>Workflow Bottleneck & SLA Monitoring Inspector</Title>
              <Text size="xs" c="dimmed">
                Pantau posisi dokumen yang tertahan di meja Approver beserta sisa waktu SLA tanpa dapat mengubah nilai transaksi (SoD Compliant)
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Badge color={overdueCount > 0 ? 'red' : 'teal'} size="lg">
              {filteredBottlenecks.length} Tahapan Ditampilkan
            </Badge>
            <Button
              size="xs"
              variant="default"
              leftSection={<IconRefresh size={14} />}
              loading={isFetching}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['servicedesk-bottlenecks'] })}
            >
              Segarkan SLA
            </Button>
          </Group>
        </Group>

        <Paper withBorder p="sm" radius="md" mb="md">
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 7 }}>
              <TextInput
                size="xs"
                placeholder="Cari nomor dokumen (PO/DCP), nama pengaju, pejabat approver, atau kode unit..."
                leftSection={<IconSearch size={14} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <SegmentedControl
                fullWidth
                size="xs"
                value={slaFilter}
                onChange={setSlaFilter}
                data={[
                  { label: `Semua (${bottlenecks.length})`, value: 'ALL' },
                  { label: `Overdue SLA (${overdueCount})`, value: 'OVERDUE' },
                  { label: `On-Track (${onTrackCount})`, value: 'ON_TRACK' },
                ]}
              />
            </Grid.Col>
          </Grid>
        </Paper>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>No. Dokumen</Table.Th>
              <Table.Th>Tipe / Sub-Kategori</Table.Th>
              <Table.Th>Nilai Transaksi (Read-Only)</Table.Th>
              <Table.Th>Pengaju (Requester)</Table.Th>
              <Table.Th>Tertahan di Step / Jabatan</Table.Th>
              <Table.Th>Pejabat Approver</Table.Th>
              <Table.Th>Status & Waktu SLA</Table.Th>
              <Table.Th>Detail</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredBottlenecks.map((b) => (
              <Table.Tr key={b.stepId}>
                <Table.Td fw={700}>
                  {b.referenceNumber}{' '}
                  <Badge size="xs" variant="light" color="gray">
                    Siklus #{b.currentRevisionCycle}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge>{b.docTypeCode}</Badge>{' '}
                  <Badge variant="outline" color="grape">
                    {b.subCategoryCode}
                  </Badge>
                </Table.Td>
                <Table.Td fw={700}>{formatIDR(b.transactionAmount)}</Table.Td>
                <Table.Td>
                  <Text size="xs" fw={600}>
                    {b.requesterName}
                  </Text>
                  <Text size="10px" c="dimmed">
                    Unit: {b.requesterOrgCode}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="indigo" variant="light">
                    Step #{b.sequence}: {b.targetJobLevelCode} @ {b.resolvedOrgUnitCode}
                  </Badge>
                </Table.Td>
                <Table.Td fw={600}>{b.assignedUserName}</Table.Td>
                <Table.Td>
                  <Badge color={b.isOverdue ? 'red' : 'teal'} variant="filled">
                    {b.isOverdue ? `OVERDUE (${Math.abs(b.hoursRemaining)} Jam)` : `${b.hoursRemaining} Jam Tersisa`}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Tooltip label="Inspeksi Detail Bottleneck & SLA">
                    <ActionIcon variant="light" color="blue" onClick={() => setSelectedBottleneck(b)}>
                      <IconEye size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Modal Detail Bottleneck SLA */}
      <EnterpriseModalShell
        opened={!!selectedBottleneck}
        onClose={() => setSelectedBottleneck(null)}
        title={`Inspeksi SLA Dokumen: ${selectedBottleneck?.referenceNumber || ''}`}
        subtitle="Rincian tahapan persetujuan yang sedang menunggu tindakan pejabat Approver"
        badgeLabel={selectedBottleneck?.isOverdue ? 'SLA OVERDUE' : 'SLA ON-TRACK'}
        badgeColor={selectedBottleneck?.isOverdue ? 'red' : 'teal'}
        icon={<IconClockExclamation size={22} />}
        size="lg"
        footer={
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSelectedBottleneck(null)}>
              Tutup Inspector
            </Button>
          </Group>
        }
      >
        {selectedBottleneck && (
          <EnterpriseFormSection
            title="Informasi Tahapan & Pejabat Approver"
            subtitle="Data bersifat Read-Only sesuai pemisahan wewenang operasional (Segregation of Duties)"
            icon={<IconClockHour4 size={16} />}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Paper withBorder p="xs" radius="sm">
                <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                  Nomor Referensi & Siklus
                </Text>
                <Text size="sm" fw={700}>
                  {selectedBottleneck.referenceNumber} (Revisi #{selectedBottleneck.currentRevisionCycle})
                </Text>
              </Paper>
              <Paper withBorder p="xs" radius="sm">
                <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                  Nilai Transaksi
                </Text>
                <Text size="sm" fw={700} c="indigo">
                  {formatIDR(selectedBottleneck.transactionAmount)}
                </Text>
              </Paper>
              <Paper withBorder p="xs" radius="sm">
                <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                  Pengaju (Requester)
                </Text>
                <Text size="sm" fw={600}>
                  {selectedBottleneck.requesterName} ({selectedBottleneck.requesterOrgCode})
                </Text>
              </Paper>
              <Paper withBorder p="xs" radius="sm">
                <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                  Pejabat Approver Saat Ini
                </Text>
                <Text size="sm" fw={700}>
                  {selectedBottleneck.assignedUserName}
                </Text>
                <Text size="xs" c="dimmed">
                  Step #{selectedBottleneck.sequence} • {selectedBottleneck.targetJobLevelCode} @{' '}
                  {selectedBottleneck.resolvedOrgUnitCode}
                </Text>
              </Paper>
            </SimpleGrid>
          </EnterpriseFormSection>
        )}
      </EnterpriseModalShell>
    </Stack>
  );
}

/**
 * MENU 2: Dedicated IT Servicedesk Operations (Unlock Account, Reset Password & Org/Role Support)
 */
export function ItServicedeskView() {
  const queryClient = useQueryClient();
  const { canManageServicedesk, canManageSystemAdmin, isReadOnlyAuditor } = useAccess();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [resetTargetUser, setResetTargetUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('Password123!');
  const [selectedEmailLog, setSelectedEmailLog] = useState<any | null>(null);

  // New Org Unit Form State
  const [orgCode, setOrgCode] = useState('DEPT-FIN');
  const [orgName, setOrgName] = useState('Department Finance & Accounting');
  const [orgType, setOrgType] = useState('DEPARTMENT');
  const [parentOrgId, setParentOrgId] = useState<string>('');

  const { data: users = [], isFetching } = useQuery<any[]>({
    queryKey: ['demo-users'],
    queryFn: async () => {
      const res = await apiClient.get('/Auth/demo-users');
      return res.data;
    },
  });

  const { data: appSettingsData } = useQuery<{ emailConfig?: any; emailOutboxLogs?: any[] }>({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/AppSettings');
      return res.data;
    },
  });

  const emailConfig = appSettingsData?.emailConfig || {
    adminSenderEmail: 'noreply-admin@coreenterprise.co.id',
    adminSenderName: 'CoreEnterprise System Administrator',
    adminSupportReplyTo: 'it-servicedesk@coreenterprise.co.id',
    emailNotificationEnabled: true,
  };
  const servicedeskEmailLogs = (appSettingsData?.emailOutboxLogs || []).filter(
    (l: any) => l.moduleSource === 'IT_SERVICEDESK'
  );

  const { data: rbacData } = useQuery<{ roles: any[]; permissions: any[] }>({
    queryKey: ['superadmin-rbac-matrix'],
    queryFn: async () => {
      const res = await apiClient.get('/SuperAdmin/rbac-matrix');
      return res.data;
    },
  });

  const { data: orgUnits = [] } = useQuery<any[]>({
    queryKey: ['organization-units'],
    queryFn: async () => {
      const res = await apiClient.get('/MasterData/organization-units');
      return res.data;
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: async ({ targetUserId, newPassword }: { targetUserId: string; newPassword: string }) => {
      const res = await apiClient.post('/Servicedesk/reset-password', {
        targetUserId,
        newPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Reset Password & Pengiriman Email Berhasil',
        message: data.message,
        color: 'teal',
        icon: <IconMailForward size={16} />,
      });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setResetTargetUser(null);
    },
  });

  const toggleLockMutation = useMutation({
    mutationFn: async ({ targetUserId, isActive }: { targetUserId: string; isActive: boolean }) => {
      const res = await apiClient.post('/Servicedesk/toggle-user-lock', { targetUserId, isActive });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Status Akun Diperbarui & Email Terkirim',
        message: data.message,
        color: 'blue',
        icon: <IconMailForward size={16} />,
      });
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const togglePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, isGranted }: { roleId: string; permissionId: string; isGranted: boolean }) => {
      const res = await apiClient.post('/SuperAdmin/toggle-role-permission', { roleId, permissionId, isGranted });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-rbac-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const updateUserRolesMutation = useMutation({
    mutationFn: async ({ targetUserId, roleCodes }: { targetUserId: string; roleCodes: string[] }) => {
      const res = await apiClient.post('/SuperAdmin/user-roles', { targetUserId, roleCodes });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Role Pengguna Diperbarui', message: data.message, color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/SuperAdmin/organization-units', {
        code: orgCode,
        name: orgName,
        unitType: orgType,
        parentUnitId: parentOrgId || null,
      });
      return res.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Unit Organisasi Ditambahkan', message: `Unit ${orgCode} berhasil dibuat.`, color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['organization-units'] });
      queryClient.invalidateQueries({ queryKey: ['system-foundation-summary'] });
    },
  });

  const activeUserCount = users.filter((u) => u.isActive !== false).length;
  const lockedUserCount = users.length - activeUserCount;

  const filteredUsers = users.filter((u) => {
    const isAct = u.isActive !== false;
    if (statusFilter === 'ACTIVE' && !isAct) return false;
    if (statusFilter === 'LOCKED' && isAct) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        (u.username || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.employeeNumber || '').toLowerCase().includes(q) ||
        (u.orgUnitCode || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Stack gap="lg">
      {isReadOnlyAuditor && (
        <Alert color="orange" icon={<IconAlertTriangle size={18} />} title="Mode Auditor (Global Read-Only)">
          Anda dapat menginspeksi seluruh akun pengguna dan matriks organisasi di halaman ini, namun tombol aksi Reset Password dan Lock/Unlock dinonaktifkan sesuai prinsip Segregation of Duties (SoD).
        </Alert>
      )}

      {/* Servicedesk KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Akun Terdaftar
              </Text>
              <Title order={3} mt={4}>
                {users.length} Pengguna
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Identitas Korporat 2-Axis
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="blue" variant="light">
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Akun Berstatus ACTIVE
              </Text>
              <Title order={3} mt={4} c="teal">
                {activeUserCount} Akun
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Dapat melakukan login normal
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="teal" variant="light">
              <IconLockOpen size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Akun Terkunci (LOCKED)
              </Text>
              <Title order={3} mt={4} c={lockedUserCount > 0 ? 'red' : 'gray'}>
                {lockedUserCount} Akun
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Membutuhkan Unlock Servicedesk
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color={lockedUserCount > 0 ? 'red' : 'gray'} variant="light">
              <IconLock size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Unit Organisasi Aktif
              </Text>
              <Title order={3} mt={4} c="indigo">
                {orgUnits.length} Unit
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Hirarki HO / Regional / Area / Dept
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="indigo" variant="light">
              <IconBuildingPlus size={24} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      <Tabs defaultValue="accounts">
        <Tabs.List mb="md">
          <Tabs.Tab value="accounts" leftSection={<IconHeadset size={16} />}>
            1. Meja Bantuan Akun Pengguna (Unlock Akun, Reset Sandi & Role Sumbu 2)
          </Tabs.Tab>
          <Tabs.Tab value="org-rbac" leftSection={<IconShieldCog size={16} />}>
            2. Struktur Unit Organisasi & Matriks Cepat Role-Permission
          </Tabs.Tab>
          <Tabs.Tab value="email-outbox" leftSection={<IconMailForward size={16} />}>
            3. Log Email Pemberitahuan Akun ({servicedeskEmailLogs.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="accounts">
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="md" wrap="wrap">
              <Group gap="sm">
                <ThemeIcon size={40} radius="md" color="orange" variant="light">
                  <IconUserCog size={22} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Operasional IT Servicedesk — Pemulihan Akun & Reset Kata Sandi</Title>
                  <Text size="xs" c="dimmed">
                    Setiap tindakan Kunci/Buka Akun dan Reset Kata Sandi otomatis mengirimkan email resmi dari{' '}
                    <Code fz="11px">{emailConfig.adminSenderEmail}</Code> ke alamat email pengguna terkait
                  </Text>
                </div>
              </Group>

              <Group gap="xs">
                <Badge
                  size="sm"
                  variant="light"
                  color={emailConfig.emailNotificationEnabled !== false ? 'teal' : 'gray'}
                  leftSection={<IconMail size={12} />}
                >
                  Sender: {emailConfig.adminSenderEmail}
                </Badge>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconRefresh size={14} />}
                  loading={isFetching}
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['demo-users'] })}
                >
                  Segarkan Daftar
                </Button>
              </Group>
            </Group>

            <Paper withBorder p="sm" radius="md" mb="md">
              <Grid align="center">
                <Grid.Col span={{ base: 12, md: 7 }}>
                  <TextInput
                    size="xs"
                    placeholder="Cari NIK, username, nama lengkap, email, atau unit organisasi..."
                    leftSection={<IconSearch size={14} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 5 }}>
                  <SegmentedControl
                    fullWidth
                    size="xs"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    data={[
                      { label: `Semua (${users.length})`, value: 'ALL' },
                      { label: `Active (${activeUserCount})`, value: 'ACTIVE' },
                      { label: `Locked (${lockedUserCount})`, value: 'LOCKED' },
                    ]}
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>NIK / Username</Table.Th>
                  <Table.Th>Nama Lengkap & Email Tujuan</Table.Th>
                  <Table.Th>Sumbu 1 (Jabatan & Unit)</Table.Th>
                  <Table.Th>Sumbu 2 (System Roles)</Table.Th>
                  <Table.Th>Status Kunci Akun</Table.Th>
                  <Table.Th>Aksi Servicedesk</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>
                      <Text size="xs" fw={700}>
                        {u.employeeNumber || 'EMP'}
                      </Text>
                      <Code fz="11px">@{u.username}</Code>
                    </Table.Td>
                    <Table.Td fw={600}>
                      {u.fullName}
                      <Group gap={4} mt={2}>
                        <Badge size="xs" color="blue" variant="light" leftSection={<IconMail size={10} />}>
                          {u.email || `${u.username}@coreenterprise.local`}
                        </Badge>
                        {u.avatarDmsFileId && (
                          <Badge size="xs" color="teal" variant="outline">
                            Avatar .webp
                          </Badge>
                        )}
                        {u.signatureDmsFileId && (
                          <Badge size="xs" color="indigo" variant="outline">
                            Paraf Digital
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue">
                        {u.jobLevel} (Rank {u.jobRank})
                      </Badge>{' '}
                      <Badge variant="outline">{u.orgUnitCode}</Badge>
                    </Table.Td>
                    <Table.Td style={{ minWidth: 250 }}>
                      <MultiSelect
                        size="xs"
                        disabled={!canManageSystemAdmin}
                        value={u.roles}
                        data={['EMPLOYEE', 'AUDITOR', 'SERVICEDESK', 'MASTER_DATA', 'SUPERADMIN']}
                        onChange={(nextRoles) => {
                          if (nextRoles.length > 0) {
                            updateUserRolesMutation.mutate({ targetUserId: u.id, roleCodes: nextRoles });
                          }
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        size="sm"
                        color="teal"
                        disabled={!canManageServicedesk}
                        checked={u.isActive !== false}
                        label={
                          <Badge size="xs" color={u.isActive !== false ? 'teal' : 'red'}>
                            {u.isActive !== false ? 'ACTIVE' : 'LOCKED'}
                          </Badge>
                        }
                        onChange={(e) =>
                          toggleLockMutation.mutate({ targetUserId: u.id, isActive: e.currentTarget.checked })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        color="orange"
                        disabled={!canManageServicedesk}
                        leftSection={<IconKey size={14} />}
                        onClick={() => {
                          setResetTargetUser(u);
                          setNewPasswordInput('Password123!');
                        }}
                      >
                        Reset Password
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="org-rbac">
          <Stack gap="lg">
            <Card withBorder radius="md" padding="lg">
              <Group gap="xs" mb="md">
                <IconBuildingPlus size={20} />
                <Title order={4}>Tambah Unit Organisasi Baru ke Pohon Hirarki (Axis 2)</Title>
              </Group>

              <Grid align="flex-end">
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <TextInput label="Kode Unit (Unique)" value={orgCode} onChange={(e) => setOrgCode(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput label="Nama Unit Organisasi" value={orgName} onChange={(e) => setOrgName(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 2 }}>
                  <Select
                    label="Tipe Level"
                    value={orgType}
                    onChange={(v) => setOrgType(v || 'DEPARTMENT')}
                    data={['COMPANY', 'REGIONAL', 'AREA', 'DEPARTMENT', 'SECTION']}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 2 }}>
                  <Select
                    label="Induk Unit (ParentUnitId)"
                    placeholder="Pilih Induk"
                    value={parentOrgId}
                    onChange={(v) => setParentOrgId(v || '')}
                    data={orgUnits.map((o) => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 1 }}>
                  <Button
                    fullWidth
                    disabled={!canManageSystemAdmin}
                    loading={createOrgMutation.isPending}
                    onClick={() => createOrgMutation.mutate()}
                  >
                    Simpan
                  </Button>
                </Grid.Col>
              </Grid>
            </Card>

            <Card withBorder radius="md" padding="lg">
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={4}>Matriks Hak Akses Sumbu 2 (Roles vs Permissions)</Title>
                  <Text size="xs" c="dimmed">
                    Konfigurasi dinamis RBAC — Hanya dapat diubah oleh pengguna dengan permission System.Admin (SuperAdmin)
                  </Text>
                </div>
                {!canManageSystemAdmin && (
                  <Badge color="orange">Read-Only (Khusus SuperAdmin)</Badge>
                )}
              </Group>

              <Table striped withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Permission Code</Table.Th>
                    <Table.Th>Modul</Table.Th>
                    {(rbacData?.roles || []).map((r) => (
                      <Table.Th key={r.id}>{r.code}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(rbacData?.permissions || []).map((perm) => (
                    <Table.Tr key={perm.id}>
                      <Table.Td fw={600}>
                        {perm.code}
                        <Text size="xs" c="dimmed">
                          {perm.description}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{perm.module}</Badge>
                      </Table.Td>
                      {(rbacData?.roles || []).map((role) => {
                        const granted = role.permissionIds.includes(perm.id);
                        return (
                          <Table.Td key={role.id}>
                            <Checkbox
                              checked={granted}
                              disabled={!canManageSystemAdmin}
                              onChange={(e) =>
                                togglePermissionMutation.mutate({
                                  roleId: role.id,
                                  permissionId: perm.id,
                                  isGranted: e.currentTarget.checked,
                                })
                              }
                            />
                          </Table.Td>
                        );
                      })}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="email-outbox">
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="md" wrap="wrap">
              <Group gap="sm">
                <ThemeIcon size={40} radius="md" color="blue" variant="light">
                  <IconMailForward size={22} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Log Pengiriman Email Pemberitahuan IT Servicedesk (Lock/Unlock & Reset Password)</Title>
                  <Text size="xs" c="dimmed">
                    Rekam jejak email resmi yang dikirim dari Akun Email Admin Aplikasi (<Code fz="11px">{emailConfig.adminSenderEmail}</Code>) ke email pengguna saat penguncian/pembukaan akun dan reset sandi
                  </Text>
                </div>
              </Group>

              <Badge color="blue" size="lg" variant="light">
                {servicedeskEmailLogs.length} Email Terkirim
              </Badge>
            </Group>

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Waktu Kirim</Table.Th>
                  <Table.Th>Jenis Aksi (Event)</Table.Th>
                  <Table.Th>Pengirim (Email Admin)</Table.Th>
                  <Table.Th>Penerima (Email Pengguna)</Table.Th>
                  <Table.Th>Subjek Pemberitahuan</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th ta="right">Detail</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {servicedeskEmailLogs.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7} ta="center" py="lg">
                      <Text size="xs" c="dimmed">
                        Belum ada email pemberitahuan Servicedesk yang tercatat. Silakan uji dengan mengklik tombol Switch ACTIVE/LOCKED atau Reset Password pada Tab 1.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  servicedeskEmailLogs.map((log: any) => (
                    <Table.Tr key={log.id}>
                      <Table.Td>
                        <Text size="xs" fw={600}>
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </Text>
                        {log.referenceCode && <Code fz="10px">{log.referenceCode}</Code>}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          color={
                            log.eventType === 'SERVICEDESK_ACCOUNT_LOCKED'
                              ? 'red'
                              : log.eventType === 'SERVICEDESK_ACCOUNT_UNLOCKED'
                              ? 'teal'
                              : 'orange'
                          }
                        >
                          {log.eventType}
                        </Badge>
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
                        <Badge size="xs" color="teal" variant="light">
                          {log.deliveryStatus}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Button
                          size="compact-xs"
                          variant="light"
                          color="blue"
                          leftSection={<IconEye size={13} />}
                          onClick={() => setSelectedEmailLog(log)}
                        >
                          Lihat Isi Email
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Modal Reset Password oleh IT Servicedesk */}
      <EnterpriseModalShell
        opened={!!resetTargetUser}
        onClose={() => setResetTargetUser(null)}
        title="Reset Kata Sandi Pengguna (IT Servicedesk)"
        subtitle="Tindakan ini akan mencabut seluruh Refresh Token aktif milik pengguna, mencatat Audit Trail, dan mengirimkan email pemberitahuan resmi ke pengguna"
        badgeLabel="SERVICEDESK ACTION + EMAIL"
        badgeColor="orange"
        icon={<IconKey size={22} />}
        size="md"
        footer={
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setResetTargetUser(null)}>
              Batal
            </Button>
            <Button
              color="orange"
              leftSection={<IconMailForward size={16} />}
              loading={resetPwdMutation.isPending}
              onClick={() =>
                resetTargetUser &&
                resetPwdMutation.mutate({
                  targetUserId: resetTargetUser.id,
                  newPassword: newPasswordInput,
                })
              }
            >
              Reset Sandi & Kirim Email ke Pengguna
            </Button>
          </Group>
        }
      >
        {resetTargetUser && (
          <Stack gap="md">
            <EnterpriseFormSection
              title="1. Sasaran Akun Pengguna"
              subtitle="Pastikan identitas karyawan sudah diverifikasi melalui tiket bantuan"
              icon={<IconUserCog size={16} />}
            >
              <Group justify="space-between">
                <div>
                  <Text size="sm" fw={700}>
                    {resetTargetUser.fullName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    @{resetTargetUser.username} • {resetTargetUser.employeeNumber} • {resetTargetUser.orgUnitCode}
                  </Text>
                </div>
                <Badge color="blue">{resetTargetUser.jobLevel}</Badge>
              </Group>
            </EnterpriseFormSection>

            <EnterpriseFormSection
              title="2. Kata Sandi Sementara Baru"
              subtitle="Gunakan kata sandi standar atau tentukan sandi sementara baru"
              icon={<IconKey size={16} />}
            >
              <PasswordInput
                label="Kata Sandi Baru"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.currentTarget.value)}
                required
              />
            </EnterpriseFormSection>

            <EnterpriseFormSection
              title="3. Pemberitahuan Email Otomatis ke Pengguna"
              subtitle="Dikirim otomatis menggunakan Akun Email Admin Aplikasi (Application Settings)"
              icon={<IconMailForward size={16} />}
              iconColor="teal"
            >
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Pengirim (Email Admin Aplikasi):
                  </Text>
                  <Code fz="11px">{emailConfig.adminSenderEmail}</Code>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Penerima (Email Pengguna):
                  </Text>
                  <Code fz="11px" color="blue">
                    {resetTargetUser.email || `${resetTargetUser.username}@coreenterprise.local`}
                  </Code>
                </Group>
              </Stack>
            </EnterpriseFormSection>
          </Stack>
        )}
      </EnterpriseModalShell>

      {/* Modal Inspeksi Isi Email Pemberitahuan Akun */}
      <EnterpriseModalShell
        opened={!!selectedEmailLog}
        onClose={() => setSelectedEmailLog(null)}
        title="Rincian Email Pemberitahuan Keamanan Akun"
        subtitle="Salinan lengkap email yang dikirimkan ke pengguna oleh IT Servicedesk"
        badgeLabel={selectedEmailLog?.eventType || 'EMAIL NOTIFICATION'}
        badgeColor="blue"
        icon={<IconMailForward size={22} />}
        size="lg"
        footer={
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSelectedEmailLog(null)}>
              Tutup Pratinjau Email
            </Button>
          </Group>
        }
      >
        {selectedEmailLog && (
          <Stack gap="md">
            <EnterpriseFormSection
              title="1. Pengirim & Penerima Email"
              subtitle={`Waktu kirim: ${new Date(selectedEmailLog.createdAt).toLocaleString('id-ID')}`}
              icon={<IconMail size={16} />}
            >
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                <Paper withBorder p="xs" radius="sm">
                  <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                    Dari (Email Admin Aplikasi)
                  </Text>
                  <Text size="xs" fw={700}>
                    {selectedEmailLog.senderName}
                  </Text>
                  <Code fz="11px">{selectedEmailLog.senderEmail}</Code>
                </Paper>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                    Kepada (Email Pengguna)
                  </Text>
                  <Text size="xs" fw={700}>
                    {selectedEmailLog.recipientName}
                  </Text>
                  <Code fz="11px" color="blue">
                    {selectedEmailLog.recipientEmail}
                  </Code>
                </Paper>
              </SimpleGrid>
            </EnterpriseFormSection>

            <EnterpriseFormSection
              title="2. Subjek & Isi Surat Elektronik"
              subtitle={selectedEmailLog.subject}
              icon={<IconMailForward size={16} />}
            >
              <Paper withBorder p="sm" radius="md" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
                {selectedEmailLog.bodyText}
              </Paper>
            </EnterpriseFormSection>
          </Stack>
        )}
      </EnterpriseModalShell>
    </Stack>
  );
}

export function ServicedeskAndAdminView() {
  return (
    <Stack gap="lg">
      <SlaMonitorView />
      <ItServicedeskView />
    </Stack>
  );
}
