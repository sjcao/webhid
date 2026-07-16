import { PropsWithChildren, useLayoutEffect } from 'react';
import { useUiStore } from '@/stores/ui-store';

export function AppProviders({ children }: PropsWithChildren) {
  const theme = useUiStore((state) => state.theme);
  const locale = useUiStore((state) => state.locale);

  useLayoutEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === 'zh-CN' ? '鼠标网页驱动' : 'Mouse HID Hub';
  }, [locale]);

  return children;
}
