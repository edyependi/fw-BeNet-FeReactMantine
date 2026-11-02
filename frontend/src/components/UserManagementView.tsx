import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  MultiSelect,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconAt,
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconEdit,
  IconHierarchy2,
  IconId,
  IconKey,
  IconLock,
  IconLockOpen,
  IconMail,
  IconPhone,
  IconSearch,
  IconShieldCog,
  IconTrash,
  IconUser,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAccess } from '../hooks/useAccess';
import {
  EnterpriseFormSection,
  EnterpriseModalShell,
  EnterpriseSwitchCard,
} from './EnterpriseModalShell';

export function UserManagementView() {
  const queryClient = useQueryClient();
  const { canManageSystemAdmin, canWriteMasterData, canManageServicedesk, isReadOnlyAuditor } = useAccess();
  const canWriteUsers = (canManageSystemAdmin || canWriteMasterData) && !isReadOnlyAuditor;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJobLevel, setFilterJobLevel] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(null);

  // Add / Edit User Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+62 812-3456-7890');
  const [validFrom, setValidFrom] = useState('2026-01-01');
  const [validTo, setValidTo] = useState('2028-12-31');
  const [password, setPassword] = useState('Password123!');
  const [jobLevelCode, setJobLevelCode] = useState('STAFF');
  const [primaryOrgUnitId, setPrimaryOrgUnitId] = useState('');
  const [directSupervisorId, setDirectSupervisorId] = useState<string>('');
  const [roleCodes, setRoleCodes] = useState<string[]>(['EMPLOYEE']);
  const [isActive, setIsActive] = useState(true);

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['user-management-list'],
    queryFn: async () => {
      const res = await apiClient.get('/UserManagement');
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

  const { data: rbacData } = useQuery<{ roles: any[]; permissions: any[] }>({
    queryKey: ['superadmin-rbac-matrix'],
    queryFn: async () => {
      const res = await apiClient.get('/SuperAdmin/rbac-matrix');
      return res.data;
    },
  });

  const availableRoles = (rbacData?.roles || []).map((r: any) => r.code);
  const roleOptions = availableRoles.length > 0
    ? availableRoles
    : ['EMPLOYEE', 'AUDITOR', 'SERVICEDESK', 'MASTER_DATA', 'SUPERADMIN'];

  const formatIsoDateInput = (isoVal?: string | null, fallback = '2026-01-01') => {
    if (!isoVal) return fallback;
    try {
      return new Date(isoVal).toISOString().slice(0, 10);
    } catch {
      return fallback;
    }
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setEmployeeNumber(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setUsername('');
    setEmail('');
    setFullName('');
    setPhoneNumber('+62 812-3456-7890');
    setValidFrom('2026-01-01');
    setValidTo('2028-12-31');
    setPassword('Password123!');
    setJobLevelCode('STAFF');
    setPrimaryOrgUnitId(orgUnits[0]?.id || '');
    setDirectSupervisorId('');
    setRoleCodes(['EMPLOYEE']);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setEditingUserId(u.id);
    setEmployeeNumber(u.employeeNumber || '');
    setUsername(u.username || '');
    setEmail(u.email || '');
    setFullName(u.fullName || '');
    setPhoneNumber(u.phoneNumber || '+62 811-9001-1001');
    setValidFrom(formatIsoDateInput(u.validFrom, '2026-01-01'));
    setValidTo(formatIsoDateInput(u.validTo, '2028-12-31'));
    setPassword('');
    setJobLevelCode(u.jobLevel || 'STAFF');
    setPrimaryOrgUnitId(u.orgUnitId || orgUnits[0]?.id || '');
    setDirectSupervisorId(u.directSupervisorId || '');
    setRoleCodes(u.roles && u.roles.length > 0 ? u.roles : ['EMPLOYEE']);
    setIsActive(u.isActive !== false);
    setModalOpen(true);
  };

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employeeNumber,
        username,
        email: email || `${username.trim().toLowerCase()}@coreenterprise.local`,
        fullName,
        phoneNumber: phoneNumber.trim() || null,
        validFrom: validFrom ? new Date(validFrom).toISOString() : null,
        validTo: validTo ? new Date(validTo).toISOString() : null,
        password: password.trim() ? password : null,
        jobLevelCode,
        primaryOrgUnitId: primaryOrgUnitId || orgUnits[0]?.id,
        directSupervisorId: directSupervisorId || null,
        isActive,
        roleCodes,
      };
      if (editingUserId) {
        const res = await apiClient.put(`/UserManagement/${editingUserId}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/UserManagement', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      notifications.show({
        title: editingUserId ? 'Data Pengguna Diperbarui' : 'Pengguna Baru Ditambahkan',
        message: data.message,
        color: 'green',
      });
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['user-management-list'] });
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menyimpan Pengguna',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/UserManagement/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Pengguna Dihapus',
        message: data.message,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['user-management-list'] });
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Tidak Dapat Menghapus Pengguna',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const toggleLockMutation = useMutation({
    mutationFn: async ({ targetUserId, nextActive }: { targetUserId: string; nextActive: boolean }) => {
      const res = await apiClient.post('/Servicedesk/toggle-user-lock', {
        targetUserId,
        isActive: nextActive,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Status Akun Diperbarui', message: data.message, color: 'blue' });
      queryClient.invalidateQueries({ queryKey: ['user-management-list'] });
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await apiClient.post('/Servicedesk/reset-password', {
        targetUserId,
        newPassword: 'Password123!',
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Reset Password Berhasil', message: data.message, color: 'teal' });
    },
  });

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    const matchText =
      !q ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.employeeNumber || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.orgUnitCode || '').toLowerCase().includes(q);
    const matchJl = !filterJobLevel || u.jobLevel === filterJobLevel;
    const matchRole = !filterRole || (u.roles || []).includes(filterRole);
    return matchText && matchJl && matchRole;
  });

  const activeCount = users.filter((u) => u.isActive !== false).length;
  const lockedCount = users.length - activeCount;

  return (
    <Stack gap="lg">
      {isReadOnlyAuditor && (
        <Alert color="orange" icon={<IconAlertTriangle size={18} />} title="Mode Auditor (Global Read-Only)">
          Anda dapat menginspeksi seluruh daftar pengguna, jabatan (Axis 1), dan role (Axis 2), namun tombol tambah/edit/hapus pengguna dinonaktifkan.
        </Alert>
      )}

      {/* KPI Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Pengguna Terdaftar
              </Text>
              <Title order={3}>{users.length} Akun</Title>
            </div>
            <ThemeIcon size={42} radius="md" color="indigo" variant="light">
              <IconUsers size={22} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Status Akun Aktif (ACTIVE)
              </Text>
              <Title order={3} c="teal">
                {activeCount} Pengguna
              </Title>
            </div>
            <ThemeIcon size={42} radius="md" color="teal" variant="light">
              <IconUserCheck size={22} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Akun Terkunci / Nonaktif (LOCKED)
              </Text>
              <Title order={3} c={lockedCount > 0 ? 'red' : 'dimmed'}>
                {lockedCount} Pengguna
              </Title>
            </div>
            <ThemeIcon size={42} radius="md" color="red" variant="light">
              <IconLock size={22} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Master List Card */}
      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <IconUsers size={20} />
            </ThemeIcon>
            <div>
              <Title order={4}>Master Daftar Pengguna Aplikasi (User Management — 2-Axis Identity)</Title>
              <Text size="xs" c="dimmed">
                Kelola UserId, NIK, Jabatan Struktural (Sumbu 1), Unit Organisasi, Atasan Langsung, dan Role Fungsional (Sumbu 2)
              </Text>
            </div>
          </Group>

          <Button
            leftSection={<IconUserPlus size={16} />}
            disabled={!canWriteUsers}
            onClick={openCreateModal}
          >
            + Tambah Pengguna Baru
          </Button>
        </Group>

        {/* Filter Bar */}
        <Grid mb="md">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              placeholder="Cari berdasarkan UserId, NIK, Nama Lengkap, Email, atau Kode Unit..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <Select
              placeholder="Filter Level Jabatan (Axis 1)"
              clearable
              leftSection={<IconHierarchy2 size={15} />}
              value={filterJobLevel}
              onChange={setFilterJobLevel}
              data={[
                { value: 'STAFF', label: 'STAFF (Rank 10)' },
                { value: 'MGR', label: 'MGR — Manager (Rank 20)' },
                { value: 'AM', label: 'AM — Area Manager (Rank 30)' },
                { value: 'GM', label: 'GM — General Manager (Rank 40)' },
                { value: 'DIR', label: 'DIR — Director (Rank 50)' },
                { value: 'MD', label: 'MD — Managing Director (Rank 60)' },
              ]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <Select
              placeholder="Filter System Role (Axis 2)"
              clearable
              leftSection={<IconShieldCog size={15} />}
              value={filterRole}
              onChange={setFilterRole}
              data={roleOptions}
            />
          </Grid.Col>
        </Grid>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>UserId & NIK</Table.Th>
              <Table.Th>Nama Lengkap, Email & No. HP</Table.Th>
              <Table.Th>Sumbu 1: Jabatan & Unit</Table.Th>
              <Table.Th>Atasan Langsung</Table.Th>
              <Table.Th>Sumbu 2: System Roles</Table.Th>
              <Table.Th>Masa Berlaku & Status</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredUsers.map((u) => (
              <Table.Tr key={u.id}>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Avatar
                      size={32}
                      radius="xl"
                      color="indigo"
                      src={u.avatarDmsFileId ? `/api/Dms/${u.avatarDmsFileId}/download` : null}
                    >
                      {(u.username || 'US').slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div>
                      <Text size="sm" fw={700}>
                        {u.username}
                      </Text>
                      <Badge size="xs" variant="outline" color="gray">
                        {u.employeeNumber}
                      </Badge>
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600}>
                    {u.fullName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {u.email}
                  </Text>
                  {u.phoneNumber && (
                    <Text size="11px" c="blue" fw={500}>
                      {u.phoneNumber}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Badge color="indigo" size="sm">
                      {u.jobLevel} (Rank {u.jobRank})
                    </Badge>
                    <Badge color="cyan" variant="light" size="sm">
                      {u.orgUnitCode}
                    </Badge>
                  </Group>
                  <Text size="11px" c="dimmed" mt={2}>
                    {u.orgUnitName}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{u.directSupervisorName || '— (Puncak Cabang / HO)'}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {(u.roles || []).map((r: string) => (
                      <Badge key={r} size="xs" color="grape" variant="light">
                        {r}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color={u.isActive !== false ? 'teal' : 'red'} variant="filled" size="xs">
                    {u.isActive !== false ? 'ACTIVE' : 'LOCKED'}
                  </Badge>
                  <Text size="10px" c="dimmed" mt={3}>
                    {formatIsoDateInput(u.validFrom, '2026-01-01')} s/d {formatIsoDateInput(u.validTo, '2028-12-31')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEdit size={14} />}
                      disabled={!canWriteUsers}
                      onClick={() => openEditModal(u)}
                    >
                      Edit
                    </Button>
                    <Tooltip label={u.isActive !== false ? 'Kunci Akun (Lock)' : 'Buka Kunci Akun (Unlock)'}>
                      <ActionIcon
                        variant="light"
                        color={u.isActive !== false ? 'orange' : 'teal'}
                        disabled={!canManageServicedesk && !canWriteUsers}
                        onClick={() =>
                          toggleLockMutation.mutate({
                            targetUserId: u.id,
                            nextActive: u.isActive === false,
                          })
                        }
                      >
                        {u.isActive !== false ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Reset Password ke Password123!">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        disabled={!canManageServicedesk && !canWriteUsers}
                        onClick={() => resetPwdMutation.mutate(u.id)}
                      >
                        <IconKey size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Hapus Pengguna">
                      <ActionIcon
                        variant="light"
                        color="red"
                        disabled={!canWriteUsers || u.username === 'admin'}
                        onClick={() => {
                          if (window.confirm(`Hapus pengguna ${u.fullName} (${u.username})?`)) {
                            deleteUserMutation.mutate(u.id);
                          }
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {/* ENTERPRISE MODAL: ADD / EDIT USER */}
      <EnterpriseModalShell
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUserId ? `Edit Profil & Otoritas Pengguna` : 'Tambah Pengguna Aplikasi Baru'}
        subtitle="Konfigurasi identitas akun, kontak, masa berlaku, jabatan struktural (Sumbu 1), dan role RBAC (Sumbu 2)"
        badgeText={editingUserId ? `EDIT: @${username}` : 'AKUN BARU'}
        badgeColor={editingUserId ? 'blue' : 'teal'}
        icon={<IconUserPlus size={22} />}
        size="xl"
        submitLabel={editingUserId ? 'Simpan Perubahan Pengguna' : 'Buat Akun Pengguna'}
        loading={saveUserMutation.isPending}
        onSubmit={() => saveUserMutation.mutate()}
      >
        <EnterpriseFormSection
          title="Identitas Karyawan, Kontak & Kredensial Login"
          subtitle="Nomor Induk Karyawan (NIK), UserId korporat, nama lengkap, alamat email, dan nomor handphone"
          icon={<IconUser size={16} />}
          iconColor="blue"
        >
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="NIK (Employee ID)"
                placeholder="EMP-1005"
                leftSection={<IconId size={16} />}
                required
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="UserId / Username Login"
                placeholder="user05"
                leftSection={<IconAt size={16} />}
                required
                value={username}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  setUsername(val);
                  if (!editingUserId) {
                    setEmail(`${val.trim().toLowerCase()}@coreenterprise.local`);
                  }
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <PasswordInput
                label={editingUserId ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi Awal'}
                placeholder={editingUserId ? 'Kosongkan jika tetap' : 'Password123!'}
                leftSection={<IconLock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Nama Lengkap Karyawan"
                placeholder="Contoh: Bambang Wijaya"
                leftSection={<IconUser size={16} />}
                required
                value={fullName}
                onChange={(e) => setFullName(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Alamat Email Korporat"
                placeholder="user@coreenterprise.local"
                leftSection={<IconMail size={16} />}
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Nomor Handphone"
                placeholder="+62 812-3456-7890"
                leftSection={<IconPhone size={16} />}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>

        <EnterpriseFormSection
          title="Sumbu 1 (Authority Axis) — Jabatan Struktural & Unit Organisasi"
          subtitle="Menentukan posisi hirarki persetujuan berjenjang dan garis komando organisasi"
          icon={<IconHierarchy2 size={16} />}
          iconColor="indigo"
        >
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Level Jabatan (JobLevel)"
                leftSection={<IconHierarchy2 size={16} />}
                required
                value={jobLevelCode}
                onChange={(v) => setJobLevelCode(v || 'STAFF')}
                data={[
                  { value: 'STAFF', label: 'STAFF — Staff (Rank 10)' },
                  { value: 'MGR', label: 'MGR — Manager (Rank 20)' },
                  { value: 'AM', label: 'AM — Area Manager (Rank 30)' },
                  { value: 'GM', label: 'GM — General Manager (Rank 40)' },
                  { value: 'DIR', label: 'DIR — Director (Rank 50)' },
                  { value: 'MD', label: 'MD — Managing Director (Rank 60)' },
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Unit Organisasi Utama"
                leftSection={<IconBuildingSkyscraper size={16} />}
                required
                value={primaryOrgUnitId}
                onChange={(v) => setPrimaryOrgUnitId(v || '')}
                data={orgUnits.map((o: any) => ({
                  value: o.id,
                  label: `${o.code} — ${o.name} (${o.unitType})`,
                }))}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Atasan Langsung (Supervisor)"
                placeholder="Pilih Atasan (Opsional)"
                leftSection={<IconUserCheck size={16} />}
                clearable
                value={directSupervisorId}
                onChange={(v) => setDirectSupervisorId(v || '')}
                data={users
                  .filter((u) => u.id !== editingUserId)
                  .map((u) => ({
                    value: u.id,
                    label: `${u.username} — ${u.fullName} (${u.jobLevel})`,
                  }))}
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>

        <EnterpriseFormSection
          title="Sumbu 2 (Access Axis) — Role Fungsional, Masa Berlaku & Status Akun"
          subtitle="Mengatur hak akses menu RBAC, periode aktif akun (Validity Period), dan status login pengguna"
          icon={<IconShieldCog size={16} />}
          iconColor="grape"
        >
          <Grid gutter="sm" align="flex-end">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                type="date"
                label="Valid From (Mulai Berlaku)"
                leftSection={<IconCalendarEvent size={16} />}
                required
                value={validFrom}
                onChange={(e) => setValidFrom(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                type="date"
                label="Valid Upto (Berlaku Sampai)"
                leftSection={<IconCalendarEvent size={16} />}
                required
                value={validTo}
                onChange={(e) => setValidTo(e.currentTarget.value)}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 7 }}>
              <MultiSelect
                label="Role Sistem (RBAC Roles)"
                leftSection={<IconShieldCog size={16} />}
                required
                value={roleCodes}
                onChange={(vals) => setRoleCodes(vals.length > 0 ? vals : ['EMPLOYEE'])}
                data={roleOptions}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <EnterpriseSwitchCard
                checked={isActive}
                onChange={setIsActive}
                title={isActive ? 'Status Akun: ACTIVE (Aktif)' : 'Status Akun: LOCKED (Terkunci)'}
                description={
                  isActive
                    ? 'Pengguna diizinkan masuk sesuai periode berlaku'
                    : 'Akses login ditangguhkan sementara'
                }
                activeColor="teal"
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>
      </EnterpriseModalShell>
    </Stack>
  );
}
