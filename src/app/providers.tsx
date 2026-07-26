import { PropsWithChildren, useLayoutEffect } from 'react';
import { messages } from '@/i18n/messages';
import { useUiStore } from '@/stores/ui-store';

export function AppProviders({ children }: PropsWithChildren) {
  const theme = useUiStore((state) => state.theme);
  const locale = useUiStore((state) => state.locale);

  useLayoutEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.title = messages[locale].app.htmlTitle;
  }, [locale]);

  return children;
}
