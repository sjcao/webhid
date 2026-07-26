import type { TranslationKey } from '@/i18n/use-i18n';
import { MacroAction, MacroActionKind, MacroDirection } from '@/stores/macro-store';
import { normalizeMacroTimestamps } from '../macro-actions';

// 编辑器内部的动作模型：附带稳定 id 供 React 行复用，持久化前会剥离
export type EditorAction = MacroAction & { id: string };

export type MouseButtonKey = 'left' | 'right' | 'middle';

export const MOUSE_BUTTON_VALUES: Record<MouseButtonKey, number> = {
  left: 1,
  right: 2,
  middle: 3,
};

export const MOUSE_BUTTON_LABEL_KEYS: Record<MouseButtonKey, TranslationKey> = {
  left: 'mouse.mouseLeft',
  right: 'mouse.mouseRight',
  middle: 'mouse.mouseMiddle',
};

// 旧版本把中文标签当标识符持久化为 keyName，读入时映射回语言无关标识
const LEGACY_MOUSE_KEY_NAMES: Record<string, MouseButtonKey> = {
  '左键按下': 'left',
  '左键抬起': 'left',
  '右键按下': 'right',
  '右键抬起': 'right',
  '中键按下': 'middle',
  '中键抬起': 'middle',
};

export const INSERT_MOUSE_ITEMS: ReadonlyArray<{ button: MouseButtonKey; direction: MacroDirection }> = [
  { button: 'left', direction: MacroDirection.Down },
  { button: 'left', direction: MacroDirection.Up },
  { button: 'right', direction: MacroDirection.Down },
  { button: 'right', direction: MacroDirection.Up },
  { button: 'middle', direction: MacroDirection.Down },
  { button: 'middle', direction: MacroDirection.Up },
];

export function mouseButtonKeyOf(action: MacroAction): MouseButtonKey | null {
  if (action.kind !== MacroActionKind.Mouse) return null;
  if (action.keyName in MOUSE_BUTTON_VALUES) return action.keyName as MouseButtonKey;
  const legacy = LEGACY_MOUSE_KEY_NAMES[action.keyName];
  if (legacy) return legacy;
  const byValue = (Object.keys(MOUSE_BUTTON_VALUES) as MouseButtonKey[]).find(
    (key) => MOUSE_BUTTON_VALUES[key] === action.keyCode[0]
  );
  return byValue ?? null;
}

function normalizeMouseKeyName(action: MacroAction): MacroAction {
  const buttonKey = mouseButtonKeyOf(action);
  if (!buttonKey || action.keyName === buttonKey) return action;
  return { ...action, keyName: buttonKey };
}

// 统一存量数据形状（语言无关 keyName + 首动作时间戳归零），加载与脏检查两侧共用
export function toComparableActions(actions: MacroAction[]): MacroAction[] {
  return normalizeMacroTimestamps(actions.map(normalizeMouseKeyName));
}

export function toEditorActions(actions: MacroAction[]): EditorAction[] {
  return toComparableActions(actions).map((action) => ({ ...action, id: crypto.randomUUID() }));
}

export function stripEditorIds(actions: EditorAction[]): MacroAction[] {
  return actions.map(({ id, ...action }) => action);
}
