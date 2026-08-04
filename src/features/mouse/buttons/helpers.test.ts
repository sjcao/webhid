import { describe, expect, it } from 'vitest';
import { modifierLabel, parseComboValues } from './helpers';

describe('combo key helpers', () => {
  it('recognizes both left and right modifier usages', () => {
    expect(parseComboValues([0xe0, 0xe4, 0x04])).toEqual({
      modifiers: [0xe0, 0xe4],
      normalValue: 0x04,
    });
    expect(modifierLabel(0xe0)).toBe('L Ctrl');
    expect(modifierLabel(0xe4)).toBe('R Ctrl');
  });
});
