import { useEffect } from 'react';
import { useUiStore } from '@/store/useUiStore';

export function useThemeSync(): void {
  const theme = useUiStore((s) => s.theme);
  const density = useUiStore((s) => s.density);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);
}
