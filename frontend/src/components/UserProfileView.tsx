import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  FileInput,
  Grid,
  Group,
  Paper,
  PasswordInput,
  Select,
  Slider,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCamera,
  IconCheck,
  IconEraser,
  IconKey,
  IconLock,
  IconSignature,
  IconUpload,
  IconUserCheck,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { UserIdentity, useAppStore } from '../store/useAppStore';

interface Props {
  currentUser: UserIdentity;
}

export function UserProfileView({ currentUser }: Props) {
  const queryClient = useQueryClient();
  const { setCurrentUser, setLanguage, setColorScheme } = useAppStore();

  const [fullName, setFullName] = useState(currentUser.fullName);
  const [email, setEmail] = useState(currentUser.email || `${currentUser.username}@coreenterprise.local`);
  const [prefLang, setPrefLang] = useState<'id' | 'en'>('id');
  const [prefTheme, setPrefTheme] = useState<'light' | 'dark'>('light');

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
    enabled: !!currentUser.id && !currentUser.id.startsWith('00000000'),
  });

  useEffect(() => {
    if (profileData) {
      setFullName(profileData.fullName);
      setEmail(profileData.email);
      setPrefLang((profileData.preferredLanguage as 'id' | 'en') || 'id');
      setPrefTheme((profileData.preferredTheme as 'light' | 'dark') || 'light');
    } else {
      setFullName(currentUser.fullName);
      setEmail(currentUser.email || `${currentUser.username}@coreenterprise.local`);
    }
  }, [profileData, currentUser]);

  useEffect(() => {
    const canvas = avatarCanvasRef.current;
    if (!canvas || !sourceAvatarImg) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 220, 220);
    const minSide = Math.min(sourceAvatarImg.width, sourceAvatarImg.height) / cropZoom;
    const sx = (sourceAvatarImg.width - minSide) / 2;
    const sy = (sourceAvatarImg.height - minSide) / 2;
    ctx.drawImage(sourceAvatarImg, sx, sy, minSide, minSide, 0, 0, 220, 220);
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
      notifications.show({ title: 'Profil Disimpan', message: data.message, color: 'green' });
      setLanguage(prefLang);
      setColorScheme(prefTheme);
      setCurrentUser({ ...currentUser, fullName, email });
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
      setCurrentUser({ ...currentUser, avatarDmsFileId: data.fileId });
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
      setCurrentUser({ ...currentUser, signatureDmsFileId: data.fileId });
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

  const avatarFileId = profileData?.avatarDmsFileId ?? currentUser.avatarDmsFileId;
  const signatureFileId = profileData?.signatureDmsFileId ?? currentUser.signatureDmsFileId;

  return (
    <Stack gap="lg">
      {/* Enterprise Identity Header Card */}
      <Card withBorder radius="md">
        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Group gap="lg" wrap="nowrap">
              <Avatar
                size={84}
                radius="xl"
                color="blue"
                src={avatarFileId ? `/api/Dms/${avatarFileId}/download` : null}
              >
                {currentUser.username.slice(0, 2).toUpperCase()}
              </Avatar>
              <div>
                <Group gap="xs" mb={4}>
                  <Badge variant="outline" size="sm">
                    {profileData?.employeeNumber || currentUser.employeeNumber || 'EMP-CORPORATE'}
                  </Badge>
                  <Badge color="teal" size="sm">
                    VERIFIED 2-AXIS IDENTITY
                  </Badge>
                </Group>
                <Title order={3}>{currentUser.fullName}</Title>
                <Text size="sm" c="dimmed" mb="xs">
                  @{currentUser.username} • {email}
                </Text>
                <Group gap="xs">
                  <Badge color="indigo" variant="filled">
                    Sumbu 1 (Jabatan): {currentUser.jobLevel} (Rank {currentUser.jobRank})
                  </Badge>
                  <Badge color="cyan" variant="light">
                    Unit Organisasi: {currentUser.orgUnitCode} ({currentUser.orgUnitType})
                  </Badge>
                  {currentUser.roles.map((r) => (
                    <Badge key={r} color="grape" variant="light">
                      Sumbu 2 (Role): {r}
                    </Badge>
                  ))}
                </Group>
              </div>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>
                Daftar Permission Aktif (JWT Claims)
              </Text>
              <Group gap={4}>
                {currentUser.permissions.map((p) => (
                  <Badge key={p} size="xs" variant="dot" color="blue">
                    {p}
                  </Badge>
                ))}
              </Group>
            </Paper>
          </Grid.Col>
        </Grid>
      </Card>

      <Grid>
        {/* Left Column: Profile Info & Password Security */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="lg">
            <Card withBorder radius="md">
              <Group gap="xs" mb="md">
                <IconUserCheck size={20} />
                <Title order={4}>Informasi Pribadi & Preferensi</Title>
              </Group>

              <Stack gap="md">
                <TextInput label="Nama Lengkap Pejabat / Karyawan" value={fullName} onChange={(e) => setFullName(e.currentTarget.value)} />
                <TextInput label="Alamat Email Korporat" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Bahasa Default (i18n)"
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
                      label="Tema Default"
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
                  <Button
                    leftSection={<IconCheck size={16} />}
                    loading={updateProfileMutation.isPending}
                    onClick={() => updateProfileMutation.mutate()}
                  >
                    Simpan Informasi Profil
                  </Button>
                </Group>
              </Stack>
            </Card>

            <Card withBorder radius="md">
              <Group gap="xs" mb="md">
                <IconKey size={20} />
                <Title order={4}>Keamanan Kata Sandi (BCrypt Hash)</Title>
              </Group>

              <Stack gap="md">
                <PasswordInput
                  label="Kata Sandi Saat Ini"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Kata Sandi Baru (Minimal 8 Karakter)"
                  placeholder="Masukkan kata sandi baru..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.currentTarget.value)}
                />
                <Group justify="flex-end">
                  <Button
                    color="teal"
                    leftSection={<IconLock size={16} />}
                    loading={changePasswordMutation.isPending}
                    onClick={() => changePasswordMutation.mutate()}
                  >
                    Perbarui Kata Sandi
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>

        {/* Right Column: 1:1 WebP Avatar Cropper & Digital Signature Pad */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="lg">
            <Card withBorder radius="md">
              <Group gap="xs" mb="xs">
                <IconCamera size={20} />
                <Title order={4}>Foto Profil (Crop Rasio 1:1 & Kompresi .webp ke DMS)</Title>
              </Group>
              <Text size="xs" c="dimmed" mb="md">
                Pilih foto dari perangkat Anda, atur perbesaran rasio 1:1, lalu simpan ke DMS dalam format <code>.webp</code>.
              </Text>

              <FileInput
                label="Pilih Gambar Foto"
                placeholder="Klik untuk mengunggah gambar..."
                accept="image/*"
                leftSection={<IconUpload size={15} />}
                onChange={handleSelectAvatarFile}
                mb="md"
              />

              <Group justify="center" gap="lg" mb="md">
                <Paper withBorder p="xs" radius="md">
                  <Text size="xs" fw={600} mb={4} ta="center">
                    Preview 1:1 (220x220 .webp)
                  </Text>
                  <canvas
                    ref={avatarCanvasRef}
                    width={220}
                    height={220}
                    style={{ borderRadius: '8px', border: '1px solid #ced4da', background: '#f8f9fa' }}
                  />
                </Paper>
              </Group>

              {sourceAvatarImg && (
                <div style={{ marginBottom: 12 }}>
                  <Text size="xs" fw={600}>
                    Zoom Crop ({cropZoom.toFixed(1)}x)
                  </Text>
                  <Slider min={1} max={3} step={0.1} value={cropZoom} onChange={setCropZoom} />
                </div>
              )}

              <Group justify="flex-end">
                <Button
                  disabled={!sourceAvatarImg}
                  loading={uploadCroppedAvatarMutation.isPending}
                  onClick={() => uploadCroppedAvatarMutation.mutate()}
                >
                  Simpan Foto 1:1 (.webp) ke DMS
                </Button>
              </Group>
            </Card>

            <Card withBorder radius="md">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconSignature size={20} />
                  <Title order={4}>Tanda Tangan Digital / Paraf Persetujuan (.webp)</Title>
                </Group>
                <Button size="compact-xs" variant="subtle" color="gray" leftSection={<IconEraser size={14} />} onClick={clearSignatureCanvas}>
                  Bersihkan Kanvas
                </Button>
              </Group>
              <Text size="xs" c="dimmed" mb="sm">
                Digunakan sebagai cap tanda tangan elektronik resmi saat menyetujui dokumen PO dan DCP.
              </Text>

              <canvas
                ref={sigCanvasRef}
                width={460}
                height={150}
                onMouseDown={handleSigMouseDown}
                onMouseMove={handleSigMouseMove}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                style={{
                  width: '100%',
                  height: 150,
                  border: '1px dashed #868e96',
                  borderRadius: '8px',
                  background: '#ffffff',
                  cursor: 'crosshair',
                }}
              />

              {signatureFileId && (
                <Paper withBorder p="xs" radius="md" mt="sm">
                  <Text size="xs" fw={600} mb={4}>
                    Paraf Aktif di DMS:
                  </Text>
                  <img
                    src={`/api/Dms/${signatureFileId}/download`}
                    alt="Digital Signature"
                    style={{ maxHeight: 68, background: '#fff', borderRadius: 4, border: '1px solid #dee2e6' }}
                  />
                </Paper>
              )}

              <Group justify="flex-end" mt="md">
                <Button
                  color="teal"
                  leftSection={<IconSignature size={16} />}
                  loading={uploadSignatureMutation.isPending}
                  onClick={() => uploadSignatureMutation.mutate()}
                >
                  Simpan Paraf Digital (.webp)
                </Button>
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

