import { describe, expect, it } from 'vitest';
import { MacroButtonType } from '@/protocol/mouse';
import { MacroActionKind, MacroDirection, type MacroAction } from './macro-store';
import { macroButtonTypeForAction } from './mouse-store';

function action(kind: MacroActionKind, direction: MacroDirection): MacroAction {
  return { keyName: 'Test', kind, direction, keyCode: [1], timestamp: 0 };
}

describe('macroButtonTypeForAction', () => {
  it('uses the existing mouse-down type for mouse actions', () => {
    expect(macroButtonTypeForAction(action(MacroActionKind.Mouse, MacroDirection.Down))).toBe(MacroButtonType.MouseDown);
  });

  it('keeps keyboard down and generic key-up encoding', () => {
    expect(macroButtonTypeForAction(action(MacroActionKind.Keyboard, MacroDirection.Down))).toBe(MacroButtonType.KeyboardDown);
    expect(macroButtonTypeForAction(action(MacroActionKind.Mouse, MacroDirection.Up))).toBe(MacroButtonType.KeyUp);
  });
});
