import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'zh-CN' | 'en';
export type MousePanel = 'buttons' | 'shortcuts' | 'dpi' | 'params' | 'profiles' | 'other';

const DEFAULT_PREFERENCES = {
  locale: 'zh-CN' as Locale,
  theme: 'light' as const,
  activePanel: 'buttons' as MousePanel,
};
const LOCALES = new Set<unknown>(['zh-CN', 'en']);
const THEMES = new Set<unknown>(['dark', 'light']);
const PANELS = new Set<unknown>(['buttons', 'shortcuts', 'dpi', 'params', 'profiles', 'other']);

export function normalizeUiPreferences(value: unknown) {
  const stored = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    locale: LOCALES.has(stored.locale) ? stored.locale as Locale : DEFAULT_PREFERENCES.locale,
    theme: THEMES.has(stored.theme) ? stored.theme as 'dark' | 'light' : DEFAULT_PREFERENCES.theme,
    activePanel: PANELS.has(stored.activePanel) ? stored.activePanel as MousePanel : DEFAULT_PREFERENCES.activePanel,
  };
}

type UiState = {
  locale: Locale;
  theme: 'dark' | 'light';
  activePanel: MousePanel;
  macroEditorDirty: boolean;
  pendingPanel: MousePanel | null;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  setActivePanel: (panel: MousePanel) => void;
  setMacroEditorDirty: (dirty: boolean) => void;
  confirmPanelChange: () => void;
  cancelPanelChange: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      macroEditorDirty: false,
      pendingPanel: null,
      setLocale: (locale) => set({ locale }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setActivePanel: (activePanel) => set((state) => (
        state.activePanel === 'shortcuts' && state.macroEditorDirty && activePanel !== 'shortcuts'
          ? { pendingPanel: activePanel }
          : { activePanel, pendingPanel: null }
      )),
      setMacroEditorDirty: (macroEditorDirty) => set({ macroEditorDirty }),
      confirmPanelChange: () => set((state) => ({
        activePanel: state.pendingPanel ?? state.activePanel,
        pendingPanel: null,
        macroEditorDirty: false,
      })),
      cancelPanelChange: () => set({ pendingPanel: null }),
    }),
    {
      name: 'mouse-hid.ui.v2',
      partialize: (state) => ({ locale: state.locale, theme: state.theme, activePanel: state.activePanel }),
      merge: (persisted, current) => ({ ...current, ...normalizeUiPreferences(persisted) }),
    },
  ),
);
