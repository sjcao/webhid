export enum CommandType {
  Read = 0x80,
  Write = 0x81,
}

export enum ParamType {
  Dpi = 0x90,
  Button = 0x91,
  Profile = 0x92,
  Reset = 0x93,
  Version = 0xf0,
  WorkMode = 0xf1,
  None = 0x00,
}

export enum ButtonId {
  Left = 0,
  Right = 1,
  Middle = 2,
  Forward = 3,
  Backward = 4,
  Dpi = 5,
}

export enum KeyFunctionType {
  Default = 0,
  Mouse = 1,
  ProfileChange = 2,
  DpiAction = 3,
  Wheel = 4,
  Multimedia = 5,
  Alphanumeric = 6,
  FunctionKey = 7,
  Numpad = 8,
  ControlKey = 9,
  BurstFire = 10,
  ComboKey = 11,
  Macro = 12,
}

export enum MacroRepeatType {
  Hold = 0xf0,
  UntilAssignedKey = 0xf1,
  UntilAnyKey = 0xf2,
  LoopTimes = 0xf4,
}

export enum MacroButtonType {
  KeyUp = 0,
  MouseDown = 1,
  KeyboardDown = 2,
}

export enum WorkMode {
  Wired = 0,
  Wireless = 1,
  Bluetooth = 2,
}

export type MouseCommand = Uint8Array;

export type ParsedMouseResponse =
  | { type: ParamType.Dpi; dpi: number }
  | { type: ParamType.Button; buttonId: ButtonId; functionType: KeyFunctionType; index: number; values: number[] }
  | { type: ParamType.Profile; profile: number }
  | { type: ParamType.Version; deviceType: 'mouse' | 'receiver'; version: string }
  | { type: ParamType.WorkMode; mode: WorkMode }
  | { type: ParamType.None; rawData: number[] };

export type ButtonMappingPayload = {
  buttonId: ButtonId;
  functionType: KeyFunctionType;
  index: number;
  values: number[];
};
