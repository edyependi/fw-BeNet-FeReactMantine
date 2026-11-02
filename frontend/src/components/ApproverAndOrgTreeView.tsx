import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  NavLink,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBuildingCommunity,
  IconHierarchy2,
  IconPlus,
  IconTrash,
  IconUserCheck,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAccess } from '../hooks/useAccess';

interface Props {
  users: any[];
}

export function ApproverAndOrgTreeView({ users }: Props) {
  const queryClient = useQueryClient();
  const { canWriteMasterData, isReadOnlyAuditor } = useAccess();
  const [selectedOrgCode, setSelectedOrgCode] = useState<string>('ALL');

  // New Assignment Form State
  const [assignUserId, setAssignUserId] = useState<string>('');
  const [assignJobLevel, setAssignJobLevel] = useState<string>('MGR');
  const [assignOrgId, setAssignOrgId] = useState<string>('');
  const [assignDocType, setAssignDocType] = useState<string>('PO');
  const [assignSubCat, setAssignSubCat] = useState<string>('ASSET');

  // Delegation Form State
  const [delegatorId, setDelegatorId] = useState<string>('');
  const [delegateeId, setDelegateeId] = useState<string>('');
  const [delDocType, setDelDocType] = useState<string>('ALL');
  const [delReason, setDelReason] = useState<string>('Dinas Luar Kota / Cuti Tahunan');

  const { data: orgUnits = [] } = useQuery<any[]>({
    queryKey: ['organization-units'],
    queryFn: async () => {
      const res = await apiClient.get('/MasterData/organization-units');
      return res.data;
    },
  });

  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ['approver-assignments'],
    queryFn: async () => {
      const res = await apiClient.get('/MasterData/approver-assignments');
      return res.data;
    },
  });

  const { data: delegations = [] } = useQuery<any[]>({
    queryKey: ['approval-delegations'],
    queryFn: async () => {
      const res = await apiClient.get('/MasterData/delegations');
      return res.data;
    },
  });

  const createAssignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/MasterData/approver-assignments', {
        userId: assignUserId || users[0]?.id,
        jobLevelCode: assignJobLevel,
        orgUnitId: assignOrgId || orgUnits[0]?.id,
        docTypeCode: assignDocType,
        subCategoryCode: assignSubCat,
        priorityOrder: 1,
      });
      return res.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Penugasan Approver Disimpan', message: 'Matriks 3-Axis berhasil diperbarui.', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['approver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['system-foundation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const deleteAssignMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/MasterData/approver-assignments/${id}`);
    },
    onSuccess: () => {
      notifications.show({ title: 'Penugasan Dihapus', message: 'Baris penugasan berhasil dihapus.', color: 'orange' });
      queryClient.invalidateQueries({ queryKey: ['approver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['system-foundation-summary'] });
    },
  });

  const createDelegationMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      const res = await apiClient.post('/MasterData/delegations', {
        delegatorUserId: delegatorId || users[0]?.id,
        delegateeUserId: delegateeId || users[1]?.id,
        docTypeCode: delDocType,
        startDate: now.toISOString(),
        endDate: nextWeek.toISOString(),
        reason: delReason,
      });
      return res.data;
    },
    onSuccess: () => {
      notifications.show({
        title: 'Delegasi Cuti/Plh Diaktifkan',
        message: 'Tugas persetujuan akan otomatis dialihkan dengan atribusi On Behalf Of.',
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['approval-delegations'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
    },
  });

  const filteredAssignments =
    selectedOrgCode === 'ALL'
      ? assignments
      : assignments.filter((a) => a.orgUnitCode === selectedOrgCode);

  return (
    <Stack gap="lg">
      <Grid>
        {/* Left Column: Organization Tree Explorer (Section 6.2 PRD) */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" padding="md" h="100%">
            <Group gap="xs" mb="md">
              <IconHierarchy2 size={20} />
              <div>
                <Title order={5}>Organization Tree Explorer</Title>
                <Text size="xs" c="dimmed">
                  Axis 2 — Pohon Organisasi Berjenjang
                </Text>
              </div>
            </Group>

            <Stack gap={4}>
              <NavLink
                active={selectedOrgCode === 'ALL'}
                label="Seluruh Unit Organisasi (ALL)"
                description="Tampilkan semua penugasan pejabat"
                leftSection={<IconBuildingCommunity size={16} />}
                onClick={() => setSelectedOrgCode('ALL')}
              />
              {orgUnits.map((u) => {
                const indent =
                  u.unitType === 'COMPANY'
                    ? 0
                    : u.unitType === 'REGIONAL'
                      ? 12
                      : u.unitType === 'AREA'
                        ? 24
                        : 36;
                return (
                  <NavLink
                    key={u.id}
                    style={{ paddingLeft: `${12 + indent}px` }}
                    active={selectedOrgCode === u.code}
                    label={`${u.code} — ${u.name}`}
                    description={`Tipe: ${u.unitType}${u.parentUnitCode ? ` (Parent: ${u.parentUnitCode})` : ''}`}
                    onClick={() => setSelectedOrgCode(u.code)}
                  />
                );
              })}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Right Column: 3-Axis Approver Assignments Table & Form */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <IconUserCheck size={22} />
                <div>
                  <Title order={4}>Matriks Penugasan Approver (ApprovalAuthorityAssignments)</Title>
                  <Text size="xs" c="dimmed">
                    Menempelkan UserId ke kombinasi JobLevel + OrgUnit + DocType + SubCategory (Mendukung Plt./Multi-Position)
                  </Text>
                </div>
              </Group>
              <Badge>{filteredAssignments.length} Penugasan</Badge>
            </Group>

            <Paper withBorder p="sm" radius="md" mb="md">
              <Text fw={600} size="xs" mb="xs">
                Tambah Penugasan Pejabat Baru (Termasuk Rangkap Jabatan / Plt.)
              </Text>
              <Grid align="flex-end">
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <Select
                    label="Pejabat (UserId)"
                    placeholder="Pilih User"
                    value={assignUserId}
                    onChange={(v) => setAssignUserId(v || '')}
                    data={users.map((u) => ({ value: u.id, label: `${u.username} — ${u.fullName}` }))}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 2 }}>
                  <Select
                    label="Job Level"
                    value={assignJobLevel}
                    onChange={(v) => setAssignJobLevel(v || 'MGR')}
                    data={['MGR', 'AM', 'GM', 'DIR', 'MD']}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 3 }}>
                  <Select
                    label="Unit Organisasi"
                    placeholder="Pilih Unit"
                    value={assignOrgId}
                    onChange={(v) => setAssignOrgId(v || '')}
                    data={orgUnits.map((o) => ({ value: o.id, label: `${o.code} (${o.name})` }))}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 2 }}>
                  <Select
                    label="Doc / SubCat"
                    value={`${assignDocType}:${assignSubCat}`}
                    onChange={(v) => {
                      const [d, s] = (v || 'PO:ASSET').split(':');
                      setAssignDocType(d);
                      setAssignSubCat(s);
                    }}
                    data={[
                      { value: 'PO:ASSET', label: 'PO / ASSET' },
                      { value: 'PO:AGRO_CHEM', label: 'PO / AGRO_CHEM' },
                      { value: 'DCP:GENERAL', label: 'DCP / GENERAL' },
                      { value: 'ALL:ALL', label: 'ALL / ALL' },
                    ]}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 2 }}>
                  <Button
                    fullWidth
                    disabled={!canWriteMasterData}
                    leftSection={<IconPlus size={14} />}
                    loading={createAssignMutation.isPending}
                    onClick={() => createAssignMutation.mutate()}
                  >
                    Tambah
                  </Button>
                </Grid.Col>
              </Grid>
            </Paper>

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Org Unit (Axis 2)</Table.Th>
                  <Table.Th>Job Level (Axis 1)</Table.Th>
                  <Table.Th>Doc Type</Table.Th>
                  <Table.Th>Sub-Category (Axis 3)</Table.Th>
                  <Table.Th>Pejabat Approver</Table.Th>
                  <Table.Th>Aksi</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredAssignments.map((a) => (
                  <Table.Tr key={a.id}>
                    <Table.Td fw={600}>
                      {a.orgUnitCode} — {a.orgUnitName}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="outline">{a.jobLevelCode}</Badge>
                    </Table.Td>
                    <Table.Td>{a.docTypeCode}</Table.Td>
                    <Table.Td>
                      <Badge color={a.subCategoryCode === 'ALL' ? 'gray' : 'grape'}>{a.subCategoryCode}</Badge>
                    </Table.Td>
                    <Table.Td>{a.fullName}</Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        disabled={!canWriteMasterData}
                        onClick={() => deleteAssignMutation.mutate(a.id)}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Delegasi Sementara (ApprovalDelegations) */}
      <Card withBorder radius="md" padding="lg">
        <Group gap="xs" mb="md">
          <IconUsersGroup size={22} />
          <div>
            <Title order={4}>Substitusi Delegasi Sementara / Cuti (ApprovalDelegations — On Behalf Of)</Title>
            <Text size="xs" c="dimmed">
              Mengalihkan tugas persetujuan pejabat yang sedang cuti/dinas ke pejabat pengganti secara otomatis
            </Text>
          </div>
        </Group>

        <Grid align="flex-end" mb="md">
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label="Pemberi Kuasa (Delegator)"
              placeholder="Pilih Pejabat Cuti"
              value={delegatorId}
              onChange={(v) => setDelegatorId(v || '')}
              data={users.map((u) => ({ value: u.id, label: `${u.username} — ${u.fullName}` }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label="Penerima Kuasa (Delegatee)"
              placeholder="Pilih Pejabat Pengganti"
              value={delegateeId}
              onChange={(v) => setDelegateeId(v || '')}
              data={users.map((u) => ({ value: u.id, label: `${u.username} — ${u.fullName}` }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 2 }}>
            <Select label="Cakupan Dokumen" value={delDocType} onChange={(v) => setDelDocType(v || 'ALL')} data={['ALL', 'PO', 'DCP']} />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 2 }}>
            <TextInput label="Alasan Cuti/Dinas" value={delReason} onChange={(e) => setDelReason(e.currentTarget.value)} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Button
              fullWidth
              color="teal"
              disabled={isReadOnlyAuditor}
              onClick={() => createDelegationMutation.mutate()}
              loading={createDelegationMutation.isPending}
            >
              Aktifkan Delegasi 7 Hari
            </Button>
          </Grid.Col>
        </Grid>

        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pemberi Kuasa</Table.Th>
              <Table.Th>Penerima Kuasa (On Behalf Of)</Table.Th>
              <Table.Th>Dokumen</Table.Th>
              <Table.Th>Masa Berlaku</Table.Th>
              <Table.Th>Alasan</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {delegations.map((d) => (
              <Table.Tr key={d.id}>
                <Table.Td fw={600}>{d.delegatorName}</Table.Td>
                <Table.Td fw={600} c="teal">
                  {d.delegateeName}
                </Table.Td>
                <Table.Td>
                  <Badge>{d.docTypeCode}</Badge>
                </Table.Td>
                <Table.Td>
                  {new Date(d.startDate).toLocaleDateString('id-ID')} s/d {new Date(d.endDate).toLocaleDateString('id-ID')}
                </Table.Td>
                <Table.Td>{d.reason}</Table.Td>
                <Table.Td>
                  <Badge color={d.isActive ? 'green' : 'gray'}>{d.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}

