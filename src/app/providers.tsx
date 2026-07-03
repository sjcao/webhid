import { PropsWithChildren, useEffect } from 'react';
import { useUiStore } from '@/stores/ui-store';

export function AppProviders({ children }: PropsWithChildren) {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  return children;
}
