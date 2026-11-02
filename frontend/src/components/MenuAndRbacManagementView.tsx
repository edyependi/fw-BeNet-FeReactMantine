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
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
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
  IconEdit,
  IconKey,
  IconLayoutSidebar,
  IconPlus,
  IconShieldCog,
  IconSparkles,
  IconTrash,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { toPermissionPrefix, useAccess } from '../hooks/useAccess';
import {
  EnterpriseFormSection,
  EnterpriseModalShell,
  EnterpriseSwitchCard,
} from './EnterpriseModalShell';

export function MenuAndRbacManagementView() {
  const queryClient = useQueryClient();
  const { canManageSystemAdmin, isReadOnlyAuditor } = useAccess();
  const canEditRbac = canManageSystemAdmin && !isReadOnlyAuditor;

  // Menu Modal State
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [menuCode, setMenuCode] = useState('');
  const [menuTitle, setMenuTitle] = useState('');
  const [menuSubtitle, setMenuSubtitle] = useState('');
  const [groupCategory, setGroupCategory] = useState('Core Workspace');
  const [iconName, setIconName] = useState('IconRoute');
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [requiredPermissionCode, setRequiredPermissionCode] = useState('Transaction.Read');
  const [allowedRoleCodes, setAllowedRoleCodes] = useState<string[]>(['SUPERADMIN', 'EMPLOYEE']);
  const [isVisible, setIsVisible] = useState(true);
  const [autoGenerateCrudPermissions, setAutoGenerateCrudPermissions] = useState(true);

  // Role Modal State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleCode, setRoleCode] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  // Permission Modal State
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permCode, setPermCode] = useState('');
  const [permModule, setPermModule] = useState('Transaction');
  const [permDescription, setPermDescription] = useState('');

  const { data: menus = [] } = useQuery<any[]>({
    queryKey: ['app-menus'],
    queryFn: async () => {
      const res = await apiClient.get('/SuperAdmin/menus');
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

  const roles = rbacData?.roles || [];
  const permissions = rbacData?.permissions || [];
  const roleCodeList = roles.length > 0
    ? roles.map((r: any) => r.code)
    : ['EMPLOYEE', 'AUDITOR', 'SERVICEDESK', 'MASTER_DATA', 'SUPERADMIN'];

  const openCreateMenuModal = () => {
    setEditingMenuId(null);
    setMenuCode('lihat-stock');
    setMenuTitle('Lihat Stock Cabang');
    setMenuSubtitle('Monitoring saldo persediaan barang per unit cabang');
    setGroupCategory('Core Workspace');
    setIconName('IconRoute');
    setSortOrder((menus.length + 1) * 10);
    setRequiredPermissionCode('LihatStock.Read');
    setAllowedRoleCodes(['SUPERADMIN', 'MASTER_DATA']);
    setIsVisible(true);
    setAutoGenerateCrudPermissions(true);
    setMenuModalOpen(true);
  };

  const openEditMenuModal = (m: any) => {
    setEditingMenuId(m.id);
    setMenuCode(m.menuCode);
    setMenuTitle(m.title);
    setMenuSubtitle(m.subtitle || '');
    setGroupCategory(m.groupCategory || 'Core Workspace');
    setIconName(m.iconName || 'IconRoute');
    setSortOrder(m.sortOrder || 10);
    setRequiredPermissionCode(m.requiredPermissionCode || '');
    setAllowedRoleCodes(m.allowedRoleCodes || ['SUPERADMIN']);
    setIsVisible(m.isVisible !== false);
    setAutoGenerateCrudPermissions(false);
    setMenuModalOpen(true);
  };

  const saveMenuMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        menuCode,
        title: menuTitle,
        subtitle: menuSubtitle,
        groupCategory,
        iconName,
        sortOrder,
        requiredPermissionCode,
        allowedRoleCodes,
        isVisible,
        autoGenerateCrudPermissions,
      };
      if (editingMenuId) {
        const res = await apiClient.put(`/SuperAdmin/menus/${editingMenuId}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/SuperAdmin/menus', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      notifications.show({
        title: editingMenuId ? 'Menu Aplikasi Diperbarui' : 'Menu Aplikasi Ditambahkan',
        message: data.message,
        color: 'green',
      });
      setMenuModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['app-menus'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-rbac-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menyimpan Menu',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const generateCrudMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/SuperAdmin/menus/${id}/generate-crud-permissions`);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Paket 6 Standard CRUD Permissions Disiapkan',
        message: data.message,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['app-menus'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-rbac-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Men-generate CRUD Permissions',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/SuperAdmin/menus/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Menu Dihapus', message: data.message, color: 'teal' });
      queryClient.invalidateQueries({ queryKey: ['app-menus'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Tidak Dapat Menghapus Menu',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const quickToggleMenuVisibility = useMutation({
    mutationFn: async ({ menu, nextVisible }: { menu: any; nextVisible: boolean }) => {
      const res = await apiClient.put(`/SuperAdmin/menus/${menu.id}`, {
        menuCode: menu.menuCode,
        title: menu.title,
        subtitle: menu.subtitle || '',
        groupCategory: menu.groupCategory,
        iconName: menu.iconName,
        sortOrder: menu.sortOrder,
        requiredPermissionCode: menu.requiredPermissionCode || '',
        allowedRoleCodes: menu.allowedRoleCodes || ['SUPERADMIN'],
        isVisible: nextVisible,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-menus'] });
    },
  });

  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      const payload = { code: roleCode, name: roleName, description: roleDescription };
      if (editingRoleId) {
        const res = await apiClient.put(`/SuperAdmin/roles/${editingRoleId}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/SuperAdmin/roles', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Role Berhasil Disimpan', message: data.message, color: 'green' });
      setRoleModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-rbac-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['system-foundation-summary'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menyimpan Role',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/SuperAdmin/roles/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Role Dihapus', message: data.message, color: 'teal' });
      queryClient.invalidateQueries({ queryKey: ['superadmin-rbac-matrix'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menghapus Role',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const createPermMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/SuperAdmin/permissions', {
        code: permCode,
        module: permModule,
        description: permDescription,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Permission Ditambahkan', message: data.message, color: 'green' });
      setPermModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-rbac-matrix'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menambah Permission',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const togglePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, isGranted }: { roleId: string; permissionId: string; isGranted: boolean }) => {
      const res = await apiClient.post('/SuperAdmin/toggle-role-permission', {
        roleId,
        permissionId,
        isGranted,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-rbac-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
    },
  });

  return (
    <Stack gap="lg">
      {isReadOnlyAuditor && (
        <Alert color="orange" icon={<IconAlertTriangle size={18} />} title="Mode Auditor (Global Read-Only)">
          Anda dapat menginspeksi seluruh struktur Menu Aplikasi, Role Fungsional (Axis 2), dan Matriks Permission RBAC, namun aksi perubahan dinonaktifkan.
        </Alert>
      )}

      <Tabs defaultValue="menus">
        <Tabs.List mb="md">
          <Tabs.Tab value="menus" leftSection={<IconLayoutSidebar size={16} />}>
            1. Daftar Menu Aplikasi & Hak Akses Role ({menus.length})
          </Tabs.Tab>
          <Tabs.Tab value="roles" leftSection={<IconUsersGroup size={16} />}>
            2. Master Role Fungsional — Sumbu 2 ({roles.length})
          </Tabs.Tab>
          <Tabs.Tab value="permissions" leftSection={<IconKey size={16} />}>
            3. Matriks Role vs Permission ({permissions.length} Permissions)
          </Tabs.Tab>
        </Tabs.List>

        {/* TAB 1: MENU REGISTRY & RBAC MAPPING */}
        <Tabs.Panel value="menus">
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
                  <IconLayoutSidebar size={20} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Master Daftar Menu Navigasi & Otorisasi RBAC</Title>
                  <Text size="xs" c="dimmed">
                    Atur struktur grup menu, urutan tampil, visibilitas, serta Role yang diizinkan mengakses setiap menu sidebar secara dinamis
                  </Text>
                </div>
              </Group>

              <Button
                leftSection={<IconPlus size={16} />}
                disabled={!canEditRbac}
                onClick={openCreateMenuModal}
              >
                + Tambah Menu Aplikasi
              </Button>
            </Group>

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Urutan</Table.Th>
                  <Table.Th>Kode & Label Menu</Table.Th>
                  <Table.Th>Grup Kategori Sidebar</Table.Th>
                  <Table.Th>Required Permission</Table.Th>
                  <Table.Th>Role yang Diizinkan (RBAC)</Table.Th>
                  <Table.Th>Tampil di Sidebar</Table.Th>
                  <Table.Th>Aksi</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {menus.map((m) => (
                  <Table.Tr key={m.id}>
                    <Table.Td fw={700}>#{m.sortOrder}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={700}>
                        {m.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        <code>{m.menuCode}</code> — {m.subtitle}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue" variant="light">
                        {m.groupCategory}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="cyan" variant="outline">
                        {m.requiredPermissionCode || 'PUBLIC_AUTH'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {(m.allowedRoleCodes || []).map((rc: string) => (
                          <Badge key={rc} size="xs" color="grape" variant="light">
                            {rc}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        size="sm"
                        disabled={!canEditRbac}
                        checked={m.isVisible !== false}
                        label={m.isVisible !== false ? 'VISIBLE' : 'HIDDEN'}
                        onChange={(e) =>
                          quickToggleMenuVisibility.mutate({
                            menu: m,
                            nextVisible: e.currentTarget.checked,
                          })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <Tooltip
                          label={`Generate otomatis 6 Standard CRUD Permissions (${toPermissionPrefix(m.menuCode)}.Read/Create/Edit/Delete/Approve/Export)`}
                        >
                          <ActionIcon
                            color="teal"
                            variant="light"
                            disabled={!canEditRbac}
                            loading={generateCrudMutation.isPending}
                            onClick={() => generateCrudMutation.mutate(m.id)}
                          >
                            <IconSparkles size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEdit size={14} />}
                          disabled={!canEditRbac}
                          onClick={() => openEditMenuModal(m)}
                        >
                          Edit
                        </Button>
                        <Tooltip label="Hapus Menu">
                          <ActionIcon
                            color="red"
                            variant="light"
                            disabled={!canEditRbac || m.menuCode === 'menu-rbac'}
                            onClick={() => {
                              if (window.confirm(`Hapus menu '${m.title}'?`)) {
                                deleteMenuMutation.mutate(m.id);
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
        </Tabs.Panel>

        {/* TAB 2: MASTER ROLES */}
        <Tabs.Panel value="roles">
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <ThemeIcon size="lg" radius="md" color="grape" variant="light">
                  <IconUsersGroup size={20} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Master Role Fungsional (Sumbu 2 — Access Axis)</Title>
                  <Text size="xs" c="dimmed">
                    Kelola daftar Role sistem yang memisahkan hak akses menu/fitur dari jabatan struktural (Sumbu 1)
                  </Text>
                </div>
              </Group>

              <Button
                leftSection={<IconPlus size={16} />}
                disabled={!canEditRbac}
                onClick={() => {
                  setEditingRoleId(null);
                  setRoleCode('');
                  setRoleName('');
                  setRoleDescription('');
                  setRoleModalOpen(true);
                }}
              >
                + Tambah Role Baru
              </Button>
            </Group>

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Kode Role</Table.Th>
                  <Table.Th>Nama Role Fungsional</Table.Th>
                  <Table.Th>Deskripsi</Table.Th>
                  <Table.Th>Jumlah Permission</Table.Th>
                  <Table.Th>Jumlah Pengguna</Table.Th>
                  <Table.Th>Aksi</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {roles.map((r: any) => (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      <Badge color="grape" size="md">
                        {r.code}
                      </Badge>
                    </Table.Td>
                    <Table.Td fw={700}>{r.name}</Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {r.description || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue" variant="light">
                        {(r.permissionIds || []).length} Permission
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="teal" variant="outline">
                        {r.userCount ?? 0} User
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6}>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEdit size={14} />}
                          disabled={!canEditRbac}
                          onClick={() => {
                            setEditingRoleId(r.id);
                            setRoleCode(r.code);
                            setRoleName(r.name);
                            setRoleDescription(r.description || '');
                            setRoleModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <ActionIcon
                          color="red"
                          variant="light"
                          disabled={!canEditRbac || ['SUPERADMIN', 'EMPLOYEE', 'AUDITOR'].includes(r.code)}
                          onClick={() => {
                            if (window.confirm(`Hapus Role '${r.code}'?`)) {
                              deleteRoleMutation.mutate(r.id);
                            }
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        {/* TAB 3: ROLE-PERMISSION MATRIX */}
        <Tabs.Panel value="permissions">
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                  <IconShieldCog size={20} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Matriks Hak Akses Role vs Permission (RBAC Granular Matrix)</Title>
                  <Text size="xs" c="dimmed">
                    Centang atau hapus centang untuk memberikan/mencabut Permission spesifik pada masing-masing Role
                  </Text>
                </div>
              </Group>

              <Button
                leftSection={<IconPlus size={16} />}
                disabled={!canEditRbac}
                onClick={() => {
                  setPermCode('');
                  setPermModule('Transaction');
                  setPermDescription('');
                  setPermModalOpen(true);
                }}
              >
                + Tambah Permission Baru
              </Button>
            </Group>

            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Kode Permission</Table.Th>
                  <Table.Th>Modul</Table.Th>
                  {roles.map((r: any) => (
                    <Table.Th key={r.id}>{r.code}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {permissions.map((perm: any) => (
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
                    {roles.map((role: any) => {
                      const granted = (role.permissionIds || []).includes(perm.id);
                      return (
                        <Table.Td key={role.id}>
                          <Checkbox
                            checked={granted}
                            disabled={!canEditRbac}
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
        </Tabs.Panel>
      </Tabs>

      {/* ENTERPRISE MODAL 1: ADD / EDIT MENU */}
      <EnterpriseModalShell
        opened={menuModalOpen}
        onClose={() => setMenuModalOpen(false)}
        title={editingMenuId ? `Edit Konfigurasi Menu Aplikasi` : 'Tambah Menu Aplikasi Baru'}
        subtitle="Atur label navigasi, kategori grup sidebar, ikon, urutan tampil, dan hak akses Role RBAC"
        badgeText={editingMenuId ? `EDIT: ${menuCode}` : 'MENU BARU'}
        badgeColor={editingMenuId ? 'blue' : 'teal'}
        icon={<IconLayoutSidebar size={22} />}
        size="xl"
        submitLabel="Simpan Konfigurasi Menu"
        loading={saveMenuMutation.isPending}
        onSubmit={() => saveMenuMutation.mutate()}
      >
        <EnterpriseFormSection
          title="Identitas & Tampilan Navigasi Sidebar"
          subtitle="Kode route internal, judul menu, sub-judul, grup kategori, dan urutan tampil"
          icon={<IconLayoutSidebar size={16} />}
          iconColor="blue"
        >
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Kode Menu (MenuCode)"
                required
                value={menuCode}
                onChange={(e) => {
                  const nextCode = e.currentTarget.value;
                  setMenuCode(nextCode);
                  if (!editingMenuId && autoGenerateCrudPermissions) {
                    setRequiredPermissionCode(`${toPermissionPrefix(nextCode)}.Read`);
                  }
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <TextInput
                label="Judul Menu di Sidebar"
                required
                value={menuTitle}
                onChange={(e) => setMenuTitle(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <NumberInput
                label="Urutan (SortOrder)"
                value={sortOrder}
                onChange={(v) => setSortOrder(Number(v) || 10)}
                step={10}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Sub-Judul / Deskripsi Menu"
                value={menuSubtitle}
                onChange={(e) => setMenuSubtitle(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Kategori Grup Sidebar"
                value={groupCategory}
                onChange={(v) => setGroupCategory(v || 'Core Workspace')}
                data={[
                  'Core Workspace',
                  'Governance & Master Data',
                  'Identity & Access (IAM)',
                  'Compliance & Operations',
                  'User Account',
                ]}
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>

        <EnterpriseFormSection
          title="Otorisasi RBAC, Permission & Visibilitas Menu"
          subtitle="Tentukan ikon, permission yang disyaratkan, serta daftar Role yang berhak mengakses menu ini"
          icon={<IconShieldCog size={16} />}
          iconColor="grape"
        >
          <Grid gutter="sm" align="flex-end">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Ikon Menu Navigasi"
                value={iconName}
                onChange={(v) => setIconName(v || 'IconRoute')}
                data={[
                  'IconRoute',
                  'IconInbox',
                  'IconFileCertificate',
                  'IconUserCheck',
                  'IconUsers',
                  'IconShieldCog',
                  'IconShieldLock',
                  'IconShieldCheck',
                  'IconHeadset',
                  'IconUserCircle',
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Required Permission"
                searchable
                value={requiredPermissionCode}
                onChange={(v) => setRequiredPermissionCode(v || '')}
                data={Array.from(
                  new Map(
                    [
                      {
                        value: `${toPermissionPrefix(menuCode)}.Read`,
                        label: `${toPermissionPrefix(menuCode)}.Read (${toPermissionPrefix(menuCode)} — Auto Standard)`,
                      },
                      ...permissions.map((p: any) => ({
                        value: p.code,
                        label: `${p.code} (${p.module})`,
                      })),
                    ].map((item) => [item.value, item])
                  ).values()
                )}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 7 }}>
              <MultiSelect
                label="Role yang Diizinkan (Allowed Roles)"
                required
                value={allowedRoleCodes}
                onChange={setAllowedRoleCodes}
                data={roleCodeList}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <EnterpriseSwitchCard
                checked={isVisible}
                onChange={setIsVisible}
                title={isVisible ? 'Visibilitas: TAMPIL DI SIDEBAR' : 'Visibilitas: DISEMBUNYIKAN'}
                description="Perubahan langsung berdampak pada daftar navigasi pengguna"
                activeColor="teal"
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <EnterpriseSwitchCard
                checked={autoGenerateCrudPermissions}
                onChange={(checked) => {
                  setAutoGenerateCrudPermissions(checked);
                  if (checked) {
                    setRequiredPermissionCode(`${toPermissionPrefix(menuCode)}.Read`);
                  }
                }}
                title="Auto-Generate 6 Standard CRUD Permissions (Read, Create, Edit, Delete, Approve, Export)"
                description="Otomatis mendaftarkan ke-6 kode permission standar ke Matriks RBAC dan memberikan hak .Read ke Role yang dipilih"
                activeColor="indigo"
              />
            </Grid.Col>

            {autoGenerateCrudPermissions && (
              <Grid.Col span={12}>
                <Paper withBorder p="sm" radius="md">
                  <Group justify="space-between" mb={6}>
                    <Group gap={6}>
                      <IconSparkles size={15} />
                      <Text size="xs" fw={700}>
                        Preview 6 Kode Permission Standar yang Akan Dibuat (Modul: {toPermissionPrefix(menuCode)})
                      </Text>
                    </Group>
                    <Badge size="xs" color="indigo" variant="light">
                      Standar Konvensi Boilerplate
                    </Badge>
                  </Group>
                  <Group gap={6} mb={8}>
                    {['Read', 'Create', 'Edit', 'Delete', 'Approve', 'Export'].map((act) => (
                      <Badge key={act} size="sm" variant="outline" color={act === 'Read' ? 'teal' : 'blue'}>
                        {toPermissionPrefix(menuCode)}.{act}
                      </Badge>
                    ))}
                  </Group>
                  <Text size="xs" c="dimmed">
                    Pemanggilan di komponen React:{' '}
                    <Code>{`const { canRead, canCreate, canEdit, canDelete, canApprove, canExport } = useMenuAccess('${menuCode || 'kode-menu'}');`}</Code>
                  </Text>
                </Paper>
              </Grid.Col>
            )}
          </Grid>
        </EnterpriseFormSection>
      </EnterpriseModalShell>

      {/* ENTERPRISE MODAL 2: ADD / EDIT ROLE */}
      <EnterpriseModalShell
        opened={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRoleId ? `Edit Role Fungsional` : 'Tambah Role Fungsional Baru'}
        subtitle="Kelola peran fungsional (Sumbu 2 — Access Axis) untuk pengelompokan hak akses fitur"
        badgeText={editingRoleId ? `EDIT: ${roleCode}` : 'ROLE BARU'}
        badgeColor="grape"
        icon={<IconUsersGroup size={22} />}
        iconColor="grape"
        size="md"
        submitLabel="Simpan Role"
        submitColor="grape"
        loading={saveRoleMutation.isPending}
        onSubmit={() => saveRoleMutation.mutate()}
      >
        <EnterpriseFormSection
          title="Definisi Role Fungsional (Sumbu 2)"
          subtitle="Kode unik role dan cakupan tanggung jawab fungsionalnya"
          icon={<IconUsersGroup size={16} />}
          iconColor="grape"
        >
          <Stack gap="sm">
            <TextInput
              label="Kode Role (Uppercase)"
              placeholder="FINANCE_CONTROLLER"
              required
              value={roleCode}
              onChange={(e) => setRoleCode(e.currentTarget.value)}
            />
            <TextInput
              label="Nama Role"
              placeholder="Finance & Budget Controller"
              required
              value={roleName}
              onChange={(e) => setRoleName(e.currentTarget.value)}
            />
            <TextInput
              label="Deskripsi Tugas & Kewenangan Akses"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.currentTarget.value)}
            />
          </Stack>
        </EnterpriseFormSection>
      </EnterpriseModalShell>

      {/* ENTERPRISE MODAL 3: ADD PERMISSION */}
      <EnterpriseModalShell
        opened={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        title="Tambah Permission Baru"
        subtitle="Daftarkan kode permission granular baru ke dalam matriks otorisasi RBAC"
        badgeText="PERMISSION BARU"
        badgeColor="teal"
        icon={<IconKey size={22} />}
        iconColor="teal"
        size="md"
        submitLabel="Simpan Permission"
        submitColor="teal"
        loading={createPermMutation.isPending}
        onSubmit={() => createPermMutation.mutate()}
      >
        <EnterpriseFormSection
          title="Spesifikasi Permission Modul"
          subtitle="Format penamaan standar: NamaModul.NamaAksi"
          icon={<IconKey size={16} />}
          iconColor="teal"
        >
          <Stack gap="sm">
            <TextInput
              label="Kode Permission"
              placeholder="Budget.Approve"
              required
              value={permCode}
              onChange={(e) => setPermCode(e.currentTarget.value)}
            />
            <Select
              label="Modul Aplikasi"
              value={permModule}
              onChange={(v) => setPermModule(v || 'Transaction')}
              data={['Transaction', 'Workflow', 'MasterData', 'Audit', 'Servicedesk', 'System', 'IAM']}
            />
            <TextInput
              label="Deskripsi Permission"
              placeholder="Hak akses khusus untuk..."
              value={permDescription}
              onChange={(e) => setPermDescription(e.currentTarget.value)}
            />
          </Stack>
        </EnterpriseFormSection>
      </EnterpriseModalShell>
    </Stack>
  );
}

