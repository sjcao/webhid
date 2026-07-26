import { describe, expect, it } from 'vitest';
import { MacroActionKind, MacroDirection, type MacroAction } from '@/stores/macro-store';
import { normalizeMacroTimestamps, reorderMacroActions } from './macro-actions';

function action(keyName: string, timestamp: number): MacroAction {
  return {
    keyName,
    timestamp,
    kind: MacroActionKind.Keyboard,
    direction: MacroDirection.Down,
    keyCode: [1],
  };
}

describe('reorderMacroActions', () => {
  it('preserves per-action delays and produces monotonic timestamps', () => {
    const result = reorderMacroActions([
      action('A', 100),
      action('B', 250),
      action('C', 400),
    ], 2, 0);

    expect(result.map((item) => item.keyName)).toEqual(['C', 'A', 'B']);
    expect(result.map((item) => item.timestamp)).toEqual([150, 250, 400]);
    expect(result.every((item, index) => index === 0 || item.timestamp >= result[index - 1].timestamp)).toBe(true);
  });

  it('returns the original collection for invalid moves', () => {
    const actions = [action('A', 100)];
    expect(reorderMacroActions(actions, 0, 1)).toBe(actions);
    expect(reorderMacroActions(actions, 0, 0)).toBe(actions);
  });

  it('preserves extra properties such as editor ids', () => {
    const actions = [
      { ...action('A', 100), id: 'a' },
      { ...action('B', 250), id: 'b' },
    ];
    const result = reorderMacroActions(actions, 1, 0);
    expect(result.map((item) => item.id)).toEqual(['b', 'a']);
  });
});

describe('normalizeMacroTimestamps', () => {
  it('shifts all timestamps so the first action starts at zero', () => {
    const result = normalizeMacroTimestamps([
      action('A', 3000),
      action('B', 3150),
      action('C', 3400),
    ]);

    expect(result.map((item) => item.timestamp)).toEqual([0, 150, 400]);
  });

  it('returns the original collection when already normalized or empty', () => {
    const actions = [action('A', 0), action('B', 100)];
    expect(normalizeMacroTimestamps(actions)).toBe(actions);
    const empty: MacroAction[] = [];
    expect(normalizeMacroTimestamps(empty)).toBe(empty);
  });
});
