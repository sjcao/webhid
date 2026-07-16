import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'zh-CN' | 'en';
export type MousePanel = 'buttons' | 'shortcuts' | 'dpi' | 'params' | 'profiles' | 'other';

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
      locale: 'zh-CN',
      theme: 'light',
      activePanel: 'buttons',
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
    },
  ),
);
