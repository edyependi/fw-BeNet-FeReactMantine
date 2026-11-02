import { create } from 'zustand';
import i18n from '../i18n';

export interface UserIdentity {
  id: string;
  employeeNumber?: string;
  username: string;
  email?: string;
  fullName: string;
  avatarDmsFileId?: string | null;
  signatureDmsFileId?: string | null;
  preferredLanguage?: string;
  preferredTheme?: string;
  jobLevel: string;
  jobLevelName?: string;
  jobRank: number;
  orgUnitId: string;
  orgUnitCode: string;
  orgUnitName?: string;
  orgUnitType: string;
  roles: string[];
  permissions: string[];
}

export type BrandColor = 'blue' | 'indigo' | 'teal' | 'cyan' | 'grape' | 'orange';
export type RadiusSize = 'xs' | 'sm' | 'md' | 'lg';

export interface AppBrandingConfig {
  appTitle: string;
  appSubtitle: string;
  appLogoIcon: string;
  appVersionBadge: string;
  companyName: string;
  systemAnnouncementBanner: string;
}

interface AppState {
  isAuthenticated: boolean;
  colorScheme: 'light' | 'dark';
  primaryColor: BrandColor;
  defaultRadius: RadiusSize;
  compactMode: boolean;
  language: 'id' | 'en';
  accessToken: string | null;
  currentUser: UserIdentity;
  appTitle: string;
  appSubtitle: string;
  appLogoIcon: string;
  appVersionBadge: string;
  companyName: string;
  systemAnnouncementBanner: string;
  activeRequestsCount: number;
  incrementRequests: () => void;
  decrementRequests: () => void;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: 'light' | 'dark') => void;
  setPrimaryColor: (color: BrandColor) => void;
  setDefaultRadius: (radius: RadiusSize) => void;
  setCompactMode: (compact: boolean) => void;
  setLanguage: (lang: 'id' | 'en') => void;
  setCurrentUser: (user: UserIdentity, token?: string) => void;
  setAppBranding: (branding: Partial<AppBrandingConfig>) => void;
  logout: () => void;
}

const defaultDemoUser: UserIdentity = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  employeeNumber: 'EMP-2001',
  username: 'am.sum1',
  email: 'am.sum1@coreenterprise.local',
  fullName: 'Edy Ependi (Area Manager Sumatera 1)',
  jobLevel: 'AM',
  jobLevelName: 'Area Manager',
  jobRank: 30,
  orgUnitId: 'ORG-AREA-SUM1',
  orgUnitCode: 'AREA-SUM1',
  orgUnitName: 'Area Sumatera 1',
  orgUnitType: 'AREA',
  roles: ['EMPLOYEE', 'MASTER_DATA'],
  permissions: [
    'Transaction.Read',
    'Transaction.Create',
    'Workflow.Approve',
    'Workflow.Simulate',
    'MasterData.Read',
    'MasterData.Write',
  ],
};

const loadStoredUser = (): UserIdentity => {
  try {
    const raw = localStorage.getItem('ce_user');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return defaultDemoUser;
};

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: localStorage.getItem('ce_auth') === 'true',
  colorScheme: (localStorage.getItem('ce_theme') as 'light' | 'dark') || 'light',
  primaryColor: (localStorage.getItem('ce_brand_color') as BrandColor) || 'blue',
  defaultRadius: (localStorage.getItem('ce_radius') as RadiusSize) || 'md',
  compactMode: localStorage.getItem('ce_compact') === 'true',
  language: (localStorage.getItem('ce_lang') as 'id' | 'en') || 'id',
  accessToken: localStorage.getItem('ce_token'),
  currentUser: loadStoredUser(),

  appTitle: localStorage.getItem('ce_app_title') || 'CoreEnterprise Portal',
  appSubtitle:
    localStorage.getItem('ce_app_subtitle') ||
    'Otorisasi 2 Dimensi, Contextual DoA Header-Detail & 3-Axis Approver Resolution',
  appLogoIcon: localStorage.getItem('ce_app_logo_icon') || 'IconShieldLock',
  appVersionBadge: localStorage.getItem('ce_app_version_badge') || 'Enterprise v1.4.0',
  companyName: localStorage.getItem('ce_company_name') || 'PT CoreEnterprise Nusantara Tbk',
  systemAnnouncementBanner: localStorage.getItem('ce_announcement_banner') || '',
  activeRequestsCount: 0,

  incrementRequests: () =>
    set((state) => ({
      activeRequestsCount: state.activeRequestsCount + 1,
    })),

  decrementRequests: () =>
    set((state) => ({
      activeRequestsCount: Math.max(0, state.activeRequestsCount - 1),
    })),

  toggleColorScheme: () =>
    set((state) => {
      const next = state.colorScheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('ce_theme', next);
      return { colorScheme: next };
    }),

  setColorScheme: (scheme) =>
    set(() => {
      localStorage.setItem('ce_theme', scheme);
      return { colorScheme: scheme };
    }),

  setPrimaryColor: (color) =>
    set(() => {
      localStorage.setItem('ce_brand_color', color);
      return { primaryColor: color };
    }),

  setDefaultRadius: (radius) =>
    set(() => {
      localStorage.setItem('ce_radius', radius);
      return { defaultRadius: radius };
    }),

  setCompactMode: (compact) =>
    set(() => {
      localStorage.setItem('ce_compact', String(compact));
      return { compactMode: compact };
    }),

  setLanguage: (lang) =>
    set(() => {
      localStorage.setItem('ce_lang', lang);
      i18n.changeLanguage(lang);
      return { language: lang };
    }),

  setCurrentUser: (user, token) =>
    set((state) => {
      localStorage.setItem('ce_auth', 'true');
      localStorage.setItem('ce_user', JSON.stringify(user));
      if (token) localStorage.setItem('ce_token', token);
      return {
        isAuthenticated: true,
        currentUser: user,
        accessToken: token ?? state.accessToken,
      };
    }),

  setAppBranding: (branding) =>
    set((state) => {
      const nextTitle = branding.appTitle ?? state.appTitle;
      const nextSubtitle = branding.appSubtitle ?? state.appSubtitle;
      const nextIcon = branding.appLogoIcon ?? state.appLogoIcon;
      const nextBadge = branding.appVersionBadge ?? state.appVersionBadge;
      const nextCompany = branding.companyName ?? state.companyName;
      const nextBanner = branding.systemAnnouncementBanner ?? state.systemAnnouncementBanner;

      localStorage.setItem('ce_app_title', nextTitle);
      localStorage.setItem('ce_app_subtitle', nextSubtitle);
      localStorage.setItem('ce_app_logo_icon', nextIcon);
      localStorage.setItem('ce_app_version_badge', nextBadge);
      localStorage.setItem('ce_company_name', nextCompany);
      localStorage.setItem('ce_announcement_banner', nextBanner);

      if (typeof document !== 'undefined') {
        document.title = `${nextTitle} — ${nextCompany}`;
      }

      return {
        appTitle: nextTitle,
        appSubtitle: nextSubtitle,
        appLogoIcon: nextIcon,
        appVersionBadge: nextBadge,
        companyName: nextCompany,
        systemAnnouncementBanner: nextBanner,
      };
    }),

  logout: () =>
    set(() => {
      localStorage.removeItem('ce_auth');
      localStorage.removeItem('ce_token');
      return {
        isAuthenticated: false,
        accessToken: null,
      };
    }),
}));
