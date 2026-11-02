import {
  Badge,
  Button,
  ColorSwatch,
  Divider,
  Drawer,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  UnstyledButton,
  CheckIcon,
  rem,
} from '@mantine/core';
import { IconMoon, IconPalette, IconSun } from '@tabler/icons-react';
import { BrandColor, RadiusSize, useAppStore } from '../store/useAppStore';

interface Props {
  opened: boolean;
  onClose: () => void;
}

const BRAND_COLORS: { value: BrandColor; label: string; hex: string }[] = [
  { value: 'blue', label: 'Corporate Blue', hex: '#228be6' },
  { value: 'indigo', label: 'Executive Indigo', hex: '#4c6ef5' },
  { value: 'teal', label: 'Agro Emerald', hex: '#12b886' },
  { value: 'cyan', label: 'Ocean Cyan', hex: '#15aabf' },
  { value: 'grape', label: 'Royal Violet', hex: '#be4bdb' },
  { value: 'orange', label: 'Industrial Amber', hex: '#fd7e14' },
];

export function ThemeCustomizerDrawer({ opened, onClose }: Props) {
  const {
    colorScheme,
    setColorScheme,
    primaryColor,
    setPrimaryColor,
    defaultRadius,
    setDefaultRadius,
    compactMode,
    setCompactMode,
  } = useAppStore();

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Group gap="xs">
          <IconPalette size={20} />
          <Title order={5}>Enterprise Theme & UI Customizer</Title>
        </Group>
      }
    >
      <Stack gap="lg">
        <Text size="xs" c="dimmed">
          Sesuai Bagian 3.3.A PRD: Kustomisasi mode warna (Light/Dark), palet warna korporat (Primary Brand Color), border radius, dan kerapatan tabel (Compact/Comfortable) melalui MantineProvider.
        </Text>

        {/* 1. Light / Dark Mode */}
        <div>
          <Text size="sm" fw={700} mb="xs">
            1. Mode Tampilan (Color Scheme)
          </Text>
          <SegmentedControl
            fullWidth
            value={colorScheme}
            onChange={(val) => setColorScheme(val as 'light' | 'dark')}
            data={[
              {
                value: 'light',
                label: (
                  <Group gap={6} justify="center">
                    <IconSun size={15} />
                    <span>Light Mode</span>
                  </Group>
                ),
              },
              {
                value: 'dark',
                label: (
                  <Group gap={6} justify="center">
                    <IconMoon size={15} />
                    <span>Dark Mode</span>
                  </Group>
                ),
              },
            ]}
          />
        </div>

        <Divider />

        {/* 2. Primary Corporate Brand Color */}
        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={700}>
              2. Palet Warna Korporat (Primary Brand Color)
            </Text>
            <Badge color={primaryColor}>{primaryColor.toUpperCase()}</Badge>
          </Group>

          <SimpleGrid cols={2} spacing="xs">
            {BRAND_COLORS.map((c) => {
              const selected = primaryColor === c.value;
              return (
                <UnstyledButton
                  key={c.value}
                  onClick={() => setPrimaryColor(c.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: selected ? `2px solid ${c.hex}` : '1px solid rgba(128,128,128,0.25)',
                  }}
                >
                  <Group gap="sm">
                    <ColorSwatch color={c.hex} size={22}>
                      {selected && <CheckIcon style={{ width: rem(10), height: rem(10), color: '#fff' }} />}
                    </ColorSwatch>
                    <Text size="xs" fw={selected ? 700 : 500}>
                      {c.label}
                    </Text>
                  </Group>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </div>

        <Divider />

        {/* 3. Border Radius */}
        <div>
          <Text size="sm" fw={700} mb="xs">
            3. Lengkungan Sudut Komponen (Border Radius)
          </Text>
          <SegmentedControl
            fullWidth
            value={defaultRadius}
            onChange={(val) => setDefaultRadius(val as RadiusSize)}
            data={[
              { label: 'Sharp (XS)', value: 'xs' },
              { label: 'Subtle (SM)', value: 'sm' },
              { label: 'Standard (MD)', value: 'md' },
              { label: 'Rounded (LG)', value: 'lg' },
            ]}
          />
        </div>

        <Divider />

        {/* 4. Data Grid & Card Density */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text size="sm" fw={700}>
                4. Kerapatan Tabel & Kartu (Compact Density)
              </Text>
              <Text size="xs" c="dimmed">
                Mengurangi jarak spasi vertikal tabel untuk menampilkan lebih banyak baris transaksi di layar.
              </Text>
            </div>
            <Switch
              size="md"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.currentTarget.checked)}
            />
          </Group>
        </Paper>

        <Button variant="light" fullWidth onClick={onClose}>
          Selesai & Terapkan
        </Button>
      </Stack>
    </Drawer>
  );
}

