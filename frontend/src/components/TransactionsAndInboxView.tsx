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
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Timeline,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconDownload,
  IconEdit,
  IconEye,
  IconInbox,
  IconPlus,
  IconRefresh,
  IconRotateClockwise,
  IconSend,
  IconShoppingCart,
  IconTrash,
  IconWallet,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { UserIdentity } from '../store/useAppStore';
import { useAccess } from '../hooks/useAccess';
import {
  EnterpriseFormSection,
  EnterpriseModalShell,
} from './EnterpriseModalShell';

interface Props {
  currentUser: UserIdentity;
}

export function TransactionsAndInboxView({ currentUser }: Props) {
  const queryClient = useQueryClient();
  const { isReadOnlyAuditor, canCreateTransaction, canApproveWorkflow } = useAccess();

  // Modal States (Forms & Detail Viewer are opened in Modals, keeping the main page as clean Lists!)
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [dcpModalOpen, setDcpModalOpen] = useState(false);
  const [detailModalTx, setDetailModalTx] = useState<any | null>(null);

  // PO Form State (Header-Detail with deterministic SubCategoryCode at Header)
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [poTitle, setPoTitle] = useState('Pengadaan Pompa Hidrolik Pabrik');
  const [poVendor, setPoVendor] = useState('PT Traktor Nusantara');
  const [poSubCategory, setPoSubCategory] = useState<string>('ASSET');
  const [poNotes, setPoNotes] = useState('Urgent replacement unit');
  const [poItems, setPoItems] = useState([
    { itemCode: 'ITM-001', itemDescription: 'Hydraulic Pump Unit A1', quantity: 2, unitOfMeasure: 'UNIT', unitPrice: 20000000 },
  ]);

  // DCP Form State
  const [editingDcpId, setEditingDcpId] = useState<string | null>(null);
  const [dcpPurpose, setDcpPurpose] = useState('Biaya Operasional Panen & Transportasi Kebun');
  const [dcpPayee, setDcpPayee] = useState('Kas Operasional Kebun Sumatera 1');
  const [dcpAmount, setDcpAmount] = useState<number>(120000000);
  const [dcpRemarks, setDcpRemarks] = useState('Pengajuan lintas departemen ke Area Sumatera 1');

  // Workflow Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedWfId, setSelectedWfId] = useState<string>('');
  const [selectedRefNo, setSelectedRefNo] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'APPROVE' | 'REJECT' | 'REVISE'>('APPROVE');
  const [actionComments, setActionComments] = useState('');

  const { data: inboxItems = [] } = useQuery<any[]>({
    queryKey: ['workflow-inbox', currentUser.id],
    queryFn: async () => {
      const res = await apiClient.get(`/Transactions/inbox?userId=${currentUser.id}`);
      return res.data;
    },
  });

  const { data: txData } = useQuery<{ purchaseOrders: any[]; directCashPayments: any[] }>({
    queryKey: ['all-transactions'],
    queryFn: async () => {
      const res = await apiClient.get('/Transactions');
      return res.data;
    },
  });

  const openNewPoModal = () => {
    setEditingPoId(null);
    setPoTitle('Pengadaan Pompa Hidrolik Pabrik');
    setPoVendor('PT Traktor Nusantara');
    setPoSubCategory('ASSET');
    setPoNotes('Pengadaan unit baru');
    setPoItems([
      { itemCode: 'ITM-001', itemDescription: 'Hydraulic Pump Unit A1', quantity: 2, unitOfMeasure: 'UNIT', unitPrice: 20000000 },
    ]);
    setPoModalOpen(true);
  };

  const openEditPoModal = (po: any) => {
    setEditingPoId(po.id);
    setPoTitle(po.title);
    setPoVendor(po.vendorName);
    setPoSubCategory(po.subCategoryCode);
    setPoNotes(po.notes || '');
    setPoItems(
      po.items?.length
        ? po.items.map((i: any) => ({
            itemCode: i.itemCode,
            itemDescription: i.itemDescription,
            quantity: i.quantity,
            unitOfMeasure: i.unitOfMeasure || 'UNIT',
            unitPrice: i.unitPrice,
          }))
        : [{ itemCode: 'ITM-001', itemDescription: 'Item PO', quantity: 1, unitOfMeasure: 'UNIT', unitPrice: po.totalAmount }]
    );
    setPoModalOpen(true);
  };

  const openNewDcpModal = () => {
    setEditingDcpId(null);
    setDcpPurpose('Biaya Operasional Panen & Transportasi Kebun');
    setDcpPayee('Kas Operasional Kebun Sumatera 1');
    setDcpAmount(120000000);
    setDcpRemarks('Pengajuan operasional kebun/pabrik');
    setDcpModalOpen(true);
  };

  const openEditDcpModal = (dcp: any) => {
    setEditingDcpId(dcp.id);
    setDcpPurpose(dcp.purpose);
    setDcpPayee(dcp.payeeName);
    setDcpAmount(dcp.amount);
    setDcpRemarks(dcp.remarks || '');
    setDcpModalOpen(true);
  };

  const submitPoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/Transactions/po', {
        existingPoId: editingPoId,
        title: poTitle,
        vendorName: poVendor,
        subCategoryCode: poSubCategory,
        notes: poNotes,
        requesterUserId: currentUser.id,
        items: poItems,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Purchase Order Submitted', message: data.message, color: 'green' });
      setEditingPoId(null);
      setPoModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Submit PO',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const submitDcpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/Transactions/dcp', {
        existingDcpId: editingDcpId,
        purpose: dcpPurpose,
        payeeName: dcpPayee,
        subCategoryCode: 'GENERAL',
        amount: dcpAmount,
        remarks: dcpRemarks,
        requesterUserId: currentUser.id,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Direct Cash Payment Submitted', message: data.message, color: 'green' });
      setEditingDcpId(null);
      setDcpModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Submit DCP',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const executeWfMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/Transactions/workflow-action', {
        workflowInstanceId: selectedWfId,
        actorUserId: currentUser.id,
        action: selectedAction,
        comments: actionComments,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Aksi Workflow Berhasil', message: data.message, color: 'teal' });
      setActionModalOpen(false);
      setActionComments('');
      queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Eksekusi Workflow',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const poTotal = poItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  const openActionModal = (wfId: string, refNo: string, act: 'APPROVE' | 'REJECT' | 'REVISE') => {
    setSelectedWfId(wfId);
    setSelectedRefNo(refNo);
    setSelectedAction(act);
    setActionComments(act === 'APPROVE' ? 'Approved sesuai plafond DoA.' : '');
    setActionModalOpen(true);
  };

  const allTransactions = [
    ...(txData?.purchaseOrders || []).map((x) => ({
      ...x,
      docType: 'PO',
      refNo: x.poNumber,
      amount: x.totalAmount,
      desc: x.title,
      counterparty: x.vendorName,
    })),
    ...(txData?.directCashPayments || []).map((x) => ({
      ...x,
      docType: 'DCP',
      refNo: x.dcpNumber,
      amount: x.amount,
      desc: x.purpose,
      counterparty: x.payeeName,
    })),
  ];

  return (
    <Stack gap="lg">
      {isReadOnlyAuditor && (
        <Alert color="orange" title="Segregation of Duties (SoD) — Global Read-Only Auditor Mode (Bagian 5 PRD)">
          Anda sedang login sebagai <strong>Auditor ({currentUser.fullName})</strong>. Sesuai kebijakan kepatuhan, Auditor memiliki akses baca menyeluruh lintas departemen tetapi <strong>dilarang melakukan Create, Update, Delete, maupun Approve</strong> transaksi.
        </Alert>
      )}

      {/* 1. TABEL APPROVAL INBOX */}
      <Card withBorder radius="md">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconInbox size={22} />
            <div>
              <Title order={4}>Approval Inbox — {currentUser.fullName}</Title>
              <Text size="xs" c="dimmed">
                Daftar dokumen berstatus PENDING yang menunggu persetujuan Anda (termasuk substitusi delegasi aktif On Behalf Of)
              </Text>
            </div>
          </Group>
          <Badge size="lg" color={inboxItems.length > 0 ? 'red' : 'gray'}>
            {inboxItems.length} Menunggu Persetujuan
          </Badge>
        </Group>

        {inboxItems.length === 0 ? (
          <Alert color="gray" variant="light">
            Tidak ada dokumen yang menunggu persetujuan untuk <strong>{currentUser.fullName}</strong> saat ini.
          </Alert>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No. Dokumen</Table.Th>
                <Table.Th>Tipe / Sub-Kategori</Table.Th>
                <Table.Th>Pengaju (Unit)</Table.Th>
                <Table.Th>Nilai Transaksi</Table.Th>
                <Table.Th>Tahapan Saat Ini</Table.Th>
                <Table.Th>SK DoA Terkunci</Table.Th>
                <Table.Th ta="right">Aksi Persetujuan</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {inboxItems.map((item) => (
                <Table.Tr key={item.stepId}>
                  <Table.Td fw={700}>
                    {item.referenceNumber}
                    {item.currentRevisionCycle > 1 && (
                      <Badge ml={6} size="xs" color="orange">
                        Siklus #{item.currentRevisionCycle}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={item.docTypeCode === 'PO' ? 'blue' : 'teal'}>{item.docTypeCode}</Badge>{' '}
                    <Badge variant="outline" color="grape">
                      {item.subCategoryCode}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {item.requesterName} ({item.requesterOrgCode})
                  </Table.Td>
                  <Table.Td fw={700}>{formatIDR(item.transactionAmount)}</Table.Td>
                  <Table.Td>
                    <Badge color={item.stepRoleType === 'FINAL_APPROVAL' ? 'green' : 'blue'}>
                      Step #{item.sequence}: {item.targetJobLevelCode} ({item.stepRoleType})
                    </Badge>
                    {item.isOnBehalfOf && (
                      <Badge ml={4} color="yellow" variant="filled">
                        On Behalf Of {item.assignedUserName}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{item.appliedPolicyNumber}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Button
                        size="compact-xs"
                        color="green"
                        disabled={!canApproveWorkflow}
                        leftSection={<IconCheck size={14} />}
                        onClick={() => openActionModal(item.workflowInstanceId, item.referenceNumber, 'APPROVE')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="compact-xs"
                        color="orange"
                        variant="light"
                        disabled={!canApproveWorkflow}
                        leftSection={<IconRotateClockwise size={14} />}
                        onClick={() => openActionModal(item.workflowInstanceId, item.referenceNumber, 'REVISE')}
                      >
                        Revise
                      </Button>
                      <Button
                        size="compact-xs"
                        color="red"
                        variant="light"
                        disabled={!canApproveWorkflow}
                        leftSection={<IconX size={14} />}
                        onClick={() => openActionModal(item.workflowInstanceId, item.referenceNumber, 'REJECT')}
                      >
                        Reject
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* 2. MASTER LIST TABEL TRANSAKSI (PO & DCP) */}
      <Card withBorder radius="md">
        <Group justify="space-between" mb="md" wrap="wrap">
          <div>
            <Title order={4}>Daftar Transaksi Purchase Order (PO) & Direct Cash Payment (DCP)</Title>
            <Text size="xs" c="dimmed">
              Tabel ringkasan transaksi berjalan dan historis — Klik tombol di kanan atas untuk membuat PO atau DCP baru
            </Text>
          </div>

          <Group gap="xs">
            <Button
              size="xs"
              color="blue"
              disabled={!canCreateTransaction}
              leftSection={<IconShoppingCart size={15} />}
              onClick={openNewPoModal}
            >
              + Buat PO Baru
            </Button>
            <Button
              size="xs"
              color="teal"
              disabled={!canCreateTransaction}
              leftSection={<IconWallet size={15} />}
              onClick={openNewDcpModal}
            >
              + Buat DCP Baru
            </Button>
            <Button
              component="a"
              href="/api/Transactions/export-csv"
              target="_blank"
              variant="outline"
              size="xs"
              leftSection={<IconDownload size={14} />}
            >
              Export CSV
            </Button>
          </Group>
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>No. Dokumen</Table.Th>
              <Table.Th>Tipe / Sub-Kategori</Table.Th>
              <Table.Th>Judul / Keperluan</Table.Th>
              <Table.Th>Vendor / Penerima</Table.Th>
              <Table.Th>Pengaju (Unit)</Table.Th>
              <Table.Th>Nominal</Table.Th>
              <Table.Th>Siklus</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th ta="right">Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {allTransactions.map((tx) => (
              <Table.Tr key={tx.id}>
                <Table.Td fw={700}>{tx.refNo}</Table.Td>
                <Table.Td>
                  <Badge color={tx.docType === 'PO' ? 'blue' : 'teal'}>{tx.docType}</Badge>{' '}
                  <Badge variant="outline" color="grape">
                    {tx.subCategoryCode}
                  </Badge>
                </Table.Td>
                <Table.Td fw={600}>{tx.desc}</Table.Td>
                <Table.Td>{tx.counterparty}</Table.Td>
                <Table.Td>
                  {tx.requesterName} ({tx.orgUnitCode})
                </Table.Td>
                <Table.Td fw={700}>{formatIDR(tx.amount)}</Table.Td>
                <Table.Td>
                  <Badge variant="outline">Siklus #{tx.workflow?.currentRevisionCycle || 1}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      tx.status === 'APPROVED'
                        ? 'green'
                        : tx.status === 'REJECTED'
                        ? 'red'
                        : tx.status === 'REVISED'
                        ? 'orange'
                        : 'blue'
                    }
                  >
                    {tx.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    <Tooltip label="Lihat Detail Item & Rute Persetujuan">
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="indigo"
                        leftSection={<IconEye size={14} />}
                        onClick={() => setDetailModalTx(tx)}
                      >
                        Detail & Rute
                      </Button>
                    </Tooltip>

                    {tx.status === 'REVISED' && (
                      <Tooltip label="Edit & Re-Submit (Hitung Ulang Rute)">
                        <Button
                          size="compact-xs"
                          color="orange"
                          disabled={!canCreateTransaction}
                          leftSection={<IconRefresh size={14} />}
                          onClick={() => (tx.docType === 'PO' ? openEditPoModal(tx) : openEditDcpModal(tx))}
                        >
                          Edit & Re-Submit
                        </Button>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {/* MODAL 1: CREATE / EDIT PURCHASE ORDER (PO HEADER-DETAIL) */}
      <EnterpriseModalShell
        opened={poModalOpen}
        onClose={() => setPoModalOpen(false)}
        title={editingPoId ? 'Edit & Re-Submit Purchase Order (PO)' : 'Buat Purchase Order (PO) Baru'}
        subtitle="Pengajuan dokumen pengadaan barang/jasa (Header & Line Items) dengan rute persetujuan otomatis 3-Axis"
        badgeText={editingPoId ? 'MODE RE-SUBMIT' : 'PO BARU'}
        badgeColor={editingPoId ? 'orange' : 'blue'}
        icon={<IconShoppingCart size={22} />}
        iconColor="blue"
        size="85%"
        footerLeft={
          <Group gap="xs">
            <Badge size="lg" color="blue" variant="light">
              Grand Total PO: {formatIDR(poTotal)}
            </Badge>
            <Badge size="sm" color="grape" variant="outline">
              Sub-Kategori: {poSubCategory}
            </Badge>
          </Group>
        }
        submitLabel={editingPoId ? 'Re-Submit Purchase Order' : 'Submit Purchase Order'}
        submitColor="blue"
        submitIcon={<IconSend size={16} />}
        loading={submitPoMutation.isPending}
        onSubmit={() => submitPoMutation.mutate()}
      >
        {editingPoId && (
          <Alert color="orange" radius="md" title="Mode Re-Submit setelah Revisi (Section 3.2.D)">
            Saat menekan <strong>Re-Submit Purchase Order</strong>, sistem otomatis menghitung ulang seluruh rute persetujuan menggunakan versi SK DoA yang terkunci (<code>AppliedDoAPolicyHeaderId</code>).
          </Alert>
        )}

        <EnterpriseFormSection
          title="1. Informasi Header Purchase Order & Sub-Kategori Routing (Axis 3)"
          subtitle="Judul pengadaan, nama vendor rekanan, dan klasifikasi sub-kategori penentu spesialis approver"
          icon={<IconShoppingCart size={16} />}
          iconColor="blue"
        >
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Judul Pengadaan PO"
                value={poTitle}
                onChange={(e) => setPoTitle(e.currentTarget.value)}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Nama Vendor Rekanan"
                value={poVendor}
                onChange={(e) => setPoVendor(e.currentTarget.value)}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Header Sub-Kategori (Axis 3 Routing)"
                value={poSubCategory}
                onChange={(v) => setPoSubCategory(v || 'ASSET')}
                data={[
                  { value: 'ASSET', label: 'ASSET (Rute ke User01 - Mgr Asset)' },
                  { value: 'AGRO_CHEM', label: 'AGRO_CHEM (Rute ke User02 - Mgr Agro)' },
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <TextInput
                label="Catatan Pengadaan"
                value={poNotes}
                onChange={(e) => setPoNotes(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>
        </EnterpriseFormSection>

        <EnterpriseFormSection
          title="2. Rincian Barang / Jasa (Purchase Order Line Items)"
          subtitle="Daftar item yang diajukan beserta kuantitas dan harga satuan"
          icon={<IconPlus size={16} />}
          iconColor="indigo"
          rightSection={
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() =>
                setPoItems((prev) => [
                  ...prev,
                  {
                    itemCode: `ITM-00${prev.length + 1}`,
                    itemDescription: 'Item Tambahan',
                    quantity: 1,
                    unitOfMeasure: 'UNIT',
                    unitPrice: 10000000,
                  },
                ])
              }
            >
              + Tambah Baris Item
            </Button>
          }
        >
          <Table striped withTableBorder verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 150 }}>Kode Item</Table.Th>
                <Table.Th>Deskripsi Barang / Spesifikasi</Table.Th>
                <Table.Th style={{ width: 110 }}>Kuantitas</Table.Th>
                <Table.Th style={{ width: 200 }}>Harga Satuan (IDR)</Table.Th>
                <Table.Th style={{ width: 180 }}>SubTotal</Table.Th>
                <Table.Th style={{ width: 60 }} ta="center">
                  Hapus
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {poItems.map((item, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td>
                    <TextInput
                      size="xs"
                      value={item.itemCode}
                      onChange={(e) => {
                        const val = e.currentTarget.value;
                        setPoItems((prev) => prev.map((it, i) => (i === idx ? { ...it, itemCode: val } : it)));
                      }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      size="xs"
                      value={item.itemDescription}
                      onChange={(e) => {
                        const val = e.currentTarget.value;
                        setPoItems((prev) => prev.map((it, i) => (i === idx ? { ...it, itemDescription: val } : it)));
                      }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      value={item.quantity}
                      min={1}
                      onChange={(v) => {
                        const val = Number(v) || 1;
                        setPoItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it)));
                      }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      value={item.unitPrice}
                      thousandSeparator="."
                      decimalSeparator=","
                      step={5000000}
                      onChange={(v) => {
                        const val = Number(v) || 0;
                        setPoItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unitPrice: val } : it)));
                      }}
                    />
                  </Table.Td>
                  <Table.Td fw={700}>{formatIDR(item.quantity * item.unitPrice)}</Table.Td>
                  <Table.Td ta="center">
                    <ActionIcon
                      color="red"
                      variant="light"
                      disabled={poItems.length <= 1}
                      onClick={() => setPoItems((prev) => prev.filter((_, i) => i !== idx))}
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

      {/* MODAL 2: CREATE / EDIT DIRECT CASH PAYMENT (DCP) */}
      <EnterpriseModalShell
        opened={dcpModalOpen}
        onClose={() => setDcpModalOpen(false)}
        title={editingDcpId ? 'Edit & Re-Submit Direct Cash Payment (DCP)' : 'Buat Direct Cash Payment (DCP) Baru'}
        subtitle="Pengajuan pembayaran kas operasional langsung dengan batas plafond kontekstual DCP"
        badgeText={editingDcpId ? 'MODE RE-SUBMIT' : 'DCP BARU'}
        badgeColor={editingDcpId ? 'orange' : 'teal'}
        icon={<IconWallet size={22} />}
        iconColor="teal"
        size="lg"
        footerLeft={
          <Badge size="lg" color="teal" variant="light">
            Nominal DCP: {formatIDR(dcpAmount)}
          </Badge>
        }
        submitLabel={editingDcpId ? 'Re-Submit Direct Cash Payment' : 'Submit Direct Cash Payment'}
        submitColor="teal"
        submitIcon={<IconSend size={16} />}
        loading={submitDcpMutation.isPending}
        onSubmit={() => submitDcpMutation.mutate()}
      >
        {editingDcpId && (
          <Alert color="orange" radius="md" title="Mode Re-Submit DCP setelah Revisi">
            Silakan ubah nominal (misal dari Rp 50 Juta ke Rp 120 Juta) untuk melihat penambahan tahapan eskalasi ke Area Manager secara otomatis.
          </Alert>
        )}

        <EnterpriseFormSection
          title="Rincian Pencairan Kas Langsung (Direct Cash Payment)"
          subtitle="Keperluan pembayaran, penerima dana, dan nominal pencairan"
          icon={<IconWallet size={16} />}
          iconColor="teal"
        >
          <Stack gap="sm">
            <TextInput
              label="Keperluan Pembayaran (Purpose)"
              value={dcpPurpose}
              onChange={(e) => setDcpPurpose(e.currentTarget.value)}
              required
            />
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Penerima Dana (Payee)"
                  value={dcpPayee}
                  onChange={(e) => setDcpPayee(e.currentTarget.value)}
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <NumberInput
                  label="Nominal DCP (IDR)"
                  value={dcpAmount}
                  onChange={(v) => setDcpAmount(Number(v) || 0)}
                  thousandSeparator="."
                  decimalSeparator=","
                  step={10000000}
                  required
                />
              </Grid.Col>
            </Grid>
            <TextInput
              label="Keterangan / Catatan Operasional"
              value={dcpRemarks}
              onChange={(e) => setDcpRemarks(e.currentTarget.value)}
            />
          </Stack>
        </EnterpriseFormSection>
      </EnterpriseModalShell>

      {/* MODAL 3: DETAIL TRANSAKSI & TIMELINE RUTE PERSETUJUAN */}
      <EnterpriseModalShell
        opened={!!detailModalTx}
        onClose={() => setDetailModalTx(null)}
        title={`Detail Transaksi & Rute Persetujuan — ${detailModalTx?.refNo || ''}`}
        subtitle={detailModalTx?.desc}
        badgeText={detailModalTx?.status}
        badgeColor={
          detailModalTx?.status === 'APPROVED'
            ? 'teal'
            : detailModalTx?.status === 'REJECTED'
            ? 'red'
            : detailModalTx?.status === 'REVISED'
            ? 'orange'
            : 'blue'
        }
        icon={<IconEye size={22} />}
        size="xl"
        cancelLabel="Tutup Detail"
      >
        {detailModalTx && (
          <Stack gap="md">
            <EnterpriseFormSection
              title="Ringkasan Dokumen & Kepatuhan SK DoA"
              subtitle={`Pengaju: ${detailModalTx.requesterName} (${detailModalTx.orgUnitCode}) • Mitra/Penerima: ${detailModalTx.counterparty}`}
              icon={<IconInbox size={16} />}
              iconColor="indigo"
              rightSection={
                <Badge size="lg" color="indigo" variant="filled">
                  {formatIDR(detailModalTx.amount)}
                </Badge>
              }
            >
              <Group gap="xs">
                <Badge variant="light" color="blue">
                  SK DoA Terkunci: {detailModalTx.workflow?.appliedPolicyNumber || 'SK-DIR/2026/XI/004'}
                </Badge>
                <Badge variant="outline" color="grape">
                  Siklus Revisi Saat Ini: #{detailModalTx.workflow?.currentRevisionCycle || 1}
                </Badge>
                <Badge variant="outline" color="cyan">
                  Sub-Kategori: {detailModalTx.subCategoryCode}
                </Badge>
              </Group>
            </EnterpriseFormSection>

            {detailModalTx.docType === 'PO' && detailModalTx.items?.length > 0 && (
              <EnterpriseFormSection
                title="Daftar Barang / Line Items Purchase Order"
                subtitle="Rincian barang yang diajukan pada nomor PO ini"
                icon={<IconShoppingCart size={16} />}
                iconColor="blue"
              >
                <Table striped withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Kode</Table.Th>
                      <Table.Th>Deskripsi</Table.Th>
                      <Table.Th>Qty</Table.Th>
                      <Table.Th>Harga Satuan</Table.Th>
                      <Table.Th>SubTotal</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {detailModalTx.items.map((it: any) => (
                      <Table.Tr key={it.id}>
                        <Table.Td>{it.itemCode}</Table.Td>
                        <Table.Td>{it.itemDescription}</Table.Td>
                        <Table.Td>{it.quantity}</Table.Td>
                        <Table.Td>{formatIDR(it.unitPrice)}</Table.Td>
                        <Table.Td fw={700}>{formatIDR(it.subTotal)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </EnterpriseFormSection>
            )}

            <EnterpriseFormSection
              title="Riwayat & Rute Tahapan Persetujuan (WorkflowSteps)"
              subtitle="Urutan pejabat peninjau dan pemberi keputusan akhir beserta rekam jejak siklus revisi"
              icon={<IconCheck size={16} />}
              iconColor="teal"
            >
              {detailModalTx.workflow?.steps && (
                <Timeline active={detailModalTx.workflow.steps.length} bulletSize={24} lineWidth={2}>
                  {detailModalTx.workflow.steps.map((s: any) => (
                    <Timeline.Item
                      key={s.id}
                      color={
                        s.status === 'APPROVED'
                          ? 'teal'
                          : s.status === 'REJECTED'
                          ? 'red'
                          : s.status === 'SENT_BACK'
                          ? 'orange'
                          : s.status === 'PENDING'
                          ? 'blue'
                          : 'gray'
                      }
                      title={
                        <Group gap="xs">
                          <Badge size="xs" variant="outline">
                            Siklus #{s.revisionCycle} — Step {s.sequence}
                          </Badge>
                          <Text size="sm" fw={600}>
                            {s.targetJobLevelCode} @ {s.resolvedOrgUnitCode}: {s.assignedUserName}
                          </Text>
                          <Badge size="xs">{s.status}</Badge>
                          <Badge size="xs" variant="dot" color={s.stepRoleType === 'FINAL_APPROVAL' ? 'teal' : 'blue'}>
                            {s.stepRoleType}
                          </Badge>
                        </Group>
                      }
                    >
                      {s.comments && (
                        <Text size="xs" c="dimmed" mt={2}>
                          Catatan: {s.comments}
                        </Text>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              )}
            </EnterpriseFormSection>
          </Stack>
        )}
      </EnterpriseModalShell>

      {/* MODAL 4: KONFIRMASI EKSEKUSI PERSETUJUAN (APPROVE / REVISE / REJECT) */}
      <EnterpriseModalShell
        opened={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={`Konfirmasi Keputusan ${selectedAction}`}
        subtitle={`Nomor Dokumen: ${selectedRefNo}`}
        badgeText={selectedAction}
        badgeColor={selectedAction === 'APPROVE' ? 'teal' : selectedAction === 'REVISE' ? 'orange' : 'red'}
        icon={
          selectedAction === 'APPROVE' ? (
            <IconCheck size={20} />
          ) : selectedAction === 'REVISE' ? (
            <IconRotateClockwise size={20} />
          ) : (
            <IconX size={20} />
          )
        }
        iconColor={selectedAction === 'APPROVE' ? 'teal' : selectedAction === 'REVISE' ? 'orange' : 'red'}
        size="md"
        submitLabel={`Eksekusi ${selectedAction}`}
        submitColor={selectedAction === 'APPROVE' ? 'teal' : selectedAction === 'REVISE' ? 'orange' : 'red'}
        loading={executeWfMutation.isPending}
        onSubmit={() => executeWfMutation.mutate()}
      >
        <EnterpriseFormSection
          title="Catatan & Alasan Keputusan Pejabat Approver"
          subtitle={
            selectedAction === 'APPROVE'
              ? 'Berikan catatan persetujuan (opsional)'
              : 'Wajib mengisi alasan penolakan atau instruksi revisi untuk pengaju'
          }
          icon={<IconEdit size={16} />}
          iconColor={selectedAction === 'APPROVE' ? 'teal' : 'orange'}
        >
          <Textarea
            label="Komentar / Catatan Resmi"
            placeholder="Tuliskan catatan keputusan Anda di sini..."
            value={actionComments}
            onChange={(e) => setActionComments(e.currentTarget.value)}
            minRows={3}
            required={selectedAction !== 'APPROVE'}
          />
        </EnterpriseFormSection>
      </EnterpriseModalShell>
    </Stack>
  );
}
