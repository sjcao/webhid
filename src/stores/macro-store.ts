import { create } from 'zustand';
import { readJson, writeJson } from '@/lib/storage';
import { browserKeyToHid, MacroRepeatType } from '@/protocol/mouse';

const MACRO_STORAGE_KEY = 'mouse-hid.macros.v1';
const LEGACY_MACRO_STORAGE_KEY = 'actionsList';

export enum MacroActionKind {
  Keyboard = 'keyboard',
  Mouse = 'mouse',
}

export enum MacroDirection {
  Down = 'down',
  Up = 'up',
}

export type MacroAction = {
  keyName: string;
  kind: MacroActionKind;
  direction: MacroDirection;
  keyCode: number[];
  timestamp: number;
};

export type SavedMacro = {
  id: string;
  name: string;
  repeatType: MacroRepeatType;
  loopTimes: number;
  actions: MacroAction[];
  createdAt: string;
};

type LegacyMacro = {
  looperType: number;
  looperTimes: number;
  actions: Array<{
    keyName: string;
    type: number;
    keyCode: number[];
    action: number;
    timeStamp: number;
  }>;
};

const REPEAT_TYPES = new Set<number>([
  MacroRepeatType.Hold,
  MacroRepeatType.UntilAssignedKey,
  MacroRepeatType.UntilAnyKey,
  MacroRepeatType.LoopTimes,
]);
const MOUSE_ACTION_VALUES: Record<string, number> = {
  left: 0,
  right: 1,
  middle: 2,
  '左键按下': 0,
  '左键抬起': 0,
  '右键按下': 1,
  '右键抬起': 1,
  '中键按下': 2,
  '中键抬起': 2,
};

export function normalizeLoopTimes(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  const normalized = Math.min(255, Math.max(1, Math.round(value)));
  // F0-F2 are protocol mode sentinels, so those three byte values cannot represent loop counts.
  return normalized >= MacroRepeatType.Hold && normalized <= MacroRepeatType.UntilAnyKey
    ? MacroRepeatType.Hold - 1
    : normalized;
}

function normalizeRepeatType(value: unknown) {
  return typeof value === 'number' && REPEAT_TYPES.has(value)
    ? value as MacroRepeatType
    : MacroRepeatType.LoopTimes;
}

function normalizeAction(value: unknown): MacroAction | null {
  if (!value || typeof value !== 'object') return null;
  const action = value as Partial<MacroAction>;
  if (typeof action.keyName !== 'string') return null;
  if (action.kind !== MacroActionKind.Keyboard && action.kind !== MacroActionKind.Mouse) return null;
  if (action.direction !== MacroDirection.Down && action.direction !== MacroDirection.Up) return null;
  if (!Array.isArray(action.keyCode) || action.keyCode.length === 0 || action.keyCode.length > 2) return null;
  if (!action.keyCode.every((code) => Number.isInteger(code) && code >= 0 && code <= 0xff)) return null;
  // 旧版普通键使用 [usage, 0]；宏协议的 Value 只有 1 字节，非零的第二字节无法安全表达。
  if (action.keyCode.length === 2 && action.keyCode[1] !== 0) return null;
  const namedMouseValue = action.kind === MacroActionKind.Mouse ? MOUSE_ACTION_VALUES[action.keyName] : undefined;
  if (action.kind === MacroActionKind.Mouse && namedMouseValue === undefined && action.keyCode[0] > 2) return null;
  if (typeof action.timestamp !== 'number' || !Number.isFinite(action.timestamp)) return null;
  return {
    keyName: action.keyName,
    kind: action.kind,
    direction: action.direction,
    keyCode: [namedMouseValue ?? action.keyCode[0]],
    timestamp: Math.max(0, Math.round(action.timestamp)),
  };
}

function normalizeSavedMacro(value: unknown): SavedMacro | null {
  if (!value || typeof value !== 'object') return null;
  const macro = value as Partial<SavedMacro>;
  if (typeof macro.id !== 'string' || !macro.id) return null;
  if (typeof macro.name !== 'string' || !Array.isArray(macro.actions)) return null;
  const actions = macro.actions.map(normalizeAction).filter((action): action is MacroAction => action !== null);
  return {
    id: macro.id,
    name: macro.name,
    repeatType: normalizeRepeatType(macro.repeatType),
    loopTimes: normalizeLoopTimes(macro.loopTimes),
    actions,
    createdAt: typeof macro.createdAt === 'string' ? macro.createdAt : new Date().toISOString(),
  };
}

function normalizeSavedMacros(value: unknown): SavedMacro[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value
    .map(normalizeSavedMacro)
    .filter((macro): macro is SavedMacro => {
      if (!macro || ids.has(macro.id)) return false;
      ids.add(macro.id);
      return true;
    });
}

function migrateLegacyMacros(): SavedMacro[] {
  try {
    if (localStorage.getItem(MACRO_STORAGE_KEY) !== null) {
      const existing = readJson<unknown>(MACRO_STORAGE_KEY, []);
      return normalizeSavedMacros(existing);
    }

    const legacy = readJson<unknown>(LEGACY_MACRO_STORAGE_KEY, []);
    if (!Array.isArray(legacy) || !legacy.length) return [];
    const migrated = legacy
      .filter((macro): macro is LegacyMacro => Boolean(macro) && Array.isArray((macro as LegacyMacro).actions))
      .map((macro, index) => ({
        id: crypto.randomUUID(),
        name: `Legacy Macro ${index + 1}`,
        repeatType: normalizeRepeatType(macro.looperType),
        loopTimes: normalizeLoopTimes(macro.looperTimes),
        createdAt: new Date().toISOString(),
        actions: macro.actions.map((action) => ({
          keyName: action.keyName,
          kind: action.type === 1 ? MacroActionKind.Mouse : MacroActionKind.Keyboard,
          direction: action.action === 0 ? MacroDirection.Down : MacroDirection.Up,
          keyCode: action.keyCode,
          timestamp: action.timeStamp,
        })).map(normalizeAction).filter((action): action is MacroAction => action !== null),
      }));
    if (writeJson(MACRO_STORAGE_KEY, migrated)) {
      localStorage.removeItem(LEGACY_MACRO_STORAGE_KEY);
    }
    return migrated;
  } catch {
    return [];
  }
}

function persistMacros(macros: SavedMacro[]) {
  writeJson(MACRO_STORAGE_KEY, macros);
}

type MacroState = {
  macros: SavedMacro[];
  saveMacro: (macro: Omit<SavedMacro, 'id' | 'createdAt'>) => SavedMacro;
  deleteMacro: (id: string) => void;
  updateMacro: (id: string, updates: Partial<Omit<SavedMacro, 'id' | 'createdAt'>>) => void;
  duplicateMacro: (id: string, suffix?: string) => void;
};

export const useMacroStore = create<MacroState>((set, get) => ({
  macros: migrateLegacyMacros(),
  saveMacro: (macro) => {
    const saved: SavedMacro = {
      ...macro,
      repeatType: normalizeRepeatType(macro.repeatType),
      loopTimes: normalizeLoopTimes(macro.loopTimes),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const macros = [...get().macros, saved];
    set({ macros });
    persistMacros(macros);
    return saved;
  },
  deleteMacro: (id) => {
    const macros = get().macros.filter((macro) => macro.id !== id);
    set({ macros });
    persistMacros(macros);
  },
  updateMacro: (id, updates) => {
    const macros = get().macros.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          ...updates,
          ...(updates.repeatType !== undefined ? { repeatType: normalizeRepeatType(updates.repeatType) } : {}),
          ...(updates.loopTimes !== undefined ? { loopTimes: normalizeLoopTimes(updates.loopTimes) } : {}),
          actions: updates.actions ? [...updates.actions] : m.actions,
        };
      }
      return m;
    });
    set({ macros });
    persistMacros(macros);
  },
  duplicateMacro: (id, suffix) => {
    const target = get().macros.find((m) => m.id === id);
    if (!target) return;
    const copySuffix = suffix !== undefined ? suffix : '副本';
    const duplicated: SavedMacro = {
      ...target,
      id: crypto.randomUUID(),
      name: `${target.name} ${copySuffix}`.trim(),
      createdAt: new Date().toISOString(),
      actions: target.actions.map((act) => ({ ...act })),
    };
    const macros = [...get().macros, duplicated];
    set({ macros });
    persistMacros(macros);
  },
}));

export function keyboardEventToMacroAction(event: KeyboardEvent, direction: MacroDirection, timestamp: number): MacroAction | null {
  // 优先按 event.code 查表，以区分左右修饰键（event.key 对左右修饰键返回相同值）
  const keyCode = browserKeyToHid[event.code] ?? browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()];
  if (!keyCode) return null;
  return {
    keyName: event.key === ' ' ? 'Space' : event.key,
    kind: MacroActionKind.Keyboard,
    direction,
    keyCode,
    timestamp,
  };
}

export function getMacroDelay(index: number, actions: MacroAction[]) {
  if (index >= actions.length - 1) return 0;
  const delay = actions[index + 1].timestamp - actions[index].timestamp;
  if (!Number.isFinite(delay)) return 0;
  return Math.min(Math.max(Math.round(delay), 0), 65535);
}
