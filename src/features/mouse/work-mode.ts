import { WorkMode } from '@/protocol/mouse';
import { TranslationKey } from '@/i18n/use-i18n';

export function workModeKey(mode: WorkMode): TranslationKey {
  if (mode === WorkMode.Wireless) return 'mouse.wireless';
  if (mode === WorkMode.Bluetooth) return 'mouse.bluetooth';
  return 'mouse.wired';
}
