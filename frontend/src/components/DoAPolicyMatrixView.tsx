import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  FileInput,
  Grid,
  Group,
  NumberInput,
  Paper,
  Select,
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
  IconCheck,
  IconClock,
  IconCurrencyDollar,
  IconEdit,
  IconEye,
  IconFileCertificate,
  IconFileDescription,
  IconHash,
  IconHierarchy2,
  IconListDetails,
  IconPlus,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAccess } from '../hooks/useAccess';
import {
  EnterpriseFormSection,
  EnterpriseModalShell,
  EnterpriseSwitchCard,
} from './EnterpriseModalShell';

interface DoADetailRow {
  documentTypeCode: string;
  subCategoryCode: string;
  jobLevelCode: string;
  minAmount: number;
  maxAmount: number;
  slaHours: number;
}

const DEFAULT_DETAIL_ROWS: DoADetailRow[] = [
  { documentTypeCode: 'PO', subCategoryCode: 'ALL', jobLevelCode: 'MGR', minAmount: 0, maxAmount: 60000000, slaHours: 24 },
  { documentTypeCode: 'PO', subCategoryCode: 'ALL', jobLevelCode: 'AM', minAmount: 60000001, maxAmount: 90000000, slaHours: 24 },
  { documentTypeCode: 'PO', subCategoryCode: 'ALL', jobLevelCode: 'DIR', minAmount: 90000001, maxAmount: 150000000, slaHours: 48 },
  { documentTypeCode: 'DCP', subCategoryCode: 'ALL', jobLevelCode: 'MGR', minAmount: 0, maxAmount: 75000000, slaHours: 24 },
  { documentTypeCode: 'DCP', subCategoryCode: 'ALL', jobLevelCode: 'AM', minAmount: 75000001, maxAmount: 150000000, slaHours: 24 },
  { documentTypeCode: 'DCP', subCategoryCode: 'ALL', jobLevelCode: 'DIR', minAmount: 150000001, maxAmount: 250000000, slaHours: 48 },
];

export function DoAPolicyMatrixView() {
  const queryClient = useQueryClient();
  const { canWriteMasterData, isReadOnlyAuditor } = useAccess();

  // Split-Screen PDF Preview Modal State
  const [previewPolicy, setPreviewPolicy] = useState<any | null>(null);

  // Add / Edit Form Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyNumber, setPolicyNumber] = useState('');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState<number>(1);
  const [remarks, setRemarks] = useState('');
  const [activateImmediately, setActivateImmediately] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [details, setDetails] = useState<DoADetailRow[]>(DEFAULT_DETAIL_ROWS);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data: policies = [] } = useQuery<any[]>({
    queryKey: ['doa-policies'],
    queryFn: async () => {
      const res = await apiClient.get('/DoAPolicies');
      return res.data;
    },
  });

  const openAddModal = () => {
    const nextVer = policies.length > 0 ? Math.max(...policies.map((p) => p.version || 1)) + 1 : 1;
    setEditingPolicyId(null);
    setPolicyNumber(`SK-DIR/2026/XII/00${nextVer + 3}`);
    setTitle(`Matriks Kewenangan Persetujuan PO & DCP Tahun 2026 (v${nextVer})`);
    setVersion(nextVer);
    setRemarks('Penyusunan / revisi matriks kewenangan DoA');
    setActivateImmediately(false);
    setUploadedFileId(null);
    setUploadedFileName(null);
    setDetails(DEFAULT_DETAIL_ROWS);
    setFormModalOpen(true);
  };

  const openEditModal = (pol: any) => {
    setEditingPolicyId(pol.id);
    setPolicyNumber(pol.policyNumber);
    setTitle(pol.title);
    setVersion(pol.version);
    setRemarks(pol.remarks || '');
    setActivateImmediately(pol.status === 'ACTIVE');
    setUploadedFileId(pol.officialAttachmentFileId || null);
    setUploadedFileName(pol.officialAttachmentFileName || null);
    setDetails(
      (pol.details || []).map((d: any) => ({
        documentTypeCode: d.documentTypeCode,
        subCategoryCode: d.subCategoryCode,
        jobLevelCode: d.jobLevelCode,
        minAmount: d.minAmount,
        maxAmount: d.maxAmount,
        slaHours: d.slaHours,
      }))
    );
    setFormModalOpen(true);
  };

  const uploadPdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('moduleCategory', 'DOA_POLICY_SK');
      const res = await apiClient.post('/Dms/upload', formData);
      return res.data;
    },
    onSuccess: (data) => {
      setUploadedFileId(data.id);
      setUploadedFileName(data.originalFileName);
      notifications.show({
        title: 'SK PDF Berhasil Diunggah ke DMS',
        message: `${data.originalFileName} (SHA-256: ${data.sha256Checksum.slice(0, 16)}...)`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['dms-files'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Upload DMS',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const savePolicyMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        policyNumber,
        title,
        effectiveFrom: new Date().toISOString(),
        version,
        officialAttachmentFileId: uploadedFileId,
        remarks,
        activateImmediately,
        details,
      };

      if (editingPolicyId) {
        const res = await apiClient.put(`/DoAPolicies/${editingPolicyId}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/DoAPolicies', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      notifications.show({
        title: editingPolicyId ? 'Kebijakan SK DoA Diperbarui' : 'Kebijakan SK DoA Ditambahkan',
        message: data.message || `SK ${data.policyNumber} berhasil disimpan (${data.status}).`,
        color: 'green',
      });
      setFormModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['doa-policies'] });
      queryClient.invalidateQueries({ queryKey: ['system-foundation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Validasi Kepatuhan DoA Gagal',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/DoAPolicies/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'SK DoA Dihapus',
        message: data.message,
        color: 'teal',
      });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['doa-policies'] });
      queryClient.invalidateQueries({ queryKey: ['system-foundation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Menghapus SK DoA',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <Stack gap="lg">
      {/* MASTER LIST TABLE OF SK DOA POLICIES */}
      <Card withBorder radius="md">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
              <IconFileCertificate size={20} />
            </ThemeIcon>
            <div>
              <Title order={4}>Daftar Surat Keputusan (SK) Kebijakan DoA</Title>
              <Text size="xs" c="dimmed">
                Kelola dokumen Header-Detail SK DoA, lampiran PDF resmi DMS, serta aksi Tambah, Edit, Hapus & Split-Screen Preview
              </Text>
            </div>
          </Group>

          <Button
            leftSection={<IconPlus size={16} />}
            disabled={!canWriteMasterData}
            onClick={openAddModal}
          >
            {isReadOnlyAuditor ? 'Read-Only (Auditor)' : '+ Tambah SK DoA Baru'}
          </Button>
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nomor SK</Table.Th>
              <Table.Th>Judul Kebijakan DoA</Table.Th>
              <Table.Th>Versi</Table.Th>
              <Table.Th>Berlaku Sejak</Table.Th>
              <Table.Th>Lampiran SK Resmi (DMS)</Table.Th>
              <Table.Th>Jumlah Aturan</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th ta="right">Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {policies.map((pol) => (
              <Table.Tr key={pol.id}>
                <Table.Td fw={700}>{pol.policyNumber}</Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600}>
                    {pol.title}
                  </Text>
                  {pol.remarks && (
                    <Text size="xs" c="dimmed">
                      {pol.remarks}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge variant="outline">v{pol.version}</Badge>
                </Table.Td>
                <Table.Td>{new Date(pol.effectiveFrom).toLocaleDateString('id-ID')}</Table.Td>
                <Table.Td>
                  {pol.officialAttachmentFileId ? (
                    <Badge color="blue" variant="light">
                      {pol.officialAttachmentFileName || 'SK_Direksi.pdf'}
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="outline">
                      Belum Diunggah
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge color="cyan" variant="light">
                    {(pol.details || []).length} Baris Plafond
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={pol.status === 'ACTIVE' ? 'teal' : pol.status === 'SUPERSEDED' ? 'gray' : 'orange'}>
                    {pol.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    <Tooltip label="Lihat Detail Plafond & Split-Screen PDF SK">
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="indigo"
                        leftSection={<IconEye size={14} />}
                        onClick={() => setPreviewPolicy(pol)}
                      >
                        Detail & PDF
                      </Button>
                    </Tooltip>

                    <Tooltip label="Edit Header & Detail SK DoA">
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="blue"
                        leftSection={<IconEdit size={13} />}
                        disabled={!canWriteMasterData}
                        onClick={() => openEditModal(pol)}
                      >
                        Edit
                      </Button>
                    </Tooltip>

                    <Tooltip label="Hapus SK DoA">
                      <ActionIcon
                        variant="light"
                        color="red"
                        disabled={!canWriteMasterData}
                        onClick={() => setDeleteTarget(pol)}
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

      {/* ENTERPRISE MODAL: ADD / EDIT HEADER-DETAIL DOA POLICY */}
      <EnterpriseModalShell
        opened={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingPolicyId ? `Edit Kebijakan SK DoA` : 'Tambah Kebijakan SK DoA Baru'}
        subtitle="Konfigurasi dokumen Header Surat Keputusan Direksi, lampiran PDF resmi DMS, dan matriks detail plafond persetujuan"
        badgeText={editingPolicyId ? `EDIT: ${policyNumber}` : `VERSI BARU v${version}`}
        badgeColor={editingPolicyId ? 'blue' : 'teal'}
        icon={<IconFileCertificate size={22} />}
        size="88%"
        submitLabel={editingPolicyId ? 'Simpan Perubahan SK DoA' : 'Simpan SK DoA Baru'}
        loading={savePolicyMutation.isPending}
        onSubmit={() => savePolicyMutation.mutate()}
      >
        {/* SECTION 1: HEADER SK & LAMPIRAN DMS */}
        <EnterpriseFormSection
          title="Informasi Header Surat Keputusan (SK) & Kepatuhan DMS"
          subtitle="Nomor surat keputusan resmi, judul kebijakan, versi revisi, dan unggahan scan PDF SK Direksi"
          icon={<IconFileDescription size={16} />}
          iconColor="blue"
        >
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Nomor SK Direksi"
                leftSection={<IconHash size={16} />}
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.currentTarget.value)}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Judul Kebijakan DoA"
                leftSection={<IconFileCertificate size={16} />}
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <NumberInput
                label="Versi Revisi"
                value={version}
                min={1}
                onChange={(v) => setVersion(Number(v) || 1)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <FileInput
                label="Unggah PDF SK (DMS)"
                placeholder="Pilih file .pdf"
                accept="application/pdf"
                leftSection={<IconUpload size={15} />}
                onChange={(file) => {
                  if (file) uploadPdfMutation.mutate(file);
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <TextInput
                label="Catatan / Keterangan SK"
                placeholder="Catatan mengenai perubahan batas plafond pada SK ini"
                value={remarks}
                onChange={(e) => setRemarks(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <EnterpriseSwitchCard
                checked={activateImmediately}
                onChange={setActivateImmediately}
                title={activateImmediately ? 'Status SK: ACTIVE (Langsung Berlaku)' : 'Status SK: DRAFT (Rancangan)'}
                description="Aktivasi wajib memiliki file PDF SK di DMS & otomatis mengubah SK lama menjadi SUPERSEDED"
                activeColor="teal"
              />
            </Grid.Col>
          </Grid>

          {uploadedFileId && (
            <Alert color="teal" icon={<IconCheck size={16} />} py="xs" mt="sm" radius="md">
              Lampiran Resmi DMS Terhubung: <strong>{uploadedFileName || 'SK_Direksi.pdf'}</strong> (File ID: <code>{uploadedFileId}</code>)
            </Alert>
          )}
        </EnterpriseFormSection>

        {/* SECTION 2: NESTED DETAIL PLAFOND ROWS */}
        <EnterpriseFormSection
          title="Matriks Baris Detail Plafond per Dokumen & Jabatan (Nested Header-Detail)"
          subtitle="Tentukan batas minimum, plafond maksimum (IDR), dan target SLA persetujuan untuk tiap tipe dokumen & jabatan"
          icon={<IconListDetails size={16} />}
          iconColor="indigo"
          rightSection={
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() =>
                setDetails((prev) => [
                  ...prev,
                  {
                    documentTypeCode: 'PO',
                    subCategoryCode: 'ALL',
                    jobLevelCode: 'MD',
                    minAmount: 150000001,
                    maxAmount: 500000000,
                    slaHours: 48,
                  },
                ])
              }
            >
              + Tambah Baris Plafond
            </Button>
          }
        >
          <Table striped withTableBorder verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 130 }}>Tipe Dokumen</Table.Th>
                <Table.Th style={{ width: 150 }}>Sub-Kategori</Table.Th>
                <Table.Th style={{ width: 150 }}>Level Jabatan</Table.Th>
                <Table.Th>Nominal Minimum (IDR)</Table.Th>
                <Table.Th>Plafond Maksimal (IDR)</Table.Th>
                <Table.Th style={{ width: 110 }}>SLA (Jam)</Table.Th>
                <Table.Th style={{ width: 60 }} ta="center">
                  Hapus
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {details.map((row, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td>
                    <Select
                      size="xs"
                      value={row.documentTypeCode}
                      data={['PO', 'DCP']}
                      onChange={(v) =>
                        setDetails((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, documentTypeCode: v || 'PO' } : it))
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Select
                      size="xs"
                      value={row.subCategoryCode}
                      data={['ALL', 'ASSET', 'AGRO_CHEM', 'GENERAL']}
                      onChange={(v) =>
                        setDetails((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, subCategoryCode: v || 'ALL' } : it))
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Select
                      size="xs"
                      leftSection={<IconHierarchy2 size={13} />}
                      value={row.jobLevelCode}
                      data={['MGR', 'AM', 'GM', 'DIR', 'MD']}
                      onChange={(v) =>
                        setDetails((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, jobLevelCode: v || 'MGR' } : it))
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      leftSection={<IconCurrencyDollar size={13} />}
                      value={row.minAmount}
                      thousandSeparator="."
                      decimalSeparator=","
                      onChange={(v) =>
                        setDetails((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, minAmount: Number(v) || 0 } : it))
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      leftSection={<IconCurrencyDollar size={13} />}
                      value={row.maxAmount}
                      thousandSeparator="."
                      decimalSeparator=","
                      onChange={(v) =>
                        setDetails((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, maxAmount: Number(v) || 0 } : it))
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      leftSection={<IconClock size={13} />}
                      value={row.slaHours}
                      min={1}
                      onChange={(v) =>
                        setDetails((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, slaHours: Number(v) || 24 } : it))
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td ta="center">
                    <ActionIcon
                      color="red"
                      variant="light"
                      size="md"
                      disabled={details.length <= 1}
                      onClick={() => setDetails((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <IconTrash size={15} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </EnterpriseFormSection>
      </EnterpriseModalShell>

      {/* ENTERPRISE MODAL: KONFIRMASI HAPUS SK DOA */}
      <EnterpriseModalShell
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Penghapusan SK DoA"
        subtitle="Tindakan ini akan menghapus dokumen SK DoA beserta seluruh matriks baris plafond terkait"
        badgeText="KONFIRMASI HAPUS"
        badgeColor="red"
        icon={<IconTrash size={20} />}
        iconColor="red"
        size="md"
        submitLabel="Ya, Hapus SK DoA"
        submitColor="red"
        submitIcon={<IconTrash size={16} />}
        loading={deletePolicyMutation.isPending}
        onSubmit={() => deleteTarget && deletePolicyMutation.mutate(deleteTarget.id)}
      >
        {deleteTarget && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} radius="md" title={deleteTarget.policyNumber}>
            Apakah Anda yakin ingin menghapus kebijakan <strong>{deleteTarget.title}</strong>? Kebijakan yang sedang dikunci oleh transaksi aktif tidak dapat dihapus demi integritas audit.
          </Alert>
        )}
      </EnterpriseModalShell>

      {/* ENTERPRISE MODAL: SPLIT-SCREEN DETAIL & PDF PREVIEW */}
      <EnterpriseModalShell
        opened={!!previewPolicy}
        onClose={() => setPreviewPolicy(null)}
        title={`Split-Screen Compliance Viewer — ${previewPolicy?.policyNumber || ''}`}
        subtitle={previewPolicy?.title}
        badgeText={previewPolicy?.status}
        badgeColor={previewPolicy?.status === 'ACTIVE' ? 'teal' : 'gray'}
        icon={<IconEye size={22} />}
        size="92%"
        cancelLabel="Tutup Pratinjau"
      >
        {previewPolicy && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <EnterpriseFormSection
                title="Dokumen Resmi SK Direksi (DMS PDF Stream)"
                subtitle="Salinan dokumen fisik yang tersimpan secara aman pada repositori DMS"
                icon={<IconFileCertificate size={16} />}
                iconColor="blue"
              >
                {previewPolicy.officialAttachmentFileId ? (
                  <iframe
                    title="Official SK PDF Preview"
                    src={`/api/Dms/${previewPolicy.officialAttachmentFileId}/download`}
                    style={{ width: '100%', height: '480px', border: 'none', borderRadius: '8px' }}
                  />
                ) : (
                  <Alert color="orange" radius="md">
                    Kebijakan berstatus <strong>{previewPolicy.status}</strong> ini belum memiliki lampiran file PDF SK Direksi di DMS. Silakan klik tombol Edit untuk mengunggah PDF SK.
                  </Alert>
                )}
              </EnterpriseFormSection>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <EnterpriseFormSection
                title={`Matriks Detail Plafond (${previewPolicy.policyNumber})`}
                subtitle="Daftar batas kewenangan finansial per tipe dokumen dan jabatan struktural"
                icon={<IconListDetails size={16} />}
                iconColor="indigo"
                rightSection={
                  canWriteMasterData ? (
                    <Button
                      size="compact-xs"
                      variant="light"
                      leftSection={<IconEdit size={13} />}
                      onClick={() => {
                        const target = previewPolicy;
                        setPreviewPolicy(null);
                        openEditModal(target);
                      }}
                    >
                      Edit SK Ini
                    </Button>
                  ) : undefined
                }
              >
                <Table striped withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Dokumen</Table.Th>
                      <Table.Th>Sub-Kategori</Table.Th>
                      <Table.Th>Jabatan</Table.Th>
                      <Table.Th>Min Amount</Table.Th>
                      <Table.Th>Plafond Maksimal</Table.Th>
                      <Table.Th>SLA</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(previewPolicy.details || []).map((d: any) => (
                      <Table.Tr key={d.id}>
                        <Table.Td>
                          <Badge color={d.documentTypeCode === 'PO' ? 'blue' : 'teal'}>{d.documentTypeCode}</Badge>
                        </Table.Td>
                        <Table.Td>{d.subCategoryCode}</Table.Td>
                        <Table.Td fw={600}>
                          {d.jobLevelName} ({d.jobLevelCode})
                        </Table.Td>
                        <Table.Td>{formatIDR(d.minAmount)}</Table.Td>
                        <Table.Td fw={700}>{formatIDR(d.maxAmount)}</Table.Td>
                        <Table.Td>{d.slaHours}h</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </EnterpriseFormSection>
            </Grid.Col>
          </Grid>
        )}
      </EnterpriseModalShell>
    </Stack>
  );
}
