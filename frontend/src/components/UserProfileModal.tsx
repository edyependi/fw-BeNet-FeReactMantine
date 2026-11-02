import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  FileInput,
  Grid,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Select,
  Slider,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCamera,
  IconCheck,
  IconEraser,
  IconLock,
  IconSignature,
  IconUpload,
  IconUser,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { UserIdentity, useAppStore } from '../store/useAppStore';
import { EnterpriseModalShell } from './EnterpriseModalShell';

interface Props {
  opened: boolean;
  onClose: () => void;
  currentUser: UserIdentity;
}

export function UserProfileModal({ opened, onClose, currentUser }: Props) {
  const queryClient = useQueryClient();
  const { setCurrentUser, setLanguage } = useAppStore();

  const [fullName, setFullName] = useState(currentUser.fullName);
  const [email, setEmail] = useState(`${currentUser.username}@coreenterprise.local`);
  const [prefLang, setPrefLang] = useState<'id' | 'en'>('id');
  const [prefTheme, setPrefTheme] = useState<'light' | 'dark'>('light');

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('Password123!');
  const [newPassword, setNewPassword] = useState('');

  // 1:1 Avatar Crop Canvas State
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sourceAvatarImg, setSourceAvatarImg] = useState<HTMLImageElement | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);

  // Digital Signature / Paraf Canvas State
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { data: profileData, refetch: refetchProfile } = useQuery<any>({
    queryKey: ['user-profile', currentUser.id],
    queryFn: async () => {
      const res = await apiClient.get(`/Profile/${currentUser.id}`);
      return res.data;
    },
    enabled: opened && !!currentUser.id && !currentUser.id.startsWith('00000000'),
  });

  useEffect(() => {
    if (profileData) {
      setFullName(profileData.fullName);
      setEmail(profileData.email);
      setPrefLang((profileData.preferredLanguage as 'id' | 'en') || 'id');
      setPrefTheme((profileData.preferredTheme as 'light' | 'dark') || 'light');
    } else {
      setFullName(currentUser.fullName);
    }
  }, [profileData, currentUser]);

  // Draw 1:1 cropped image onto 256x256 canvas whenever sourceAvatarImg or cropZoom changes
  useEffect(() => {
    const canvas = avatarCanvasRef.current;
    if (!canvas || !sourceAvatarImg) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 256, 256);
    const minSide = Math.min(sourceAvatarImg.width, sourceAvatarImg.height) / cropZoom;
    const sx = (sourceAvatarImg.width - minSide) / 2;
    const sy = (sourceAvatarImg.height - minSide) / 2;
    ctx.drawImage(sourceAvatarImg, sx, sy, minSide, minSide, 0, 0, 256, 256);
  }, [sourceAvatarImg, cropZoom]);

  const handleSelectAvatarFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setSourceAvatarImg(img);
        setCropZoom(1);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put(`/Profile/${currentUser.id}`, {
        fullName,
        email,
        preferredLanguage: prefLang,
        preferredTheme: prefTheme,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Profil Diperbarui', message: data.message, color: 'green' });
      setLanguage(prefLang);
      setCurrentUser({ ...currentUser, fullName });
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/Profile/${currentUser.id}/change-password`, {
        currentPassword,
        newPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Kata Sandi Diperbarui', message: data.message, color: 'teal' });
      setNewPassword('');
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Gagal Mengubah Kata Sandi',
        message: err.response?.data?.message || err.message,
        color: 'red',
      });
    },
  });

  const uploadCroppedAvatarMutation = useMutation({
    mutationFn: async () => {
      const canvas = avatarCanvasRef.current;
      if (!canvas) throw new Error('Canvas tidak ditemukan');

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88));
      if (!blob) throw new Error('Gagal mengonversi ke format .webp');

      const formData = new FormData();
      formData.append('file', blob, `avatar_${currentUser.username}.webp`);
      const res = await apiClient.post(`/Profile/${currentUser.id}/avatar`, formData);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Foto Profil (.webp) Tersimpan di DMS',
        message: `${data.message} (SHA-256: ${data.sha256Checksum.slice(0, 16)}...)`,
        color: 'teal',
      });
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
      queryClient.invalidateQueries({ queryKey: ['dms-files'] });
    },
  });

  const uploadSignatureMutation = useMutation({
    mutationFn: async () => {
      const canvas = sigCanvasRef.current;
      if (!canvas) throw new Error('Canvas tanda tangan tidak ditemukan');

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
      if (!blob) throw new Error('Gagal mengonversi tanda tangan ke .webp');

      const formData = new FormData();
      formData.append('file', blob, `signature_${currentUser.username}.webp`);
      const res = await apiClient.post(`/Profile/${currentUser.id}/signature`, formData);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Tanda Tangan Digital (.webp) Tersimpan',
        message: `${data.message} (SHA-256: ${data.sha256Checksum.slice(0, 16)}...)`,
        color: 'green',
      });
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ['demo-users'] });
      queryClient.invalidateQueries({ queryKey: ['dms-files'] });
    },
  });

  const clearSignatureCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSigMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.strokeStyle = '#1864ab';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleSigMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleSigMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <EnterpriseModalShell
      opened={opened}
      onClose={onClose}
      title="Manajemen Profil, Foto 1:1 (.webp) & Paraf Digital"
      subtitle={`${currentUser.fullName} (@${currentUser.username} • ${currentUser.orgUnitCode})`}
      badgeText={`${currentUser.jobLevel} (Rank ${currentUser.jobRank})`}
      badgeColor="indigo"
      icon={<IconUser size={22} />}
      size="lg"
      cancelLabel="Tutup"
    >
      <Tabs defaultValue="info">
        <Tabs.List mb="md">
          <Tabs.Tab value="info" leftSection={<IconUser size={15} />}>
            1. Data Profil & Sandi
          </Tabs.Tab>
          <Tabs.Tab value="avatar" leftSection={<IconCamera size={15} />}>
            2. Foto Profil (Crop 1:1 .webp)
          </Tabs.Tab>
          <Tabs.Tab value="signature" leftSection={<IconSignature size={15} />}>
            3. Tanda Tangan Digital / Paraf
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info">
          <Stack gap="sm">
            <Group>
              <Avatar
                size="lg"
                radius="xl"
                color="blue"
                src={profileData?.avatarDmsFileId ? `/api/Dms/${profileData.avatarDmsFileId}/download` : null}
              >
                {currentUser.username.slice(0, 2).toUpperCase()}
              </Avatar>
              <div>
                <Text fw={700}>{currentUser.fullName}</Text>
                <Group gap="xs" mt={4}>
                  <Badge color="indigo">
                    Jabatan: {currentUser.jobLevel} (Rank {currentUser.jobRank})
                  </Badge>
                  <Badge color="cyan" variant="outline">
                    Unit: {currentUser.orgUnitCode}
                  </Badge>
                </Group>
              </div>
            </Group>

            <Grid>
              <Grid.Col span={6}>
                <TextInput label="Nama Lengkap" value={fullName} onChange={(e) => setFullName(e.currentTarget.value)} />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput label="Email Korporat" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Preferensi Bahasa Default"
                  value={prefLang}
                  onChange={(v) => setPrefLang((v as 'id' | 'en') || 'id')}
                  data={[
                    { value: 'id', label: 'Bahasa Indonesia (ID)' },
                    { value: 'en', label: 'English (EN)' },
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Preferensi Tema"
                  value={prefTheme}
                  onChange={(v) => setPrefTheme((v as 'light' | 'dark') || 'light')}
                  data={[
                    { value: 'light', label: 'Light Mode' },
                    { value: 'dark', label: 'Dark Mode' },
                  ]}
                />
              </Grid.Col>
            </Grid>

            <Group justify="flex-end">
              <Button leftSection={<IconCheck size={15} />} onClick={() => updateProfileMutation.mutate()} loading={updateProfileMutation.isPending}>
                Simpan Perubahan Profil
              </Button>
            </Group>

            <Divider label="Ubah Kata Sandi (BCrypt Hash)" labelPosition="left" my="xs" />

            <Grid align="flex-end">
              <Grid.Col span={5}>
                <PasswordInput
                  label="Kata Sandi Saat Ini"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={5}>
                <PasswordInput
                  label="Kata Sandi Baru (Min. 8 Karakter)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Button
                  fullWidth
                  color="teal"
                  leftSection={<IconLock size={14} />}
                  onClick={() => changePasswordMutation.mutate()}
                  loading={changePasswordMutation.isPending}
                >
                  Ubah
                </Button>
              </Grid.Col>
            </Grid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="avatar">
          <Stack gap="md">
            <Text size="xs" c="dimmed">
              Sesuai Bagian 3.1.A PRD: Pemrosesan gambar di sisi klien (crop/resize rasio 1:1) dan kompresi otomatis ke format <code>.webp</code> sebelum disimpan ke DMS.
            </Text>

            <FileInput
              label="Pilih Gambar Foto Profil (PNG / JPG / WEBP)"
              placeholder="Klik untuk memilih foto..."
              accept="image/*"
              leftSection={<IconUpload size={15} />}
              onChange={handleSelectAvatarFile}
            />

            <Group justify="center" gap="xl">
              <Paper withBorder p="xs" radius="md">
                <Text size="xs" fw={600} mb={6} ta="center">
                  Preview Crop 1:1 (256x256 .webp)
                </Text>
                <canvas
                  ref={avatarCanvasRef}
                  width={256}
                  height={256}
                  style={{ borderRadius: '8px', border: '1px solid #ced4da', background: '#f8f9fa' }}
                />
              </Paper>

              {profileData?.avatarDmsFileId && (
                <Paper withBorder p="xs" radius="md">
                  <Text size="xs" fw={600} mb={6} ta="center">
                    Foto Aktif di DMS
                  </Text>
                  <img
                    src={`/api/Dms/${profileData.avatarDmsFileId}/download`}
                    alt="Current Avatar"
                    style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: '50%' }}
                  />
                </Paper>
              )}
            </Group>

            {sourceAvatarImg && (
              <div>
                <Text size="xs" fw={600}>
                  Zoom Crop Rasio 1:1 ({cropZoom.toFixed(1)}x)
                </Text>
                <Slider min={1} max={3} step={0.1} value={cropZoom} onChange={setCropZoom} />
              </div>
            )}

            <Group justify="flex-end">
              <Button
                color="blue"
                disabled={!sourceAvatarImg}
                loading={uploadCroppedAvatarMutation.isPending}
                onClick={() => uploadCroppedAvatarMutation.mutate()}
              >
                Kompres ke .webp & Simpan ke DMS
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="signature">
          <Stack gap="md">
            <Text size="xs" c="dimmed">
              Goreskan tanda tangan / paraf digital Anda pada kotak di bawah untuk digunakan sebagai cap persetujuan elektronik (disimpan dalam format <code>.webp</code> terverifikasi SHA-256 di DMS).
            </Text>

            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={700}>
                  Kanvas Tanda Tangan / Paraf Elektronik
                </Text>
                <Button size="compact-xs" variant="subtle" color="gray" leftSection={<IconEraser size={14} />} onClick={clearSignatureCanvas}>
                  Bersihkan Kanvas
                </Button>
              </Group>
              <canvas
                ref={sigCanvasRef}
                width={460}
                height={160}
                onMouseDown={handleSigMouseDown}
                onMouseMove={handleSigMouseMove}
                onMouseUp={handleSigMouseUp}
                onMouseLeave={handleSigMouseUp}
                style={{
                  width: '100%',
                  height: 160,
                  border: '1px dashed #868e96',
                  borderRadius: '6px',
                  background: '#ffffff',
                  cursor: 'crosshair',
                }}
              />
            </Paper>

            {profileData?.signatureDmsFileId && (
              <Paper withBorder p="xs" radius="md">
                <Text size="xs" fw={600} mb={4}>
                  Paraf Aktif di DMS (File ID: {profileData.signatureDmsFileId})
                </Text>
                <img
                  src={`/api/Dms/${profileData.signatureDmsFileId}/download`}
                  alt="Active Signature"
                  style={{ maxHeight: 80, border: '1px solid #dee2e6', borderRadius: 4, background: '#fff' }}
                />
              </Paper>
            )}

            <Group justify="flex-end">
              <Button
                color="teal"
                leftSection={<IconSignature size={16} />}
                loading={uploadSignatureMutation.isPending}
                onClick={() => uploadSignatureMutation.mutate()}
              >
                Simpan Paraf (.webp) ke DMS
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </EnterpriseModalShell>
  );
}

