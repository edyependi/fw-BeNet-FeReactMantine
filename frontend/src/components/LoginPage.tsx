import { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Grid,
  Group,
  Paper,
  PasswordInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBuildingSkyscraper,
  IconCheck,
  IconFileCertificate,
  IconHierarchy2,
  IconLock,
  IconLogin,
  IconMoon,
  IconShieldLock,
  IconSun,
  IconUser,
} from '@tabler/icons-react';
import { apiClient } from '../lib/apiClient';
import { UserIdentity, useAppStore } from '../store/useAppStore';
import { renderAppLogoIcon } from './ApplicationSettingsView';

interface Props {
  demoUsers: UserIdentity[];
}

export function LoginPage({ demoUsers }: Props) {
  const {
    colorScheme,
    toggleColorScheme,
    language,
    setLanguage,
    setCurrentUser,
    primaryColor,
    appTitle,
    appSubtitle,
    appLogoIcon,
    appVersionBadge,
    companyName,
  } = useAppStore();

  const [username, setUsername] = useState('am.sum1');
  const [password, setPassword] = useState('Password123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (targetUsername?: string, targetPassword?: string) => {
    const u = targetUsername ?? username;
    const p = targetPassword ?? password;
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/Auth/login', {
        username: u,
        password: p,
      });

      setCurrentUser(res.data.user, res.data.accessToken);
      notifications.show({
        title: 'Autentikasi Berhasil (2-Axis JWT Issued)',
        message: `Selamat datang, ${res.data.user.fullName} [${res.data.user.jobLevel} @ ${res.data.user.orgUnitCode}]`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err: any) {
      const apiMsg = err.response?.data?.message;
      if (apiMsg) {
        setErrorMsg(apiMsg);
      } else {
        // Fallback offline demo login if backend is not yet started
        const fallback = demoUsers.find((x) => x.username === u);
        if (fallback && p === 'Password123!') {
          setCurrentUser(fallback, 'offline-demo-jwt-token');
          notifications.show({
            title: 'Login Mode Preview Offline',
            message: `Masuk sebagai ${fallback.fullName}`,
            color: 'blue',
          });
        } else {
          setErrorMsg('Gagal menghubungi server autentikasi atau kredensial tidak valid.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background:
          colorScheme === 'dark'
            ? 'radial-gradient(circle at 15% 20%, #1a2332 0%, #0f141c 100%)'
            : 'radial-gradient(circle at 15% 20%, #eef5ff 0%, #f8f9fa 100%)',
      }}
    >
      <Container size="xl" py="xl" w="100%">
        <Paper withBorder shadow="xl" radius="lg" style={{ overflow: 'hidden' }}>
          <Grid gutter={0}>
            {/* Left Panel: Enterprise Branding & Quick Persona Cards */}
            <Grid.Col
              span={{ base: 12, md: 7 }}
              p="xl"
              style={{
                background:
                  colorScheme === 'dark'
                    ? 'linear-gradient(135deg, #111927 0%, #1e293b 100%)'
                    : 'linear-gradient(135deg, #1864ab 0%, #0b7285 100%)',
                color: '#ffffff',
              }}
            >
              <Stack justify="space-between" h="100%" gap="xl">
                <div>
                  <Group gap="sm" mb="lg">
                    <ThemeIcon size={44} radius="md" color="white" variant="white">
                      {renderAppLogoIcon(appLogoIcon, 26, '#1864ab')}
                    </ThemeIcon>
                    <div>
                      <Badge color="cyan" variant="filled" size="sm">
                        {appVersionBadge || 'ENTERPRISE BOILERPLATE v1.4.0'} • {companyName || 'PT CoreEnterprise'}
                      </Badge>
                      <Title order={3} c="white">
                        {appTitle || 'CoreEnterprise Portal'}
                      </Title>
                    </div>
                  </Group>

                  <Title order={2} c="white" fw={800} mb="sm">
                    {appSubtitle || '2-Axis Authorization, Contextual DoA & 3-Axis Workflow Engine'}
                  </Title>
                  <Text size="sm" c="gray.2" mb="xl">
                    Arsitektur keamanan kelas enterprise yang memisahkan Hirarki Jabatan Struktural (Sumbu 1) dari Peran Teknis RBAC (Sumbu 2), dilengkapi matriks plafond kontekstual berlampiran SK PDF DMS dan resolusi Approver 3 dimensi.
                  </Text>

                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="xl">
                    <Paper p="sm" radius="md" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
                      <Group gap="xs" mb={4}>
                        <IconHierarchy2 size={18} color="#66d9e8" />
                        <Text fw={700} size="xs" c="white">
                          2-Axis Security
                        </Text>
                      </Group>
                      <Text size="xs" c="gray.3">
                        Job Level Rank (10–60) + Modular System Roles & JWT Rotation
                      </Text>
                    </Paper>

                    <Paper p="sm" radius="md" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
                      <Group gap="xs" mb={4}>
                        <IconFileCertificate size={18} color="#66d9e8" />
                        <Text fw={700} size="xs" c="white">
                          Contextual DoA + DMS
                        </Text>
                      </Group>
                      <Text size="xs" c="gray.3">
                        Plafond PO vs DCP berbasis SK Direksi PDF (SHA-256)
                      </Text>
                    </Paper>

                    <Paper p="sm" radius="md" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
                      <Group gap="xs" mb={4}>
                        <IconBuildingSkyscraper size={18} color="#66d9e8" />
                        <Text fw={700} size="xs" c="white">
                          3-Axis Resolution
                        </Text>
                      </Group>
                      <Text size="xs" c="gray.3">
                        Jabatan + Pohon Organisasi + Spesialisasi Sub-Kategori
                      </Text>
                    </Paper>
                  </SimpleGrid>

                  <Divider
                    label={
                      <Text size="xs" fw={700} c="gray.2">
                        KLIK SALAH SATU AKUN DEMO UNTUK AUTO-FILL / QUICK LOGIN (Sandi: Password123!)
                      </Text>
                    }
                    labelPosition="left"
                    color="rgba(255,255,255,0.25)"
                    mb="sm"
                  />

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                    {demoUsers.map((u) => (
                      <UnstyledButton
                        key={u.username}
                        onClick={() => {
                          setUsername(u.username);
                          setPassword('Password123!');
                          handleLogin(u.username, 'Password123!');
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: username === u.username ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                          border:
                            username === u.username
                              ? '1px solid rgba(255,255,255,0.65)'
                              : '1px solid rgba(255,255,255,0.15)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap="sm" wrap="nowrap">
                            <Avatar size="sm" radius="xl" color="cyan" variant="filled">
                              {u.username.slice(0, 2).toUpperCase()}
                            </Avatar>
                            <div style={{ minWidth: 0 }}>
                              <Text size="xs" fw={700} c="white" truncate>
                                {u.fullName}
                              </Text>
                              <Text size="10px" c="gray.3" truncate>
                                @{u.username} • {u.jobLevel} (Rank {u.jobRank}) • {u.orgUnitCode}
                              </Text>
                            </div>
                          </Group>
                          <Badge size="xs" color="dark" variant="filled">
                            {u.roles[0]}
                          </Badge>
                        </Group>
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                </div>

                <Group justify="space-between">
                  <Text size="xs" c="gray.4">
                    PostgreSQL 16 (Npgsql) • .NET 10 Clean Architecture • React Mantine v7
                  </Text>
                  <Badge variant="outline" color="gray.2" size="sm">
                    OWASP & SoD Compliant
                  </Badge>
                </Group>
              </Stack>
            </Grid.Col>

            {/* Right Panel: Enterprise Sign-In Form */}
            <Grid.Col span={{ base: 12, md: 5 }} p="xl">
              <Stack justify="space-between" h="100%">
                <Group justify="flex-end" gap="xs">
                  <SegmentedControl
                    size="xs"
                    value={language}
                    onChange={(val) => setLanguage(val as 'id' | 'en')}
                    data={[
                      { label: 'ID', value: 'id' },
                      { label: 'EN', value: 'en' },
                    ]}
                  />
                  <Button
                    variant="default"
                    size="xs"
                    onClick={toggleColorScheme}
                    leftSection={colorScheme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
                  >
                    {colorScheme === 'dark' ? 'Light' : 'Dark'}
                  </Button>
                </Group>

                <Box my="auto" py="md">
                  <Title order={3} mb={4}>
                    Sign In to Corporate Workspace
                  </Title>
                  <Text size="sm" c="dimmed" mb="lg">
                    Masukkan akun korporat Anda atau pilih kartu akun demo di sebelah kiri.
                  </Text>

                  {errorMsg && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" title="Gagal Masuk">
                      {errorMsg}
                    </Alert>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleLogin();
                    }}
                  >
                    <Stack gap="md">
                      <TextInput
                        label="Username / Corporate ID"
                        placeholder="Contoh: am.sum1, user01, user03, auditor, admin"
                        leftSection={<IconUser size={16} />}
                        value={username}
                        onChange={(e) => setUsername(e.currentTarget.value)}
                        required
                      />

                      <PasswordInput
                        label="Kata Sandi"
                        placeholder="Masukkan kata sandi"
                        leftSection={<IconLock size={16} />}
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        required
                      />

                      <Group justify="space-between">
                        <Checkbox
                          label="Simpan sesi (HttpOnly Refresh Cookie)"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.currentTarget.checked)}
                          size="xs"
                        />
                        <Text size="xs" c="dimmed">
                          Default: <code>Password123!</code>
                        </Text>
                      </Group>

                      <Button
                        type="submit"
                        fullWidth
                        size="md"
                        color={primaryColor}
                        loading={loading}
                        leftSection={<IconLogin size={18} />}
                      >
                        Masuk ke Portal (Sign In)
                      </Button>
                    </Stack>
                  </form>
                </Box>

                <Card withBorder padding="sm" radius="md">
                  <Text size="xs" fw={700} mb={2}>
                    Informasi Keamanan Sesi (JWT + Refresh Token Rotation)
                  </Text>
                  <Text size="xs" c="dimmed">
                    Access Token berumur pendek (25 menit) dengan rotasi Refresh Token otomatis di HttpOnly Cookie dan deteksi penyalahgunaan sesi (Token Reuse Detection).
                  </Text>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
}

