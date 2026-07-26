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

function migrateLegacyMacros(): SavedMacro[] {
  try {
    if (localStorage.getItem(MACRO_STORAGE_KEY) !== null) {
      const existing = readJson<unknown>(MACRO_STORAGE_KEY, []);
      if (!Array.isArray(existing)) return [];
      return existing.filter((macro): macro is SavedMacro => Boolean(macro) && Array.isArray((macro as SavedMacro).actions));
    }

    const legacy = readJson<unknown>(LEGACY_MACRO_STORAGE_KEY, []);
    if (!Array.isArray(legacy) || !legacy.length) return [];
    const migrated = legacy
      .filter((macro): macro is LegacyMacro => Boolean(macro) && Array.isArray((macro as LegacyMacro).actions))
      .map((macro, index) => ({
        id: crypto.randomUUID(),
        name: `Legacy Macro ${index + 1}`,
        repeatType: macro.looperType as MacroRepeatType,
        loopTimes: macro.looperTimes || 1,
        createdAt: new Date().toISOString(),
        actions: macro.actions.map((action) => ({
          keyName: action.keyName,
          kind: action.type === 1 ? MacroActionKind.Mouse : MacroActionKind.Keyboard,
          direction: action.action === 0 ? MacroDirection.Down : MacroDirection.Up,
          keyCode: action.keyCode,
          timestamp: action.timeStamp,
        })),
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
    const saved: SavedMacro = { ...macro, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
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
  const keyCode = browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()] ?? browserKeyToHid[event.code];
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
  return Math.min(Math.max(actions[index + 1].timestamp - actions[index].timestamp, 0), 65535);
}
