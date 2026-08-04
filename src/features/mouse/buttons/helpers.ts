import { browserKeyToHid, keyGroups, KeyOption } from '@/protocol/mouse';
import type { TranslationKey } from '@/i18n/use-i18n';
import type { Locale } from '@/stores/ui-store';

export const MODIFIER_OPTIONS = [
  { label: 'L Ctrl', value: 0xe0 },
  { label: 'L Shift', value: 0xe1 },
  { label: 'L Alt', value: 0xe2 },
  { label: 'L Win', value: 0xe3 },
  { label: 'R Ctrl', value: 0xe4 },
  { label: 'R Shift', value: 0xe5 },
  { label: 'R Alt', value: 0xe6 },
  { label: 'R Win', value: 0xe7 },
] as const;

export const MODIFIER_VALUES: number[] = MODIFIER_OPTIONS.map((option) => option.value);

export function parseComboValues(values: number[]) {
  return {
    modifiers: values.filter((value) => MODIFIER_VALUES.includes(value)),
    normalValue: values.find((value) => !MODIFIER_VALUES.includes(value)),
  };
}

export function modifierLabel(value: number) {
  return MODIFIER_OPTIONS.find((option) => option.value === value)?.label ?? '';
}

export function hidValueToName(value: number) {
  for (const [key, codes] of Object.entries(browserKeyToHid)) {
    if (codes[0] === value) {
      return key === ' ' ? 'Space' : key.toUpperCase();
    }
  }
  return `Key(${value})`;
}

export function keyName(event: KeyboardEvent) {
  if (event.key === ' ') return 'Space';
  if (event.key === 'Control') return 'Ctrl';
  if (event.key === 'Meta') return 'Win';
  return event.key.length === 1 ? event.key.toUpperCase() : event.key;
}

export function pickLabel(option: { label: string; labelZh: string }, locale: Locale) {
  return locale === 'zh-CN' ? option.labelZh : option.label;
}

export function formatTemplate(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export type KeyOptionGroup = {
  titleKey: TranslationKey;
  options: KeyOption[];
};

export function buildGroups(
  specs: ReadonlyArray<{ titleKey: TranslationKey; groupId: string }>,
  query: string
): KeyOptionGroup[] {
  const groups = specs.map((spec) => ({
    titleKey: spec.titleKey,
    options: keyGroups.find((group) => group.id === spec.groupId)?.options ?? [],
  }));

  if (!query) return groups;

  return groups
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        `${option.label} ${option.labelZh}`.toLowerCase().includes(query)
      ),
    }))
    .filter((group) => group.options.length > 0);
}
