import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';
export type Density = 'comfortable' | 'compact';

interface UiState {
  theme: Theme;
  density: Density;
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setDensity: (density: Density) => void;
  toggleSidebarCollapsed: () => void;
  setPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      density: 'comfortable',
      sidebarCollapsed: false,
      paletteOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setDensity: (density) => set({ density }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
    }),
    {
      name: 'fitpower-ui',
      partialize: (s) => ({
        theme: s.theme,
        density: s.density,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);
