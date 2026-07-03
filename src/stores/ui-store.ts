import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'zh-CN' | 'en';
export type MousePanel = 'buttons' | 'shortcuts' | 'dpi' | 'params' | 'profiles' | 'other';

type UiState = {
  locale: Locale;
  theme: 'dark' | 'light';
  activePanel: MousePanel;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  setActivePanel: (panel: MousePanel) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      locale: 'zh-CN',
      theme: 'light',
  activePanel: 'buttons',
      setLocale: (locale) => set({ locale }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setActivePanel: (activePanel) => set({ activePanel }),
    }),
    { name: 'mouse-hid.ui.v2' },
  ),
);
