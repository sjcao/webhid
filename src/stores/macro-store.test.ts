import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMacroDelay,
  keyboardEventToMacroAction,
  MacroActionKind,
  MacroDirection,
  useMacroStore,
  type MacroAction,
} from './macro-store';
import { MacroRepeatType } from '@/protocol/mouse';

const STORAGE_KEY = 'mouse-hid.macros.v1';
const LEGACY_KEY = 'actionsList';

async function importFreshStore() {
  vi.resetModules();
  return import('./macro-store');
}

describe('macro store', () => {
  beforeEach(() => {
    localStorage.clear();
    useMacroStore.setState({ macros: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves and deletes macros through the v1 storage key', () => {
    const saved = useMacroStore.getState().saveMacro({
      name: 'Tap',
      loopTimes: 1,
      repeatType: MacroRepeatType.LoopTimes,
      actions: [{
        keyName: 'A',
        kind: MacroActionKind.Keyboard,
        direction: MacroDirection.Down,
        keyCode: [0x04, 0x00],
        timestamp: 0,
      }],
    });

    expect(useMacroStore.getState().macros).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Tap');

    useMacroStore.getState().deleteMacro(saved.id);
    expect(useMacroStore.getState().macros).toHaveLength(0);
  });

  it('keeps in-memory state when persistence fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const saved = useMacroStore.getState().saveMacro({
      name: 'Volatile',
      loopTimes: 1,
      repeatType: MacroRepeatType.LoopTimes,
      actions: [],
    });

    expect(useMacroStore.getState().macros.some((m) => m.id === saved.id)).toBe(true);

    useMacroStore.getState().deleteMacro(saved.id);
    expect(useMacroStore.getState().macros).toHaveLength(0);
  });
});

describe('legacy macro migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates legacy macros and removes the legacy key', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{
      looperType: 1,
      looperTimes: 2,
      actions: [{ keyName: 'A', type: 0, keyCode: [0x04, 0x00], action: 0, timeStamp: 10 }],
    }]));

    const fresh = await importFreshStore();
    const macros = fresh.useMacroStore.getState().macros;

    expect(macros).toHaveLength(1);
    expect(macros[0].name).toBe('Legacy Macro 1');
    expect(macros[0].loopTimes).toBe(2);
    expect(macros[0].actions[0]).toMatchObject({
      keyName: 'A',
      kind: 'keyboard',
      direction: 'down',
      keyCode: [0x04, 0x00],
      timestamp: 10,
    });
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Legacy Macro 1');
  });

  it('does not resurrect legacy macros when the v1 key holds an empty array', async () => {
    localStorage.setItem(STORAGE_KEY, '[]');
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{
      looperType: 1,
      looperTimes: 1,
      actions: [],
    }]));

    const fresh = await importFreshStore();

    expect(fresh.useMacroStore.getState().macros).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('returns an empty list when the v1 key holds a non-array value', async () => {
    localStorage.setItem(STORAGE_KEY, '{"not":"an array"}');

    const fresh = await importFreshStore();

    expect(fresh.useMacroStore.getState().macros).toEqual([]);
  });

  it('drops shape-invalid entries without throwing', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      { looperType: 1 },
      null,
      {
        looperType: 1,
        looperTimes: 1,
        actions: [{ keyName: 'B', type: 0, keyCode: [0x05, 0x00], action: 1, timeStamp: 5 }],
      },
    ]));

    const fresh = await importFreshStore();
    const macros = fresh.useMacroStore.getState().macros;

    expect(macros).toHaveLength(1);
    expect(macros[0].actions[0]).toMatchObject({ keyName: 'B', direction: 'up' });
  });

  it('filters shape-invalid v1 entries instead of crashing', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 'broken', name: 'No actions' },
      {
        id: 'ok',
        name: 'Valid',
        repeatType: MacroRepeatType.LoopTimes,
        loopTimes: 1,
        actions: [],
        createdAt: new Date().toISOString(),
      },
    ]));

    const fresh = await importFreshStore();
    const macros = fresh.useMacroStore.getState().macros;

    expect(macros).toHaveLength(1);
    expect(macros[0].id).toBe('ok');
  });

  it('keeps deletions after reload once migration has run', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      { looperType: 1, looperTimes: 1, actions: [] },
      { looperType: 1, looperTimes: 2, actions: [] },
    ]));

    const first = await importFreshStore();
    const [macroA] = first.useMacroStore.getState().macros;
    first.useMacroStore.getState().deleteMacro(macroA.id);

    const second = await importFreshStore();
    const macros = second.useMacroStore.getState().macros;

    expect(macros).toHaveLength(1);
    expect(macros[0].name).toBe('Legacy Macro 2');
  });

  it('yields an empty list for malformed legacy JSON instead of throwing', async () => {
    localStorage.setItem(LEGACY_KEY, '{oops');

    const fresh = await importFreshStore();

    expect(fresh.useMacroStore.getState().macros).toEqual([]);
  });

  it('yields an empty list when the legacy key holds a non-array value', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ looperType: 1, looperTimes: 1, actions: [] }));

    const fresh = await importFreshStore();

    expect(fresh.useMacroStore.getState().macros).toEqual([]);
  });
});

describe('macro editing', () => {
  beforeEach(() => {
    localStorage.clear();
    useMacroStore.setState({ macros: [] });
  });

  function seedMacro(name: string) {
    return useMacroStore.getState().saveMacro({
      name,
      loopTimes: 1,
      repeatType: MacroRepeatType.LoopTimes,
      actions: [{
        keyName: 'A',
        kind: MacroActionKind.Keyboard,
        direction: MacroDirection.Down,
        keyCode: [0x04, 0x00],
        timestamp: 0,
      }],
    });
  }

  it('updateMacro merges partial updates and clones the provided actions array', () => {
    const target = seedMacro('Original');
    const other = seedMacro('Other');
    const nextActions = [{
      keyName: 'B',
      kind: MacroActionKind.Keyboard,
      direction: MacroDirection.Up,
      keyCode: [0x05, 0x00],
      timestamp: 40,
    }];

    useMacroStore.getState().updateMacro(target.id, { name: 'Renamed', loopTimes: 4, actions: nextActions });

    const macros = useMacroStore.getState().macros;
    const updated = macros.find((m) => m.id === target.id);
    expect(updated).toMatchObject({ name: 'Renamed', loopTimes: 4, createdAt: target.createdAt });
    expect(updated?.actions).toEqual(nextActions);
    expect(updated?.actions).not.toBe(nextActions);
    expect(macros.find((m) => m.id === other.id)?.name).toBe('Other');
  });

  it('updateMacro keeps the existing actions when the update omits them', () => {
    const target = seedMacro('KeepActions');

    useMacroStore.getState().updateMacro(target.id, { name: 'Renamed' });

    const updated = useMacroStore.getState().macros.find((m) => m.id === target.id);
    expect(updated?.actions).toEqual(target.actions);
  });

  it('updateMacro leaves the list unchanged for unknown ids', () => {
    seedMacro('Stable');
    const before = useMacroStore.getState().macros;

    useMacroStore.getState().updateMacro('missing-id', { name: 'Nope' });

    expect(useMacroStore.getState().macros).toEqual(before);
  });

  it('duplicateMacro appends a deep copy with the provided suffix', () => {
    const target = seedMacro('Combo');

    useMacroStore.getState().duplicateMacro(target.id, '(Copy)');

    const macros = useMacroStore.getState().macros;
    expect(macros).toHaveLength(2);
    const copy = macros[1];
    expect(copy.name).toBe('Combo (Copy)');
    expect(copy.id).not.toBe(target.id);
    expect(copy.actions).toEqual(target.actions);
    expect(copy.actions[0]).not.toBe(macros[0].actions[0]);
  });

  it('duplicateMacro falls back to the default suffix and ignores unknown ids', () => {
    const target = seedMacro('Solo');

    useMacroStore.getState().duplicateMacro('missing-id');
    expect(useMacroStore.getState().macros).toHaveLength(1);

    useMacroStore.getState().duplicateMacro(target.id);
    const macros = useMacroStore.getState().macros;
    expect(macros).toHaveLength(2);
    expect(macros[1].name).toBe('Solo 副本');
  });
});

describe('getMacroDelay', () => {
  function actionsAt(...timestamps: number[]): MacroAction[] {
    return timestamps.map((timestamp) => ({
      keyName: 'A',
      kind: MacroActionKind.Keyboard,
      direction: MacroDirection.Down,
      keyCode: [0x04, 0x00],
      timestamp,
    }));
  }

  it('returns the gap to the next action', () => {
    expect(getMacroDelay(0, actionsAt(100, 350))).toBe(250);
  });

  it('clamps negative gaps to zero', () => {
    expect(getMacroDelay(0, actionsAt(500, 200))).toBe(0);
  });

  it('clamps oversized gaps to 65535', () => {
    expect(getMacroDelay(0, actionsAt(0, 65535))).toBe(65535);
    expect(getMacroDelay(0, actionsAt(0, 65536))).toBe(65535);
  });

  it('returns zero for the final action and out-of-range indices', () => {
    expect(getMacroDelay(1, actionsAt(0, 100))).toBe(0);
    expect(getMacroDelay(5, actionsAt(0, 100))).toBe(0);
  });
});

describe('keyboardEventToMacroAction', () => {
  it('normalizes the space key to "Space"', () => {
    const action = keyboardEventToMacroAction(
      new KeyboardEvent('keydown', { key: ' ', code: 'Space' }),
      MacroDirection.Down,
      120,
    );

    expect(action).toMatchObject({
      keyName: 'Space',
      kind: MacroActionKind.Keyboard,
      direction: MacroDirection.Down,
      keyCode: [0x2c, 0x00],
      timestamp: 120,
    });
  });

  it('falls back to the lowercase key for shifted letters', () => {
    const action = keyboardEventToMacroAction(
      new KeyboardEvent('keydown', { key: 'A', code: 'KeyA' }),
      MacroDirection.Up,
      0,
    );

    expect(action).toMatchObject({ keyName: 'A', keyCode: [0x04, 0x00], direction: MacroDirection.Up });
  });

  it('falls back to event.code when event.key is not mapped', () => {
    const action = keyboardEventToMacroAction(
      new KeyboardEvent('keydown', { key: 'Process', code: 'Space' }),
      MacroDirection.Down,
      0,
    );

    expect(action).toMatchObject({ keyCode: [0x2c, 0x00] });
  });

  it('returns null for unmapped keys', () => {
    const action = keyboardEventToMacroAction(
      new KeyboardEvent('keydown', { key: 'Dead', code: 'Unidentified' }),
      MacroDirection.Down,
      0,
    );

    expect(action).toBeNull();
  });
});
