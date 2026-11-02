import React from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconCheck, IconShieldCheck } from '@tabler/icons-react';
import { useAppStore } from '../store/useAppStore';

interface EnterpriseModalShellProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeLabel?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  iconColor?: string;
  size?: string | number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerLeft?: React.ReactNode;
  submitLabel?: string;
  submitColor?: string;
  submitIcon?: React.ReactNode;
  onSubmit?: () => void;
  loading?: boolean;
  submitDisabled?: boolean;
  cancelLabel?: string;
  hideFooter?: boolean;
}

export function EnterpriseModalShell({
  opened,
  onClose,
  title,
  subtitle,
  badgeText,
  badgeLabel,
  badgeColor = 'blue',
  icon,
  iconColor,
  size = 'lg',
  children,
  footer,
  footerLeft,
  submitLabel,
  submitColor,
  submitIcon,
  onSubmit,
  loading = false,
  submitDisabled = false,
  cancelLabel = 'Batal',
  hideFooter = false,
}: EnterpriseModalShellProps) {
  const { primaryColor, colorScheme } = useAppStore();
  const effectiveColor = iconColor || primaryColor;
  const resolvedBadge = badgeText || badgeLabel;

  return (
    <Modal.Root
      opened={opened}
      onClose={onClose}
      size={size}
      centered
      radius="lg"
      transitionProps={{ transition: 'pop', duration: 180 }}
    >
      <Modal.Overlay backgroundOpacity={0.5} blur={5} />
      <Modal.Content
        radius="lg"
        style={{
          overflow: 'hidden',
          border:
            colorScheme === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* ENTERPRISE MODAL HEADER */}
        <Modal.Header
          px="lg"
          py="md"
          style={{
            borderBottom:
              colorScheme === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(0, 0, 0, 0.08)',
            background:
              colorScheme === 'dark'
                ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.65) 0%, rgba(17, 23, 34, 0.9) 100%)'
                : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          }}
        >
          <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <ThemeIcon
              size={42}
              radius="md"
              variant="gradient"
              gradient={{ from: effectiveColor, to: 'cyan', deg: 135 }}
            >
              {icon}
            </ThemeIcon>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Group gap="xs" wrap="nowrap">
                <Text fw={700} size="md" truncate>
                  {title}
                </Text>
                {resolvedBadge && (
                  <Badge size="xs" color={badgeColor} variant="light">
                    {resolvedBadge}
                  </Badge>
                )}
              </Group>
              {subtitle && (
                <Text size="xs" c="dimmed" truncate mt={1}>
                  {subtitle}
                </Text>
              )}
            </div>
          </Group>
          <Modal.CloseButton size="md" radius="md" />
        </Modal.Header>

        {/* ENTERPRISE MODAL BODY */}
        <Modal.Body p="lg" className="enterprise-modal-body">
          <style>{`
            .enterprise-modal-body .mantine-InputWrapper-label {
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              display: block !important;
              max-width: 100% !important;
              font-size: 12.5px !important;
              font-weight: 600 !important;
              line-height: 1.35 !important;
              margin-bottom: 4px !important;
            }
          `}</style>
          <Stack gap="md">
            {children}

            {!hideFooter && (
              <>
                <Divider mt="xs" />
                {footer ? (
                  <Box>{footer}</Box>
                ) : (
                  <Group justify="space-between" align="center" wrap="wrap">
                    {footerLeft ? (
                      <Box>{footerLeft}</Box>
                    ) : (
                      <Group gap={6}>
                        <ThemeIcon size={20} radius="xl" color="teal" variant="light">
                          <IconShieldCheck size={13} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed">
                          Tercatat otomatis pada Audit Trail PostgreSQL (<code>jsonb</code>)
                        </Text>
                      </Group>
                    )}

                    <Group gap="xs">
                      <Button variant="default" radius="md" onClick={onClose}>
                        {cancelLabel}
                      </Button>
                      {onSubmit && submitLabel && (
                        <Button
                          radius="md"
                          color={submitColor || effectiveColor}
                          leftSection={submitIcon || <IconCheck size={16} />}
                          loading={loading}
                          disabled={submitDisabled}
                          onClick={onSubmit}
                        >
                          {submitLabel}
                        </Button>
                      )}
                    </Group>
                  </Group>
                )}
              </>
            )}
          </Stack>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}

interface EnterpriseFormSectionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor?: string;
  rightSection?: React.ReactNode;
  children: React.ReactNode;
}

export function EnterpriseFormSection({
  title,
  subtitle,
  icon,
  iconColor = 'blue',
  rightSection,
  children,
}: EnterpriseFormSectionProps) {
  const { colorScheme } = useAppStore();
  const cleanTitle = title.replace(/^\d+\.\s*/, '');

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      style={{
        backgroundColor:
          colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafbfc',
      }}
    >
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <ThemeIcon size={28} radius="md" color={iconColor} variant="light">
            {icon}
          </ThemeIcon>
          <div>
            <Text size="sm" fw={700} lh={1.2}>
              {cleanTitle}
            </Text>
            {subtitle && (
              <Text size="11px" c="dimmed" mt={1}>
                {subtitle}
              </Text>
            )}
          </div>
        </Group>
        {rightSection && <Box>{rightSection}</Box>}
      </Group>
      {children}
    </Paper>
  );
}

interface EnterpriseSwitchCardProps {
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
  title: string;
  description?: string;
  activeColor?: string;
  disabled?: boolean;
}

export function EnterpriseSwitchCard({
  checked,
  onChange,
  title,
  description,
  activeColor = 'teal',
  disabled = false,
}: EnterpriseSwitchCardProps) {
  const { colorScheme } = useAppStore();

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderColor: checked
          ? `var(--mantine-color-${activeColor}-5)`
          : undefined,
        backgroundColor: checked
          ? colorScheme === 'dark'
            ? 'rgba(20, 184, 166, 0.08)'
            : 'rgba(20, 184, 166, 0.04)'
          : undefined,
        transition: 'all 0.15s ease',
      }}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Text size="xs" fw={700}>
            {title}
          </Text>
          {description && (
            <Text size="11px" c="dimmed">
              {description}
            </Text>
          )}
        </div>
        <Switch
          size="md"
          color={activeColor}
          checked={checked}
          disabled={disabled}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.currentTarget.checked);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </Group>
    </Paper>
  );
}

