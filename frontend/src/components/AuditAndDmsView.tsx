import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Code,
  FileInput,
  Grid,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
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
  IconCheck,
  IconDownload,
  IconEye,
  IconFileAnalytics,
  IconFileCertificate,
  IconFileDatabase,
  IconFilter,
  IconHash,
  IconHistory,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconUpload,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAccess } from '../hooks/useAccess';
import { EnterpriseFormSection, EnterpriseModalShell } from './EnterpriseModalShell';

/**
 * MENU 1: Dedicated Audit Trail Inspector (PostgreSQL jsonb Append-Only)
 */
export function AuditTrailView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data: auditLogs = [], isFetching } = useQuery<any[]>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/AuditLogs?limit=150');
      return res.data;
    },
  });

  const entityOptions = [
    { value: 'ALL', label: 'Semua Entitas' },
    ...Array.from(new Set(auditLogs.map((l) => l.entityName).filter(Boolean))).map((name) => ({
      value: String(name),
      label: String(name),
    })),
  ];

  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter !== 'ALL' && log.actionType !== actionFilter) return false;
    if (entityFilter !== 'ALL' && log.entityName !== entityFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        (log.userName || '').toLowerCase().includes(q) ||
        (log.entityName || '').toLowerCase().includes(q) ||
        (log.entityPrimaryKey || '').toLowerCase().includes(q) ||
        (log.affectedColumnsJson || '').toLowerCase().includes(q) ||
        (log.oldValuesJson || '').toLowerCase().includes(q) ||
        (log.newValuesJson || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const createCount = auditLogs.filter((l) => l.actionType === 'CREATE').length;
  const updateCount = auditLogs.filter((l) => l.actionType === 'UPDATE').length;
  const deleteCount = auditLogs.filter((l) => l.actionType === 'DELETE').length;

  const formatPrettyJson = (raw?: string | null) => {
    if (!raw) return '-';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <Stack gap="lg">
      {/* KPI Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Rekaman Audit
              </Text>
              <Title order={3} mt={4}>
                {auditLogs.length} Event
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Append-Only PostgreSQL jsonb
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="teal" variant="light">
              <IconShieldCheck size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Operasi CREATE (Insert)
              </Text>
              <Title order={3} mt={4} c="green">
                {createCount}
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Data baru terekam otomatis
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="green" variant="light">
              <IconPlus size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Operasi UPDATE (Mutasi)
              </Text>
              <Title order={3} mt={4} c="blue">
                {updateCount}
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                OldValues vs NewValues Diff
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="blue" variant="light">
              <IconHistory size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Operasi DELETE
              </Text>
              <Title order={3} mt={4} c="red">
                {deleteCount}
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Jejak penghapusan permanen/soft
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="red" variant="light">
              <IconFileAnalytics size={24} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Main Audit Trail Table Card */}
      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap">
          <Group gap="sm">
            <ThemeIcon size={40} radius="md" color="teal" variant="light">
              <IconShieldCheck size={22} />
            </ThemeIcon>
            <div>
              <Title order={4}>Automatic Audit Trail Inspector (PostgreSQL jsonb Append-Only)</Title>
              <Text size="xs" c="dimmed">
                Rekaman otomatis EF Core SaveChangesInterceptor untuk setiap perubahan kolom (OldValuesJson vs NewValuesJson)
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Badge color="teal" variant="light" size="lg">
              {filteredLogs.length} / {auditLogs.length} Log Ditampilkan
            </Badge>
            <Button
              size="xs"
              variant="default"
              leftSection={<IconRefresh size={14} />}
              loading={isFetching}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['audit-logs'] })}
            >
              Segarkan
            </Button>
          </Group>
        </Group>

        <Paper withBorder p="sm" radius="md" mb="md">
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <TextInput
                size="xs"
                placeholder="Cari pelaku, nama entitas, primary key, atau isi JSON..."
                leftSection={<IconSearch size={14} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Select
                size="xs"
                placeholder="Filter Entitas"
                leftSection={<IconFilter size={14} />}
                value={entityFilter}
                onChange={(v) => setEntityFilter(v || 'ALL')}
                data={entityOptions}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <SegmentedControl
                fullWidth
                size="xs"
                value={actionFilter}
                onChange={setActionFilter}
                data={[
                  { label: 'Semua', value: 'ALL' },
                  { label: 'CREATE', value: 'CREATE' },
                  { label: 'UPDATE', value: 'UPDATE' },
                  { label: 'DELETE', value: 'DELETE' },
                ]}
              />
            </Grid.Col>
          </Grid>
        </Paper>

        <ScrollArea h={500}>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Waktu (Lokal)</Table.Th>
                <Table.Th>Pelaku (Actor)</Table.Th>
                <Table.Th>Aksi</Table.Th>
                <Table.Th>Entitas & Primary Key</Table.Th>
                <Table.Th>Kolom Berubah</Table.Th>
                <Table.Th>Old Values (jsonb)</Table.Th>
                <Table.Th>New Values (jsonb)</Table.Th>
                <Table.Th>Inspeksi</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredLogs.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>
                    <Text size="xs" fw={600}>
                      {new Date(log.createdAtUtc).toLocaleString('id-ID')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" color="dark" size="sm">
                      {log.userName || 'SYSTEM'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        log.actionType === 'CREATE'
                          ? 'green'
                          : log.actionType === 'UPDATE'
                            ? 'blue'
                            : 'red'
                      }
                    >
                      {log.actionType}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={700}>
                      {log.entityName}
                    </Text>
                    <Code fz="10px">{log.entityPrimaryKey?.slice(0, 18)}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Code block style={{ maxWidth: 180, overflowX: 'auto' }}>
                      {log.affectedColumnsJson || '-'}
                    </Code>
                  </Table.Td>
                  <Table.Td>
                    <Code block style={{ maxWidth: 220, maxHeight: 68, overflow: 'auto' }}>
                      {log.oldValuesJson || '-'}
                    </Code>
                  </Table.Td>
                  <Table.Td>
                    <Code block style={{ maxWidth: 240, maxHeight: 68, overflow: 'auto' }}>
                      {log.newValuesJson || '-'}
                    </Code>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Lihat Komparasi Detail JSON (Old vs New)">
                      <ActionIcon
                        variant="light"
                        color="teal"
                        onClick={() => setSelectedLog(log)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Forensic JSON Diff Modal */}
      <EnterpriseModalShell
        opened={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Forensic Audit Trail Inspector (Old vs New jsonb Diff)"
        subtitle="Inspeksi mendalam perubahan nilai sebelum dan sesudah mutasi database"
        badgeLabel={selectedLog?.actionType || 'AUDIT'}
        badgeColor={
          selectedLog?.actionType === 'CREATE'
            ? 'green'
            : selectedLog?.actionType === 'UPDATE'
              ? 'blue'
              : 'red'
        }
        icon={<IconShieldCheck size={22} />}
        size="xl"
        footer={
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSelectedLog(null)}>
              Tutup Inspector
            </Button>
          </Group>
        }
      >
        {selectedLog && (
          <Stack gap="md">
            <EnterpriseFormSection
              title="1. Metadata Rekaman Audit"
              subtitle="Identitas pelaku, waktu kejadian, dan entitas sasaran"
              icon={<IconHistory size={16} />}
            >
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <Paper withBorder p="xs" radius="sm">
                  <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                    Pelaku (Actor) & Waktu
                  </Text>
                  <Text size="sm" fw={700}>
                    {selectedLog.userName || 'SYSTEM'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(selectedLog.createdAtUtc).toLocaleString('id-ID')}
                  </Text>
                </Paper>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                    Entitas Database
                  </Text>
                  <Text size="sm" fw={700}>
                    {selectedLog.entityName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Aksi: {selectedLog.actionType}
                  </Text>
                </Paper>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
                    Primary Key & Kolom Terdampak
                  </Text>
                  <Code fz="11px">{selectedLog.entityPrimaryKey}</Code>
                  <Text size="xs" c="dimmed" mt={2}>
                    {selectedLog.affectedColumnsJson || 'Semua Kolom'}
                  </Text>
                </Paper>
              </SimpleGrid>
            </EnterpriseFormSection>

            <EnterpriseFormSection
              title="2. Komparasi Payload PostgreSQL jsonb (Before vs After)"
              subtitle="Format JSON terstruktur dari SaveChangesInterceptor"
              icon={<IconFileAnalytics size={16} />}
            >
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <div>
                  <Badge color="orange" variant="light" mb={6}>
                    OLD VALUES (SEBELUM PERUBAHAN)
                  </Badge>
                  <Code block style={{ maxHeight: 320, overflow: 'auto' }}>
                    {formatPrettyJson(selectedLog.oldValuesJson)}
                  </Code>
                </div>
                <div>
                  <Badge color="teal" variant="light" mb={6}>
                    NEW VALUES (SESUDAH PERUBAHAN)
                  </Badge>
                  <Code block style={{ maxHeight: 320, overflow: 'auto' }}>
                    {formatPrettyJson(selectedLog.newValuesJson)}
                  </Code>
                </div>
              </SimpleGrid>
            </EnterpriseFormSection>
          </Stack>
        )}
      </EnterpriseModalShell>
    </Stack>
  );
}

/**
 * MENU 2: Dedicated Document Management System (DMS) & SHA-256 Checksum Repository
 */
export function DmsRepositoryView() {
  const queryClient = useQueryClient();
  const { isReadOnlyAuditor } = useAccess();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [moduleCategory, setModuleCategory] = useState<string>('DOA_POLICY');
  const [inspectFile, setInspectFile] = useState<any | null>(null);

  const { data: dmsFiles = [], isFetching } = useQuery<any[]>({
    queryKey: ['dms-files'],
    queryFn: async () => {
      const res = await apiClient.get('/Dms');
      return res.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Pilih file terlebih dahulu');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('moduleCategory', moduleCategory);
      const res = await apiClient.post('/Dms/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Dokumen Berhasil Diunggah ke DMS',
        message: `File ${data.originalFileName} tersimpan dengan SHA-256: ${data.sha256Checksum?.slice(0, 16)}...`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      queryClient.invalidateQueries({ queryKey: ['dms-files'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setSelectedFile(null);
      setUploadModalOpen(false);
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Mengunggah Dokumen',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const categories = ['ALL', ...Array.from(new Set(dmsFiles.map((f) => f.moduleCategory).filter(Boolean)))];

  const filteredFiles = dmsFiles.filter((f) => {
    if (categoryFilter !== 'ALL' && f.moduleCategory !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        (f.originalFileName || '').toLowerCase().includes(q) ||
        (f.moduleCategory || '').toLowerCase().includes(q) ||
        (f.sha256Checksum || '').toLowerCase().includes(q) ||
        (f.contentType || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalBytes = dmsFiles.reduce((acc, f) => acc + (Number(f.fileSizeInBytes) || 0), 0);
  const doaCount = dmsFiles.filter((f) => f.moduleCategory === 'DOA_POLICY').length;

  return (
    <Stack gap="lg">
      {/* DMS KPI Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Dokumen DMS
              </Text>
              <Title order={3} mt={4}>
                {dmsFiles.length} Berkas
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Terverifikasi SHA-256 Checksum
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="indigo" variant="light">
              <IconFileDatabase size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Dokumen SK Direksi (DoA PDF)
              </Text>
              <Title order={3} mt={4} c="blue">
                {doaCount} Dokumen
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Lampiran wajib kepatuhan DoA
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="blue" variant="light">
              <IconFileCertificate size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Kapasitas Tersimpan
              </Text>
              <Title order={3} mt={4} c="teal">
                {(totalBytes / 1024).toFixed(1)} KB
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                UUID Storage Naming (Anti-Traversal)
              </Text>
            </div>
            <ThemeIcon size={46} radius="md" color="teal" variant="light">
              <IconHash size={24} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* DMS Table Card */}
      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap">
          <Group gap="sm">
            <ThemeIcon size={40} radius="md" color="indigo" variant="light">
              <IconFileDatabase size={22} />
            </ThemeIcon>
            <div>
              <Title order={4}>Document Management System (DMS) Repository & SHA-256 Checksum</Title>
              <Text size="xs" c="dimmed">
                Repositori penyimpanan dokumen SK Direksi resmi, lampiran PO/DCP, Avatar 1:1, dan Paraf Digital beserta sidik jari SHA-256
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Button
              size="xs"
              variant="default"
              leftSection={<IconRefresh size={14} />}
              loading={isFetching}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['dms-files'] })}
            >
              Segarkan
            </Button>
            {!isReadOnlyAuditor && (
              <Button
                size="xs"
                leftSection={<IconUpload size={14} />}
                onClick={() => setUploadModalOpen(true)}
              >
                Unggah Dokumen Baru ke DMS
              </Button>
            )}
          </Group>
        </Group>

        <Paper withBorder p="sm" radius="md" mb="md">
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                size="xs"
                placeholder="Cari nama berkas, kategori modul, MIME type, atau hash SHA-256..."
                leftSection={<IconSearch size={14} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <SegmentedControl
                fullWidth
                size="xs"
                value={categoryFilter}
                onChange={setCategoryFilter}
                data={categories.map((c) => ({ label: c, value: c }))}
              />
            </Grid.Col>
          </Grid>
        </Paper>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nama Berkas Asli</Table.Th>
              <Table.Th>Kategori Modul</Table.Th>
              <Table.Th>MIME Type</Table.Th>
              <Table.Th>Ukuran</Table.Th>
              <Table.Th>SHA-256 Checksum Integrity</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredFiles.map((f) => (
              <Table.Tr key={f.id}>
                <Table.Td fw={600}>{f.originalFileName}</Table.Td>
                <Table.Td>
                  <Badge color="indigo" variant="light">
                    {f.moduleCategory}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Code>{f.contentType}</Code>
                </Table.Td>
                <Table.Td>{(f.fileSizeInBytes / 1024).toFixed(1)} KB</Table.Td>
                <Table.Td>
                  <Tooltip label={f.sha256Checksum}>
                    <Code style={{ cursor: 'pointer' }} onClick={() => setInspectFile(f)}>
                      {f.sha256Checksum?.slice(0, 24)}...
                    </Code>
                  </Tooltip>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Tooltip label="Detail Metadata & SHA-256 Penuh">
                      <ActionIcon variant="light" color="indigo" onClick={() => setInspectFile(f)}>
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Button
                      component="a"
                      href={`/api/Dms/${f.id}/download`}
                      target="_blank"
                      size="xs"
                      variant="light"
                      leftSection={<IconDownload size={14} />}
                    >
                      Unduh
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Modal Unggah Dokumen Baru ke DMS */}
      <EnterpriseModalShell
        opened={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Unggah Dokumen Baru ke Repositori DMS"
        subtitle="Berkas akan disimpan dengan nama fisik UUID (anti-path-traversal) dan dihitung nilai hash SHA-256 secara otomatis"
        badgeLabel="DMS UPLOAD"
        badgeColor="indigo"
        icon={<IconUpload size={22} />}
        size="md"
        footer={
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setUploadModalOpen(false)}>
              Batal
            </Button>
            <Button
              color="indigo"
              leftSection={<IconUpload size={16} />}
              disabled={!selectedFile}
              loading={uploadMutation.isPending}
              onClick={() => uploadMutation.mutate()}
            >
              Unggah & Hitung SHA-256
            </Button>
          </Group>
        }
      >
        <Stack gap="md">
          <EnterpriseFormSection
            title="1. Kategori & Berkas Dokumen"
            subtitle="Pilih modul pemilik dokumen dan berkas yang akan diarsipkan"
            icon={<IconFileDatabase size={16} />}
          >
            <Stack gap="sm">
              <Select
                label="Kategori Modul DMS"
                value={moduleCategory}
                onChange={(v) => setModuleCategory(v || 'DOA_POLICY')}
                data={[
                  { value: 'DOA_POLICY', label: 'DOA_POLICY — Dokumen SK Direksi (PDF)' },
                  { value: 'TRANSACTION_ATTACHMENT', label: 'TRANSACTION_ATTACHMENT — Lampiran PO / DCP' },
                  { value: 'CORPORATE_POLICY', label: 'CORPORATE_POLICY — SOP & Kebijakan Korporat' },
                  { value: 'GENERAL_ARCHIVE', label: 'GENERAL_ARCHIVE — Arsip Umum' },
                ]}
              />
              <FileInput
                label="Pilih Berkas Dokumen"
                placeholder="Klik untuk memilih file (.pdf, .png, .webp, .xlsx)..."
                value={selectedFile}
                onChange={setSelectedFile}
                required
              />
            </Stack>
          </EnterpriseFormSection>
        </Stack>
      </EnterpriseModalShell>

      {/* Modal Detail Metadata & SHA-256 DMS */}
      <EnterpriseModalShell
        opened={!!inspectFile}
        onClose={() => setInspectFile(null)}
        title="Detail Metadata & Verifikasi SHA-256 Dokumen DMS"
        subtitle="Informasi integritas kriptografi berkas pada Document Management System"
        badgeLabel={inspectFile?.moduleCategory || 'DMS'}
        badgeColor="indigo"
        icon={<IconFileDatabase size={22} />}
        size="lg"
        footer={
          <Group justify="space-between">
            <Button variant="default" onClick={() => setInspectFile(null)}>
              Tutup
            </Button>
            {inspectFile && (
              <Button
                component="a"
                href={`/api/Dms/${inspectFile.id}/download`}
                target="_blank"
                color="indigo"
                leftSection={<IconDownload size={16} />}
              >
                Unduh / Buka Berkas Asli
              </Button>
            )}
          </Group>
        }
      >
        {inspectFile && (
          <EnterpriseFormSection
            title="Atribut Penyimpanan & Hash SHA-256"
            subtitle="Digunakan untuk memastikan berkas tidak pernah dimodifikasi sejak diunggah"
            icon={<IconHash size={16} />}
          >
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  DMS File ID (UUID):
                </Text>
                <Code>{inspectFile.id}</Code>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Nama Berkas Asli:
                </Text>
                <Text size="sm" fw={700}>
                  {inspectFile.originalFileName}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  MIME Content-Type & Ukuran:
                </Text>
                <Text size="xs" fw={600}>
                  {inspectFile.contentType} ({(inspectFile.fileSizeInBytes / 1024).toFixed(2)} KB)
                </Text>
              </Group>
              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  SHA-256 Checksum Penuh (64-Hex):
                </Text>
                <Code block>{inspectFile.sha256Checksum}</Code>
              </div>
            </Stack>
          </EnterpriseFormSection>
        )}
      </EnterpriseModalShell>
    </Stack>
  );
}

export function AuditAndDmsView() {
  return (
    <Stack gap="lg">
      <DmsRepositoryView />
      <AuditTrailView />
    </Stack>
  );
}
