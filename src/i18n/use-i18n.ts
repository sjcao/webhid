import { messages } from './messages';
import { useUiStore } from '@/stores/ui-store';

type DotPrefix<TPrefix extends string, TKey extends string> = `${TPrefix}.${TKey}`;
type DotNestedKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : DotPrefix<K, DotNestedKeys<T[K]>>;
}[keyof T & string];

export type TranslationKey = DotNestedKeys<typeof messages['zh-CN']>;

function getValue(locale: keyof typeof messages, key: string) {
  return key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages[locale]);
}

export function useI18n() {
  const locale = useUiStore((state) => state.locale);
  const setLocale = useUiStore((state) => state.setLocale);

  return {
    locale,
    setLocale,
    t: (key: TranslationKey) => {
      const value = getValue(locale, key) ?? getValue('zh-CN', key);
      return typeof value === 'string' ? value : key;
    },
  };
}
