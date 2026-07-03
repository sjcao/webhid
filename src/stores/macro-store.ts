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

function migrateLegacyMacros(): SavedMacro[] {
  const existing = readJson<SavedMacro[]>(MACRO_STORAGE_KEY, []);
  if (existing.length) return existing;

  const legacy = readJson<Array<{ looperType: number; looperTimes: number; actions: Array<{
    keyName: string;
    type: number;
    keyCode: number[];
    action: number;
    timeStamp: number;
  }> }>>(LEGACY_MACRO_STORAGE_KEY, []);

  if (!legacy.length) return [];
  const migrated = legacy.map((macro, index) => ({
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
  writeJson(MACRO_STORAGE_KEY, migrated);
  return migrated;
}

function persistMacros(macros: SavedMacro[]) {
  writeJson(MACRO_STORAGE_KEY, macros);
}

type MacroState = {
  macros: SavedMacro[];
  loadMacros: () => void;
  saveMacro: (macro: Omit<SavedMacro, 'id' | 'createdAt'>) => SavedMacro;
  deleteMacro: (id: string) => void;
};

export const useMacroStore = create<MacroState>((set, get) => ({
  macros: migrateLegacyMacros(),
  loadMacros: () => set({ macros: migrateLegacyMacros() }),
  saveMacro: (macro) => {
    const saved: SavedMacro = { ...macro, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const macros = [...get().macros, saved];
    persistMacros(macros);
    set({ macros });
    return saved;
  },
  deleteMacro: (id) => {
    const macros = get().macros.filter((macro) => macro.id !== id);
    persistMacros(macros);
    set({ macros });
  },
}));

export function keyboardEventToMacroAction(event: KeyboardEvent, direction: MacroDirection, startedAt: number): MacroAction | null {
  const keyCode = browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()];
  if (!keyCode) return null;
  return {
    keyName: event.key === ' ' ? 'Space' : event.key,
    kind: MacroActionKind.Keyboard,
    direction,
    keyCode,
    timestamp: Date.now() - startedAt,
  };
}

export function getMacroDelay(index: number, actions: MacroAction[]) {
  if (index >= actions.length - 1) return 0;
  return Math.min(Math.max(actions[index + 1].timestamp - actions[index].timestamp, 0), 65535);
}
