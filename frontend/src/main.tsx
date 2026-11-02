import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-react-table/styles.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import { App } from './App';
import { useAppStore } from './store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Root() {
  const colorScheme = useAppStore((s) => s.colorScheme);
  const primaryColor = useAppStore((s) => s.primaryColor);
  const defaultRadius = useAppStore((s) => s.defaultRadius);
  const compactMode = useAppStore((s) => s.compactMode);

  const dynamicTheme = useMemo(
    () =>
      createTheme({
        primaryColor,
        defaultRadius,
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        headings: {
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: '700',
        },
        components: {
          Card: {
            defaultProps: {
              padding: compactMode ? 'sm' : 'lg',
              shadow: 'xs',
              withBorder: true,
            },
          },
          Paper: {
            defaultProps: {
              shadow: 'xs',
            },
          },
          Modal: {
            defaultProps: {
              centered: true,
              radius: 'md',
              padding: 'lg',
              overlayProps: {
                backgroundOpacity: 0.45,
                blur: 4,
              },
            },
          },
          Table: {
            defaultProps: {
              verticalSpacing: compactMode ? 'xs' : 'sm',
              horizontalSpacing: compactMode ? 'xs' : 'md',
              highlightOnHover: true,
              striped: true,
            },
          },
          Button: {
            defaultProps: {
              fw: 600,
            },
          },
          Badge: {
            defaultProps: {
              fw: 600,
            },
          },
        },
      }),
    [primaryColor, defaultRadius, compactMode]
  );

  return (
    <MantineProvider theme={dynamicTheme} forceColorScheme={colorScheme}>
      <Notifications position="top-right" zIndex={2000} />
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
