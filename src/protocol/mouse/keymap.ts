import { ButtonId, KeyFunctionType } from './types';

export type KeyOption = {
  id: string;
  label: string;
  labelZh: string;
  functionType: KeyFunctionType;
  index: number;
  values: number[];
};

export const mouseButtons = [
  { id: ButtonId.Left, label: 'Left', labelZh: '左键' },
  { id: ButtonId.Right, label: 'Right', labelZh: '右键' },
  { id: ButtonId.Middle, label: 'Middle', labelZh: '中键' },
  { id: ButtonId.Forward, label: 'Forward', labelZh: '前进键' },
  { id: ButtonId.Backward, label: 'Backward', labelZh: '后退键' },
  { id: ButtonId.Dpi, label: 'DPI', labelZh: 'DPI键' },
] as const;

const keyboardCodes: Array<[string, string, number]> = [
  ['Q', 'Q', 0x14], ['W', 'W', 0x1a], ['E', 'E', 0x08], ['R', 'R', 0x15],
  ['T', 'T', 0x17], ['Y', 'Y', 0x1c], ['U', 'U', 0x18], ['I', 'I', 0x0c],
  ['O', 'O', 0x12], ['P', 'P', 0x13], ['A', 'A', 0x04], ['S', 'S', 0x16],
  ['D', 'D', 0x07], ['F', 'F', 0x09], ['G', 'G', 0x0a], ['H', 'H', 0x0b],
  ['J', 'J', 0x0d], ['K', 'K', 0x0e], ['L', 'L', 0x0f], ['Z', 'Z', 0x1d],
  ['X', 'X', 0x1b], ['C', 'C', 0x06], ['V', 'V', 0x19], ['B', 'B', 0x05],
  ['N', 'N', 0x11], ['M', 'M', 0x10], ['1', '1', 0x1e], ['2', '2', 0x1f],
  ['3', '3', 0x20], ['4', '4', 0x21], ['5', '5', 0x22], ['6', '6', 0x23],
  ['7', '7', 0x24], ['8', '8', 0x25], ['9', '9', 0x26], ['0', '0', 0x27],
];

const controlCodes: Array<[string, string, number]> = [
  ['Esc', 'Esc', 0x29], ['Tab', 'Tab', 0x2b], ['Backspace', 'Back Space', 0x2a],
  ['Enter', 'Enter', 0x28], ['Space', 'Space', 0x2c], ['Left Win', 'Left Win', 0xe3],
  ['Right Win', 'Right Win', 0xe7], ['Left Ctrl', 'Left Ctrl', 0xe0], ['Right Ctrl', 'Right Ctrl', 0xe4],
  ['Left Alt', 'Left Alt', 0xe2], ['Right Alt', 'Right Alt', 0xe6], ['Left Shift', 'Left Shift', 0xe1],
  ['Right Shift', 'Right Shift', 0xe5], ['Up', 'Up', 0x52], ['Left', 'Left', 0x50],
  ['Down', 'Down', 0x51], ['Right', 'Right', 0x4f], ['Print Screen', 'Print Screen', 0x46],
  ['Scroll Lock', 'Scroll Lock', 0x47], ['Pause', 'Pause', 0x48], ['Insert', 'Insert', 0x49],
  ['Home', 'Home', 0x4a], ['Delete', 'Delete', 0x4c], ['End', 'End', 0x4d],
  ['Page Up', 'Page Up', 0x4b], ['Page Down', 'Page Down', 0x4e], ['Caps Lock', 'Caps Lock', 0x53],
  ['Num Lock', 'Num Lock', 0x54],
];

const numpadCodes: Array<[string, string, number]> = [
  ['/', '/', 0x54], ['*', '*', 0x55], ['-', '-', 0x56], ['+', '+', 0x57],
  ['Enter', 'Enter', 0x58], ['1', '1', 0x59], ['2', '2', 0x5a], ['3', '3', 0x5b],
  ['4', '4', 0x5c], ['5', '5', 0x5d], ['6', '6', 0x5e], ['7', '7', 0x5f],
  ['8', '8', 0x60], ['9', '9', 0x61], ['0', '0', 0x62], ['.', '.', 0x63],
];

const punctuationCodes: Array<[string, string, number]> = [
  ['`', '~`', 0x35], ['-', '_-', 0x2d], ['=', '+=', 0x2e], ['[', '{[', 0x2f],
  [']', ']}', 0x30], ['\\', '|\\', 0x31], [';', ':;', 0x32], ["'", '"\'', 0x34],
  [',', '<,', 0x36], ['.', '>.', 0x37], ['/', '?/', 0x38],
];

export const keyGroups: Array<{ id: string; label: string; labelZh: string; options: KeyOption[] }> = [
  {
    id: 'default',
    label: 'Default',
    labelZh: '默认',
    options: [
      {
        id: 'default',
        label: 'Default Button',
        labelZh: '默认按键',
        functionType: KeyFunctionType.Default,
        index: 0,
        values: [],
      },
    ],
  },
  {
    id: 'mouse',
    label: 'Mouse',
    labelZh: '鼠标按键',
    options: [
      ['Disable', '禁用', 0],
      ['Left Click', '左键', 1],
      ['Right Click', '右键', 2],
      ['Middle Click', '中键', 3],
      ['Back', '后退', 4],
      ['Forward', '前进', 5],
    ].map(([label, labelZh, index]) => ({
      id: `mouse-${index}`,
      label: String(label),
      labelZh: String(labelZh),
      functionType: KeyFunctionType.Mouse,
      index: Number(index),
      values: [],
    })),
  },
  {
    id: 'profile',
    label: 'Profile',
    labelZh: '板载配置',
    options: [0, 1, 2, 3].map((index) => ({
      id: `profile-${index}`,
      label: `Profile ${index + 1}`,
      labelZh: `配置文件 ${index + 1}`,
      functionType: KeyFunctionType.ProfileChange,
      index,
      values: [],
    })),
  },
  {
    id: 'dpi',
    label: 'DPI',
    labelZh: 'DPI 切换',
    options: ['DPI Cycle', 'DPI+', 'DPI-'].map((label, index) => ({
      id: `dpi-${index}`,
      label,
      labelZh: ['DPI 循环', 'DPI+', 'DPI-'][index],
      functionType: KeyFunctionType.DpiAction,
      index,
      values: [],
    })),
  },
  {
    id: 'wheel',
    label: 'Wheel',
    labelZh: '鼠标滚轮',
    options: ['Wheel Left', 'Wheel Right', 'Wheel Up', 'Wheel Down'].map((label, index) => ({
      id: `wheel-${index}`,
      label,
      labelZh: ['左滚', '右滚', '上滚', '下滚'][index],
      functionType: KeyFunctionType.Wheel,
      index,
      values: [],
    })),
  },
  {
    id: 'keyboard',
    label: 'Keyboard',
    labelZh: '字母数字',
    options: keyboardCodes.map(([label, labelZh, code], index) => ({
      id: `key-${label}`,
      label,
      labelZh,
      functionType: KeyFunctionType.Alphanumeric,
      index,
      values: [code, 0x00],
    })),
  },
  {
    id: 'function',
    label: 'Function',
    labelZh: 'F区功能键',
    options: Array.from({ length: 12 }, (_, index) => ({
      id: `f-${index + 1}`,
      label: `F${index + 1}`,
      labelZh: `F${index + 1}`,
      functionType: KeyFunctionType.FunctionKey,
      index,
      values: [0x3a + index, 0x00],
    })),
  },
  {
    id: 'numpad',
    label: 'Numpad',
    labelZh: '数字小键盘',
    options: numpadCodes.map(([label, labelZh, code], index) => ({
      id: `num-${label}-${index}`,
      label,
      labelZh,
      functionType: KeyFunctionType.Numpad,
      index,
      values: [code, 0x00],
    })),
  },
  {
    id: 'control',
    label: 'Control',
    labelZh: '控制键与字符键',
    options: [...punctuationCodes, ...controlCodes].map(([label, labelZh, code], index) => ({
      id: `control-${label}-${index}`,
      label,
      labelZh,
      functionType: KeyFunctionType.ControlKey,
      index,
      values: [code, 0x00],
    })),
  },
  {
    id: 'media',
    label: 'Media',
    labelZh: '多媒体',
    options: [
      ['Brightness+', '亮度+', [0x6f, 0x00]],
      ['Brightness-', '亮度-', [0x70, 0x00]],
      ['Player', '播放器', [0x83, 0x01]],
      ['Stop', '停止播放', [0xb7, 0x00]],
      ['Play/Pause', '播放/暂停', [0xcd, 0x00]],
      ['Previous', '上一首', [0xb6, 0x00]],
      ['Next', '下一首', [0xb5, 0x00]],
      ['Mute', '静音', [0xe2, 0x00]],
      ['Volume+', '音量+', [0xe9, 0x00]],
      ['Volume-', '音量-', [0xea, 0x00]],
      ['Mail', '邮件', [0x8a, 0x01]],
      ['Home', '主页', [0x23, 0x02]],
      ['Search', '搜索', [0x21, 0x02]],
      ['Refresh', '刷新', [0x27, 0x02]],
      ['Favorites', '收藏夹', [0x2a, 0x02]],
      ['Web Stop', '网页停止', [0x26, 0x02]],
      ['Web Forward', '网页前进', [0x25, 0x02]],
      ['Web Back', '网页后退', [0x24, 0x02]],
      ['Calculator', '计算器', [0x92, 0x01]],
      ['Computer', '我的电脑', [0x94, 0x01]],
    ].map(([label, labelZh, values], index) => ({
      id: `media-${index}`,
      label: String(label),
      labelZh: String(labelZh),
      functionType: KeyFunctionType.Multimedia,
      index,
      values: values as number[],
    })),
  },
  {
    id: 'burst',
    label: 'Burst Fire',
    labelZh: '火力键',
    options: [
      { label: '3 clicks / 8ms', labelZh: '3次 / 8ms', interval: 8, count: 3 },
      { label: '5 clicks / 16ms', labelZh: '5次 / 16ms', interval: 16, count: 5 },
      { label: '10 clicks / 20ms', labelZh: '10次 / 20ms', interval: 20, count: 10 },
    ].map((item, index) => ({
      id: `burst-${index}`,
      label: item.label,
      labelZh: item.labelZh,
      functionType: KeyFunctionType.BurstFire,
      index: 0,
      values: [item.interval, item.count],
    })),
  },
];

export const browserKeyToHid: Record<string, number[]> = Object.fromEntries([
  ...keyboardCodes.map(([label, , code]) => [label.toLowerCase(), [code, 0x00]]),
  ...controlCodes.map(([label, , code]) => [label, [code, 0x00]]),
  ...controlCodes.map(([label, , code]) => [label.toLowerCase(), [code, 0x00]]),
  ...punctuationCodes.map(([label, , code]) => [label, [code, 0x00]]),
  ['Enter', [0x28, 0x00]],
  ['Escape', [0x29, 0x00]],
  ['Backspace', [0x2a, 0x00]],
  ['Tab', [0x2b, 0x00]],
  [' ', [0x2c, 0x00]],
  ['Space', [0x2c, 0x00]],
  ['ArrowUp', [0x52, 0x00]],
  ['ArrowLeft', [0x50, 0x00]],
  ['ArrowDown', [0x51, 0x00]],
  ['ArrowRight', [0x4f, 0x00]],
  ['Control', [0xe0, 0x00]],
  ['Shift', [0xe1, 0x00]],
  ['Alt', [0xe2, 0x00]],
  ['Meta', [0xe3, 0x00]],
  ['ctrl', [0xe0, 0x00]],
  ['shift', [0xe1, 0x00]],
  ['alt', [0xe2, 0x00]],
  ['meta', [0xe3, 0x00]],
]);

export function findKeyOption(functionType: KeyFunctionType, index: number, values: number[] = []) {
  for (const group of keyGroups) {
    const option = group.options.find((item) => {
      if (item.functionType !== functionType || item.index !== index) return false;
      if (item.values.length !== values.length) return item.values.length === 0;
      return item.values.every((value, valueIndex) => value === values[valueIndex]);
    });
    if (option) return option;
  }
  return null;
}
