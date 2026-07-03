import { beforeEach, describe, expect, it } from 'vitest';
import { MacroActionKind, MacroDirection, useMacroStore } from './macro-store';
import { MacroRepeatType } from '@/protocol/mouse';

describe('macro store', () => {
  beforeEach(() => {
    localStorage.clear();
    useMacroStore.setState({ macros: [] });
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
    expect(localStorage.getItem('mouse-hid.macros.v1')).toContain('Tap');

    useMacroStore.getState().deleteMacro(saved.id);
    expect(useMacroStore.getState().macros).toHaveLength(0);
  });
});
