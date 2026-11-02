import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
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
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCheck,
  IconEdit,
  IconPlayerPlay,
  IconPlus,
  IconShieldLock,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAccess } from '../hooks/useAccess';
import {
  EnterpriseFormSection,
  EnterpriseModalShell,
  EnterpriseSwitchCard,
} from './EnterpriseModalShell';

export function AbacManagementView() {
  const queryClient = useQueryClient();
  const { canManageSystemAdmin, canWriteMasterData, isReadOnlyAuditor } = useAccess();
  const canEditAbac = (canManageSystemAdmin || canWriteMasterData) && !isReadOnlyAuditor;

  // Add / Edit ABAC Policy Modal State
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyCode, setPolicyCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetResource, setTargetResource] = useState('TRANSACTION_PO');
  const [targetAction, setTargetAction] = useState('APPROVE');
  const [subjectJobLevels, setSubjectJobLevels] = useState<string[]>(['MGR', 'AM', 'DIR']);
  const [minJobRank, setMinJobRank] = useState<number>(20);
  const [maxJobRank, setMaxJobRank] = useState<number>(60);
  const [subjectRoles, setSubjectRoles] = useState<string[]>(['EMPLOYEE', 'MASTER_DATA', 'SUPERADMIN']);
  const [orgScopeRule, setOrgScopeRule] = useState('SAME_ORG_BRANCH_UPWARD');
  const [subCategoryScope, setSubCategoryScope] = useState('ALL');
  const [maxTransactionAmount, setMaxTransactionAmount] = useState<number | string>(75000000);
  const [enforceFourEyesSod, setEnforceFourEyesSod] = useState(true);
  const [requireDigitalSignature, setRequireDigitalSignature] = useState(false);
  const [effect, setEffect] = useState('ALLOW');
  const [priorityOrder, setPriorityOrder] = useState<number>(25);
  const [isActive, setIsActive] = useState(true);

  // Live ABAC Evaluator Modal State
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalUserId, setEvalUserId] = useState<string>('');
  const [evalResource, setEvalResource] = useState<string>('TRANSACTION_PO');
  const [evalAction, setEvalAction] = useState<string>('APPROVE');
  const [evalOrgUnitId, setEvalOrgUnitId] = useState<string>('');
  const [evalSubCategory, setEvalSubCategory] = useState<string>('ASSET');
  const [evalAmount, setEvalAmount] = useState<number>(45000000);
  const [evalSelfApproval, setEvalSelfApproval] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);

  const { data: policies = [] } = useQuery<any[]>({
    queryKey: ['abac-policies'],
    queryFn: async () => {
      const res = await apiClient.get('/AbacPolicies');
      return res.data;
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['demo-users'],
    queryFn: async () => {
      const res = await apiClient.get('/Auth/demo-users');
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

  const formatIDR = (val?: number | null) =>
    val != null
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
      : 'Tanpa Batas (Unlimited)';

  const openCreateModal = () => {
    setEditingPolicyId(null);
    setPolicyCode(`ABAC-RULE-0${policies.length + 1}`);
    setName('');
    setDescription('');
    setTargetResource('TRANSACTION_PO');
    setTargetAction('APPROVE');
    setSubjectJobLevels(['MGR', 'AM', 'DIR']);
    setMinJobRank(20);
    setMaxJobRank(60);
    setSubjectRoles(['EMPLOYEE', 'MASTER_DATA', 'SUPERADMIN']);
    setOrgScopeRule('SAME_ORG_BRANCH_UPWARD');
    setSubCategoryScope('ALL');
    setMaxTransactionAmount(75000000);
    setEnforceFourEyesSod(true);
    setRequireDigitalSignature(false);
    setEffect('ALLOW');
    setPriorityOrder((policies.length + 1) * 10);
    setIsActive(true);
    setPolicyModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingPolicyId(p.id);
    setPolicyCode(p.policyCode);
    setName(p.name);
    setDescription(p.description || '');
    setTargetResource(p.targetResource || 'ALL');
    setTargetAction(p.targetAction || 'ALL');
    setSubjectJobLevels(p.subjectJobLevels || ['ALL']);
    setMinJobRank(p.minJobRank ?? 0);
    setMaxJobRank(p.maxJobRank ?? 100);
    setSubjectRoles(p.subjectRoles || ['ALL']);
    setOrgScopeRule(p.orgScopeRule || 'ANY_ORG_UNIT');
    setSubCategoryScope(p.subCategoryScope || 'ALL');
    setMaxTransactionAmount(p.maxTransactionAmount ?? '');
    setEnforceFourEyesSod(!!p.enforceFourEyesSod);
    setRequireDigitalSignature(!!p.requireDigitalSignature);
    setEffect(p.effect || 'ALLOW');
    setPriorityOrder(p.priorityOrder || 10);
    setIsActive(p.isActive !== false);
    setPolicyModalOpen(true);
  };

  const savePolicyMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        policyCode,
        name,
        description,
        targetResource,
        targetAction,
        subjectJobLevels,
        minJobRank,
        maxJobRank,
        subjectRoles,
        orgScopeRule,
        subCategoryScope,
        maxTransactionAmount:
          maxTransactionAmount === '' || maxTransactionAmount === null || Number(maxTransactionAmount) <= 0
            ? null
            : Number(maxTransactionAmount),
        enforceFourEyesSod,
        requireDigitalSignature,
        effect,
        priorityOrder,
        isActive,
      };
      if (editingPolicyId) {
        const res = await apiClient.put(`/AbacPolicies/${editingPolicyId}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/AbacPolicies', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      notifications.show({
        title: editingPolicyId ? 'Kebijakan ABAC Diperbarui' : 'Kebijakan ABAC Ditambahkan',
        message: data.message,
        color: 'green',
      });
      setPolicyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['abac-policies'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menyimpan Kebijakan ABAC',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/AbacPolicies/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Kebijakan ABAC Dihapus', message: data.message, color: 'teal' });
      queryClient.invalidateQueries({ queryKey: ['abac-policies'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menghapus Kebijakan ABAC',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const targetUser = evalUserId || users[0]?.id;
      const res = await apiClient.post('/AbacPolicies/evaluate', {
        userId: targetUser,
        targetResource: evalResource,
        targetAction: evalAction,
        resourceOrgUnitId: evalOrgUnitId || null,
        subCategoryCode: evalSubCategory,
        transactionAmount: evalAmount,
        isSelfApproval: evalSelfApproval,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setEvalResult(data);
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Evaluasi ABAC Gagal',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  return (
    <Stack gap="lg">
      {isReadOnlyAuditor && (
        <Alert color="orange" icon={<IconAlertTriangle size={18} />} title="Mode Auditor (Global Read-Only)">
          Anda dapat menginspeksi seluruh daftar aturan Attribute-Based Access Control (ABAC) dan menjalankan Simulator Evaluasi ABAC, namun perubahan aturan dinonaktifkan.
        </Alert>
      )}

      {/* MASTER LIST OF ABAC POLICIES */}
      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
              <IconShieldLock size={20} />
            </ThemeIcon>
            <div>
              <Title order={4}>Master Daftar Kebijakan ABAC (Attribute-Based Access Control)</Title>
              <Text size="xs" c="dimmed">
                Aturan otorisasi berbasis atribut Subjek (Jabatan/Rank Sumbu 1 & Role Sumbu 2), Objek Transaksi (Sub-Kategori & Nilai Plafond), serta Konteks Cabang Organisasi (Sumbu 3) & SoD 4-Eyes
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Button
              variant="light"
              color="teal"
              leftSection={<IconPlayerPlay size={16} />}
              onClick={() => {
                setEvalUserId(users[0]?.id || '');
                setEvalOrgUnitId(orgUnits[0]?.id || '');
                setEvalResult(null);
                setEvalModalOpen(true);
              }}
            >
              Simulasi & Uji Evaluasi ABAC
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              disabled={!canEditAbac}
              onClick={openCreateModal}
            >
              + Tambah Aturan ABAC
            </Button>
          </Group>
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Prioritas</Table.Th>
              <Table.Th>Kode & Nama Kebijakan ABAC</Table.Th>
              <Table.Th>Resource & Action</Table.Th>
              <Table.Th>Atribut Subjek (Axis 1 & 2)</Table.Th>
              <Table.Th>Atribut Konteks & Plafond (Axis 3)</Table.Th>
              <Table.Th>Efek & Status</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {policies.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td fw={700}>#{p.priorityOrder}</Table.Td>
                <Table.Td style={{ maxWidth: 280 }}>
                  <Group gap={6}>
                    <Badge size="xs" variant="outline" color="indigo">
                      {p.policyCode}
                    </Badge>
                  </Group>
                  <Text size="sm" fw={700} mt={2}>
                    {p.name}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {p.description}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="blue" size="xs">
                    {p.targetResource}
                  </Badge>
                  <Text size="xs" fw={600} mt={4}>
                    Action: {p.targetAction}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">
                    <strong>Jabatan:</strong> {(p.subjectJobLevels || []).join(', ')} (Rank {p.minJobRank}–{p.maxJobRank})
                  </Text>
                  <Text size="xs" mt={2}>
                    <strong>Role:</strong> {(p.subjectRoles || []).join(', ')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Badge size="xs" color="cyan" variant="light">
                      {p.orgScopeRule}
                    </Badge>
                    <Badge size="xs" color="grape" variant="outline">
                      Sub: {p.subCategoryScope}
                    </Badge>
                    {p.enforceFourEyesSod && (
                      <Badge size="xs" color="orange" variant="filled">
                        4-Eyes SoD
                      </Badge>
                    )}
                    {p.requireDigitalSignature && (
                      <Badge size="xs" color="teal" variant="outline">
                        Wajib Paraf
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" fw={600} mt={4}>
                    Batas Maks: {formatIDR(p.maxTransactionAmount)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Badge color={p.effect === 'DENY' ? 'red' : 'green'} variant="filled">
                      {p.effect}
                    </Badge>
                    <Badge color={p.isActive ? 'teal' : 'gray'} variant="light">
                      {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEdit size={14} />}
                      disabled={!canEditAbac}
                      onClick={() => openEditModal(p)}
                    >
                      Edit
                    </Button>
                    <Tooltip label="Hapus Aturan ABAC">
                      <ActionIcon
                        color="red"
                        variant="light"
                        disabled={!canEditAbac}
                        onClick={() => {
                          if (window.confirm(`Hapus kebijakan ABAC '${p.policyCode}'?`)) {
                            deletePolicyMutation.mutate(p.id);
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

      {/* ENTERPRISE MODAL 1: ADD / EDIT ABAC POLICY */}
      <EnterpriseModalShell
        opened={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        title={editingPolicyId ? `Edit Kebijakan ABAC` : 'Buat Kebijakan ABAC Baru'}
        subtitle="Konfigurasi aturan otorisasi berbasis atribut Subjek (Axis 1 & 2), Objek Transaksi, dan Konteks Organisasi (Axis 3)"
        badgeText={editingPolicyId ? `EDIT: ${policyCode}` : 'ATURAN ABAC BARU'}
        badgeColor={effect === 'DENY' ? 'red' : 'teal'}
        icon={<IconShieldLock size={22} />}
        size="85%"
        submitLabel="Simpan Kebijakan ABAC"
        loading={savePolicyMutation.isPending}
        onSubmit={() => savePolicyMutation.mutate()}
      >
        <EnterpriseFormSection
          title="Identitas Aturan, Target Resource & Policy Effect"
          subtitle="Kode unik kebijakan, prioritas evaluasi, objek sistem yang diatur, dan efek keputusan (ALLOW / DENY)"
          icon={<IconShieldLock size={16} />}
          iconColor="blue"
        >
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Kode Aturan ABAC"
                required
                value={policyCode}
                onChange={(e) => setPolicyCode(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Nama Kebijakan ABAC"
                required
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <NumberInput
                label="Prioritas Evaluasi"
                value={priorityOrder}
                onChange={(v) => setPriorityOrder(Number(v) || 10)}
                min={1}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Target Resource"
                value={targetResource}
                onChange={(v) => setTargetResource(v || 'ALL')}
                data={[
                  { value: 'ALL', label: 'ALL — Seluruh Objek Sistem' },
                  { value: 'TRANSACTION_PO', label: 'TRANSACTION_PO — Purchase Order' },
                  { value: 'TRANSACTION_DCP', label: 'TRANSACTION_DCP — Direct Cash Payment' },
                  { value: 'WORKFLOW_APPROVAL', label: 'WORKFLOW_APPROVAL — Persetujuan Berjenjang' },
                  { value: 'DOA_POLICY', label: 'DOA_POLICY — Matriks SK DoA' },
                  { value: 'AUDIT_LOG', label: 'AUDIT_LOG — Jejak Audit & DMS' },
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Target Action (Koma)"
                placeholder="CREATE,UPDATE,SUBMIT,APPROVE"
                value={targetAction}
                onChange={(e) => setTargetAction(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Keputusan Aturan (Effect)"
                value={effect}
                onChange={(v) => setEffect(v || 'ALLOW')}
                data={[
                  { value: 'ALLOW', label: 'ALLOW — Izinkan Akses bila Cocok' },
                  { value: 'DENY', label: 'DENY — Tolak Mutlak bila Cocok' },
                ]}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Deskripsi Aturan & Tujuan Kepatuhan"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>

        <EnterpriseFormSection
          title="Atribut Subjek Pengguna (Sumbu 1 Jabatan/Rank & Sumbu 2 Role)"
          subtitle="Kriteria jabatan struktural, rentang rank, dan role fungsional yang menjadi subjek aturan ini"
          icon={<IconCheck size={16} />}
          iconColor="indigo"
        >
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <MultiSelect
                label="Jabatan Subjek (JobLevels)"
                value={subjectJobLevels}
                onChange={(vals) => setSubjectJobLevels(vals.length > 0 ? vals : ['ALL'])}
                data={['ALL', 'STAFF', 'MGR', 'AM', 'GM', 'DIR', 'MD']}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 2 }}>
              <NumberInput
                label="Min JobRank"
                value={minJobRank}
                onChange={(v) => setMinJobRank(Number(v) || 0)}
                step={10}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 2 }}>
              <NumberInput
                label="Max JobRank"
                value={maxJobRank}
                onChange={(v) => setMaxJobRank(Number(v) || 100)}
                step={10}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <MultiSelect
                label="Role Subjek (SubjectRoles)"
                value={subjectRoles}
                onChange={(vals) => setSubjectRoles(vals.length > 0 ? vals : ['ALL'])}
                data={['ALL', 'EMPLOYEE', 'AUDITOR', 'SERVICEDESK', 'MASTER_DATA', 'SUPERADMIN']}
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>

        <EnterpriseFormSection
          title="Atribut Konteks Organisasi, Sub-Kategori, Nilai & SoD (Sumbu 3)"
          subtitle="Batasan cabang organisasi, sub-kategori dokumen, batas nominal transaksi, dan kepatuhan 4-Eyes Principle"
          icon={<IconShieldLock size={16} />}
          iconColor="teal"
        >
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Cakupan Unit Organisasi (OrgScopeRule)"
                value={orgScopeRule}
                onChange={(v) => setOrgScopeRule(v || 'ANY_ORG_UNIT')}
                data={[
                  { value: 'ANY_ORG_UNIT', label: 'ANY_ORG_UNIT — Lintas Unit Organisasi' },
                  { value: 'SAME_DEPARTMENT_ONLY', label: 'SAME_DEPARTMENT_ONLY — Hanya Unit Sendiri' },
                  { value: 'SAME_ORG_BRANCH_UPWARD', label: 'SAME_ORG_BRANCH_UPWARD — Satu Garis Cabang ke Atas' },
                  { value: 'HEAD_OFFICE_ONLY', label: 'HEAD_OFFICE_ONLY — Khusus Head Office (HO)' },
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Sub-Kategori Dokumen"
                value={subCategoryScope}
                onChange={(v) => setSubCategoryScope(v || 'ALL')}
                data={['ALL', 'ASSET', 'AGRO_CHEM', 'GENERAL']}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <NumberInput
                label="Batas Maksimal Transaksi (IDR)"
                placeholder="Kosongkan bila tanpa batas"
                value={maxTransactionAmount}
                onChange={setMaxTransactionAmount}
                thousandSeparator="."
                decimalSeparator=","
                step={5000000}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <EnterpriseSwitchCard
                checked={enforceFourEyesSod}
                onChange={setEnforceFourEyesSod}
                title="Wajib 4-Eyes Principle (SoD)"
                description="Pejabat Approver tidak boleh sama dengan Pengaju"
                activeColor="orange"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <EnterpriseSwitchCard
                checked={requireDigitalSignature}
                onChange={setRequireDigitalSignature}
                title="Wajib Paraf Digital (.webp)"
                description="Subjek wajib memiliki file paraf digital di DMS"
                activeColor="indigo"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <EnterpriseSwitchCard
                checked={isActive}
                onChange={setIsActive}
                title={isActive ? 'Status Aturan: ACTIVE' : 'Status Aturan: INACTIVE'}
                description="Aturan aktif dievaluasi otomatis oleh mesin ABAC"
                activeColor="teal"
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>
      </EnterpriseModalShell>

      {/* ENTERPRISE MODAL 2: LIVE ABAC POLICY EVALUATOR */}
      <EnterpriseModalShell
        opened={evalModalOpen}
        onClose={() => setEvalModalOpen(false)}
        title="Simulator & Uji Evaluasi Kebijakan ABAC"
        subtitle="Uji keputusan otorisasi atribut secara real-time terhadap seluruh aturan ABAC aktif di PostgreSQL"
        badgeText="REAL-TIME EVALUATOR"
        badgeColor="teal"
        icon={<IconPlayerPlay size={22} />}
        iconColor="teal"
        size="85%"
        submitLabel="Jalankan Evaluasi ABAC Sekarang"
        submitColor="teal"
        submitIcon={<IconPlayerPlay size={16} />}
        loading={evaluateMutation.isPending}
        onSubmit={() => evaluateMutation.mutate()}
      >
        <EnterpriseFormSection
          title="Parameter Konteks Pengujian Evaluasi ABAC"
          subtitle="Pilih kombinasi identitas pengguna, target resource, aksi, unit organisasi dokumen, dan nominal"
          icon={<IconPlayerPlay size={16} />}
          iconColor="teal"
        >
          <Grid align="flex-end">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Subjek Pengguna (User Identity)"
                value={evalUserId}
                onChange={(v) => setEvalUserId(v || '')}
                data={users.map((u: any) => ({
                  value: u.id,
                  label: `${u.username} — ${u.fullName} (${u.jobLevel} @ ${u.orgUnitCode})`,
                }))}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <Select
                label="Resource"
                value={evalResource}
                onChange={(v) => setEvalResource(v || 'TRANSACTION_PO')}
                data={[
                  'TRANSACTION_PO',
                  'TRANSACTION_DCP',
                  'WORKFLOW_APPROVAL',
                  'DOA_POLICY',
                  'AUDIT_LOG',
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <Select
                label="Action"
                value={evalAction}
                onChange={(v) => setEvalAction(v || 'APPROVE')}
                data={['READ', 'CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE']}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Unit Organisasi Dokumen (Resource OrgUnit)"
                value={evalOrgUnitId}
                onChange={(v) => setEvalOrgUnitId(v || '')}
                data={orgUnits.map((o: any) => ({
                  value: o.id,
                  label: `${o.code} — ${o.name}`,
                }))}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <Select
                label="Sub-Kategori"
                value={evalSubCategory}
                onChange={(v) => setEvalSubCategory(v || 'ASSET')}
                data={['ALL', 'ASSET', 'AGRO_CHEM', 'GENERAL']}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 5 }}>
              <NumberInput
                label="Nilai Transaksi (IDR)"
                value={evalAmount}
                onChange={(v) => setEvalAmount(Number(v) || 0)}
                thousandSeparator="."
                decimalSeparator=","
                step={10000000}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <EnterpriseSwitchCard
                checked={evalSelfApproval}
                onChange={setEvalSelfApproval}
                title="Simulasikan Pengaju == Approver (Uji Pelanggaran 4-Eyes Principle SoD)"
                description="Aktifkan untuk melihat bagaimana aturan ABAC menolak persetujuan dokumen milik sendiri"
                activeColor="orange"
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>

        {evalResult && (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm">
              <div>
                <Text size="xs" c="dimmed">
                  Subjek Evaluasi: {evalResult.subjectSummary}
                </Text>
                <Title order={5} c={evalResult.isAllowed ? 'teal' : 'red'}>
                  Keputusan Akhir: {evalResult.finalDecision}
                </Title>
              </div>
              <Badge
                size="lg"
                color={evalResult.isAllowed ? 'teal' : 'red'}
                leftSection={evalResult.isAllowed ? <IconCheck size={14} /> : <IconX size={14} />}
              >
                {evalResult.isAllowed ? 'ACCESS ALLOWED' : 'ACCESS DENIED'}
              </Badge>
            </Group>

            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Prioritas</Table.Th>
                  <Table.Th>Aturan ABAC</Table.Th>
                  <Table.Th>Effect</Table.Th>
                  <Table.Th>Cocok (Matched)</Table.Th>
                  <Table.Th>Rincian Evaluasi Atribut</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(evalResult.traces || []).map((t: any) => (
                  <Table.Tr key={t.policyCode}>
                    <Table.Td fw={700}>#{t.priorityOrder}</Table.Td>
                    <Table.Td>
                      <Text size="xs" fw={700}>
                        {t.policyCode}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {t.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" color={t.effect === 'DENY' ? 'red' : 'green'}>
                        {t.effect}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" color={t.matched ? 'teal' : 'gray'}>
                        {t.matched ? 'MATCHED' : 'SKIPPED'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="11px" c="dimmed">
                        {t.details}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </EnterpriseModalShell>
    </Stack>
  );
}
