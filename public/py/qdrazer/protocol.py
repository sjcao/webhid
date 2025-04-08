import ctypes
from dataclasses import dataclass, field
from enum import Enum, Flag
import struct

class EnumProperty:
    def __init__(self, field_name, enum_type):
        self.field_name = field_name
        self.enum_type = enum_type

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return self.enum_type(getattr(instance, self.field_name))

    def __set__(self, instance, value):
        if not isinstance(value, self.enum_type):
            raise ValueError("Value must be a {} instance".format(self.enum_type.__name__))
        setattr(instance, self.field_name, value.value)

class RazerException(Exception):
    pass

class Status(Enum):
    NEW = 0
    BUSY = 1
    OK = 2
    FAIL = 3
    TIMEOUT = 4
    NOT_SUPPORTED = 5

class Profile(Enum):
    DIRECT = 0x00
    WHITE = DEFAULT = 0x01
    RED = 0x02
    GREEN = 0x03
    BLUE = 0x04
    CYAN = 0x05

class DeviceMode(Enum):
    NORMAL = 0x00
    BOOTLOADER = 0x01
    TEST = 0x02
    DRIVER = 0x03

class ScrollMode(Enum):
    TACTILE = 0
    FREESPIN = 1

class Button(Enum):
    LEFT = 0x01
    RIGHT = 0x02
    MIDDLE = 0x03
    BACKWARD = 0x04
    FORWARD = 0x05
    WHEEL_UP = 0x09
    WHEEL_DOWN = 0x0a
    BOTTOM = 0x0e
    AIM = 0x0f
    WHEEL_LEFT = 0x34
    WHEEL_RIGHT = 0x35
    MIDDLE_BACKWARD = 0x60
    MIDDLE_FORWARD = 0x6a

class Hypershift(Enum):
    OFF = 0x00
    ON = 0x01

class FnClass(Enum):
    DISABLED = 0x00
    MOUSE = 0x01
    KEYBOARD = 0x02
    MACRO_FIXED = 0x03
    MACRO_HOLD = 0x04
    MACRO_TOGGLE = 0x05
    DPI_SWITCH = 0x06
    PROFILE_SWITCH = 0x07
    SYSTEM = 0x09
    CONSUMER = 0x0a
    DOUBLE_CLICK = 0x0b
    HYPERSHIFT_TOGGLE = 0x0c
    KEYBOARD_TURBO = 0x0d
    MOUSE_TURBO = 0x0e
    MACRO_SEQUENCE = 0x0f
    SCROLL_MODE_TOGGLE = 0x12

class FnMouse(Enum):
    LEFT = 0x01
    RIGHT = 0x02
    MIDDLE = 0x03
    BACKWARD = 0x04
    FORWARD = 0x05
    WHEEL_UP = 0x09
    WHEEL_DOWN = 0x0a
    WHEEL_LEFT = 0x68
    WHEEL_RIGHT = 0x69

class FnKeyboardModifier(Flag):
    LEFT_CONTROL = 0x01
    LEFT_SHIFT = 0x02
    LEFT_ALT = 0x04
    LEFT_GUI = 0x08
    RIGHT_CONTROL = 0x10
    RIGHT_SHIFT = 0x20
    RIGHT_ALT = 0x40
    RIGHT_GUI = 0x80

class FnDpiSwitch(Enum):
    NEXT = 0x01
    PREV = 0x02
    FIXED = 0x03
    AIM = 0x05
    NEXT_LOOP = 0x06
    PREV_LOOP = 0x07

class FnProfileSwitch(Enum):
    NEXT = 0x01
    PREV = 0x02
    FIXED = 0x03
    NEXT_LOOP = 0x04
    PREV_LOOP = 0x05

class FnSystem(Flag):
    POWER_DOWN = 0x01
    SLEEP = 0x02
    WAKE_UP = 0x04

class LiftConfig(Enum):
    NONE = 0x0000
    SYM_1 = 0x0100
    SYM_2 = 0x0101
    SYM_3 = 0x0102
    ASYM_12 = 0x0200
    ASYM_13 = 0x0201
    ASYM_23 = 0x0202
    CONFIG1 = 0x0300
    CONFIG2 = 0x0400
    CALIB1 = 0x0500
    CALIB2 = 0x0600

class MacroOpClass(Enum):
    KEYBOARD_DOWN = 0x01
    KEYBOARD_UP = 0x02
    SYSTEM_A = 0x03
    SYSTEM_B = 0x04
    CONSUMER_A = 0x05
    CONSUMER_B = 0x06
    MOUSE_BUTTON = 0x08
    MOUSE_WHEEL = 0x0a
    DELAY_1 = 0x11
    DELAY_2 = 0x12

class MacroOpMouseButton(Flag):
    LEFT = 0x01
    RIGHT = 0x02
    MIDDLE = 0x04
    BACKWARD = 0x08
    FORWARD = 0x10

class LedEffect(Enum):
    OFF = DISABLED = 0x00
    STATIC = 0x01
    SPECTRUM = 0x03
    WAVE = 0x04
    CUSTOM = 0x08

class LedRegion(Enum):
    ALL = 0x00
    WHEEL = 0x01
    LOGO = 0x04
    STRIP = 0x0a

class transaction_parts(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("device", ctypes.c_uint8, 3),
        ("id", ctypes.c_uint8, 5),
    ]

class transaction_id_union(ctypes.Union):
    _fields_ = [
        ("id", ctypes.c_uint8),
        ("parts", transaction_parts),
    ]

class command_id_parts(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("direction", ctypes.c_uint8, 1),
        ("id", ctypes.c_uint8, 7),
    ]

class command_id_union(ctypes.Union):
    _fields_ = [
        ("id", ctypes.c_uint8),
        ("parts", command_id_parts),
    ]

class Report(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("_status", ctypes.c_uint8),
        ("transaction_id", transaction_id_union),
        ("remaining_packets", ctypes.c_uint16),
        ("protocol_type", ctypes.c_uint8),
        ("data_size", ctypes.c_uint8),
        ("command_class", ctypes.c_uint8),
        ("command_id", command_id_union),
        ("arguments", ctypes.c_uint8 * 80),
        ("crc", ctypes.c_uint8),
        ("reserved", ctypes.c_uint8),
    ]
    status = EnumProperty('_status', Status)

    def calculate_crc(self):
        crc = 0
        report = bytearray(self)
        for i in range(2, 88):
            crc ^= report[i]
        self.crc = crc
        return crc
        
    @classmethod
    def new(cls, command_class, command_id, data_size):
        new_report = cls()
        new_report.status = Status.NEW
        new_report.transaction_id.id = 0x1f # basilisk v3
        new_report.remaining_packets = 0x00
        new_report.protocol_type = 0x00
        new_report.command_class = command_class
        new_report.command_id.id = command_id
        new_report.data_size = data_size
        return new_report


class ButtonFunction(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("_fn_class", ctypes.c_uint8),
        ("fn_value_length", ctypes.c_uint8),
        ("fn_value", ctypes.c_uint8 * 5),
    ]
    fn_class = EnumProperty('_fn_class', FnClass)
    
    def set_fn_class(self, fn_class):
        self.fn_class = fn_class
        return self
    def get_fn_class(self):
        return self.fn_class
    
    def set_fn_value(self, b):
        self.fn_value_length = len(b)
        self.fn_value[:len(b)] = b
        return self
    def get_fn_value(self):
        return bytes(self.fn_value[:self.fn_value_length])

    def get_disabled(self):
        return {}
    def set_disabled(self):
        self.fn_class = FnClass.DISABLED
        self.set_fn_value(b'')
        return self
    
    CATEGORY = {
        FnClass.DISABLED: 'disabled',
        FnClass.MOUSE: 'mouse',
        FnClass.KEYBOARD: 'keyboard',
        FnClass.MACRO_FIXED: 'macro',
        FnClass.MACRO_HOLD: 'macro',
        FnClass.MACRO_TOGGLE: 'macro',
        FnClass.DPI_SWITCH: 'dpi_switch',
        FnClass.PROFILE_SWITCH: 'profile_switch',
        FnClass.SYSTEM: 'system',
        FnClass.CONSUMER: 'consumer',
        FnClass.DOUBLE_CLICK: 'mouse',
        FnClass.HYPERSHIFT_TOGGLE: 'hypershift_toggle',
        FnClass.KEYBOARD_TURBO: 'keyboard',
        FnClass.MOUSE_TURBO: 'mouse',
        FnClass.MACRO_SEQUENCE: 'macro',
        FnClass.SCROLL_MODE_TOGGLE: 'scroll_mode_toggle',
    }
    def get_category(self):
        return self.CATEGORY[self.fn_class]
    
    def set_mouse(self, fn, *, turbo=None, double_click=False):
        if double_click:
            self.fn_class = FnClass.DOUBLE_CLICK
            self.set_fn_value(struct.pack('>B', fn.value))
        elif turbo is not None:
            self.fn_class = FnClass.MOUSE_TURBO
            self.set_fn_value(struct.pack('>BH', fn.value, turbo))
        else:
            self.fn_class = FnClass.MOUSE
            self.set_fn_value(struct.pack('>B', fn.value))
        return self
    def get_mouse(self):
        if self.get_category() != 'mouse':
            raise ValueError()
        if self.fn_class in (FnClass.MOUSE, FnClass.DOUBLE_CLICK):
            fn, = struct.unpack('>B', self.get_fn_value())
            double_click = self.fn_class == FnClass.DOUBLE_CLICK
            return dict(fn=FnMouse(fn), double_click=double_click)
        else:
            fn, turbo = struct.unpack('>BH', self.get_fn_value())
            return dict(fn=FnMouse(fn), turbo=turbo)
    
    def set_keyboard(self, key, *, modifier=FnKeyboardModifier(0), turbo=None):
        if turbo is None:
            self.fn_class = FnClass.KEYBOARD
            self.set_fn_value(struct.pack('>BB', modifier.value, key))
        else:
            self.fn_class = FnClass.KEYBOARD_TURBO
            self.set_fn_value(struct.pack('>BBH', modifier.value, key, turbo))
        return self
    def get_keyboard(self):
        if self.get_category() != 'keyboard':
            raise ValueError()
        if self.fn_class == FnClass.KEYBOARD:
            modifier, key = struct.unpack('>BB', self.get_fn_value())
            modifier = FnKeyboardModifier(modifier)
            return dict(modifier=modifier, key=key)
        else:
            modifier, key, turbo = struct.unpack('>BBH', self.get_fn_value())
            modifier = FnKeyboardModifier(modifier)
            return dict(key=key, modifier=modifier, turbo=turbo)
    
    def set_macro(self, macro_id, *, mode=FnClass.MACRO_FIXED, times=1):
        if self.CATEGORY[mode] != 'macro':
            raise ValueError()
        self.fn_class = mode
        if mode == FnClass.MACRO_FIXED:
            self.set_fn_value(struct.pack('>HB', macro_id, times))
        else:
            self.set_fn_value(struct.pack('>H', macro_id))
        return self
    def get_macro(self):
        if self.get_category() != 'macro':
            raise ValueError()
        mode = self.fn_class
        if mode == FnClass.MACRO_FIXED:
            macro_id, times = struct.unpack('>HB', self.get_fn_value())
            return dict(mode=mode, macro_id=macro_id, times=times)
        else:
            macro_id = struct.unpack('>H', self.get_fn_value())
            return dict(mode=mode, macro_id=macro_id)
    
    def set_dpi_switch(self, fn, stage=None, dpi=None):
        self.fn_class = FnClass.DPI_SWITCH
        if fn == FnDpiSwitch.FIXED:
            self.set_fn_value(struct.pack('>BB', fn.value, stage))
        elif fn == FnDpiSwitch.AIM:
            self.set_fn_value(struct.pack('>BHH', fn.value, dpi[0], dpi[1]))
        else:
            self.set_fn_value(struct.pack('>B', fn.value))
        return self
    def get_dpi_switch(self):
        if self.get_category() != 'dpi_switch':
            raise ValueError()
        if len(self.get_fn_value()) == 5:
            fn, *dpi = struct.unpack('>BHH', self.get_fn_value())
            fn = FnDpiSwitch(fn)
            return dict(fn=fn, dpi=dpi)
        elif len(self.get_fn_value()) == 2:
            fn, stage = struct.unpack('>BB', self.get_fn_value())
            fn = FnDpiSwitch(fn)
            return dict(fn=fn, stage=stage)
        else:
            fn, = struct.unpack('>B', self.get_fn_value())
            fn = FnDpiSwitch(fn)
            return dict(fn=fn)
    
    def set_profile_switch(self, fn, profile=None):
        self.fn_class = FnClass.PROFILE_SWITCH
        if fn == FnProfileSwitch.FIXED:
            self.set_fn_value(struct.pack('>BB', fn.value, profile.value))
        else:
            self.set_fn_value(struct.pack('>B', fn.value))
        return self
    def get_profile_switch(self):
        if self.get_category() != 'profile_switch':
            raise ValueError()
        if len(self.get_fn_value()) == 2:
            fn, profile = struct.unpack('>BB', self.get_fn_value())
            fn = FnProfileSwitch(fn)
            profile = Profile(profile)
            return dict(fn=fn, profile=profile)
        else:
            fn, = struct.unpack('>B', self.get_fn_value())
            fn = FnProfileSwitch(fn)
            return dict(fn=fn)

    def set_system(self, fn):
        self.fn_class = FnClass.SYSTEM
        self.set_fn_value(struct.pack('>B', fn.value))
    def get_system(self):
        if self.get_category() != 'system':
            raise ValueError()
        fn, = struct.unpack('>B', self.get_fn_value())
        return dict(fn=FnSystem(fn))
    
    def set_consumer(self, fn):
        self.fn_class = FnClass.CONSUMER
        self.set_fn_value(struct.pack('>H', fn))
        return self
    def get_consumer(self):
        if self.get_category() != 'consumer':
            raise ValueError()
        fn, = struct.unpack('>H', self.get_fn_value())
        return dict(fn=fn)
    
    def set_hypershift_toggle(self, fn=0x01):
        self.fn_class = FnClass.HYPERSHIFT_TOGGLE
        self.set_fn_value(struct.pack('>B', fn))
        return self
    def get_hypershift_toggle(self):
        if self.get_category() != 'hypershift_toggle':
            raise ValueError()
        fn, = struct.unpack('>B', self.get_fn_value())
        return dict(fn=fn)
    
    def set_scroll_mode_toggle(self, fn=0x01):
        self.fn_class = FnClass.SCROLL_MODE_TOGGLE
        self.set_fn_value(struct.pack('>B', fn))
        return self
    def get_scroll_mode_toggle(self):
        if self.get_category() != 'scroll_mode_toggle':
            raise ValueError()
        fn, = struct.unpack('>B', self.get_fn_value())
        return dict(fn=fn)

@dataclass
class MacroOp:
    op_type: MacroOpClass = field(default=MacroOpClass.DELAY_1)
    op_value: bytes = field(default=b'\x01')
    
    MACRO_OP_VALUE_SIZE = {
        MacroOpClass.KEYBOARD_DOWN: 1,
        MacroOpClass.KEYBOARD_UP: 1,
        MacroOpClass.SYSTEM_A: 1,
        MacroOpClass.SYSTEM_B: 1,
        MacroOpClass.CONSUMER_A: 2,
        MacroOpClass.CONSUMER_B: 2,
        MacroOpClass.MOUSE_BUTTON: 1,
        MacroOpClass.MOUSE_WHEEL: 1,
        MacroOpClass.DELAY_1: 1,
        MacroOpClass.DELAY_2: 2,
    }
    
    def __bytes__(self):
        return bytes([self.op_type.value]) + self.op_value
    
    @classmethod
    def consume(cls, b):
        first = MacroOpClass(b[0])
        size = cls.MACRO_OP_VALUE_SIZE[first]
        data = b[1:1+size]
        return cls(first, data), size + 1
    
    @classmethod
    def list_from_bytes(cls, b):
        l = []
        while len(b) > 0:
            it, size = cls.consume(b)
            l.append(it)
            b = b[size:]
        return l
    
    @classmethod
    def list_to_bytes(cls, l):
        return b''.join(bytes(it) for it in l)
        
    CATEGORY = {
        MacroOpClass.KEYBOARD_DOWN: 'keyboard',
        MacroOpClass.KEYBOARD_UP: 'keyboard',
        MacroOpClass.SYSTEM_A: 'system',
        MacroOpClass.SYSTEM_B: 'system',
        MacroOpClass.CONSUMER_A: 'consumer',
        MacroOpClass.CONSUMER_B: 'consumer',
        MacroOpClass.MOUSE_BUTTON: 'mouse_button',
        MacroOpClass.MOUSE_WHEEL: 'mouse_wheel',
        MacroOpClass.DELAY_1: 'delay',
        MacroOpClass.DELAY_2: 'delay',
    }
    def get_category(self):
        return self.CATEGORY[self.op_type]

    def set_keyboard(self, key, *, is_up=False):
        if is_up:
            self.op_type = MacroOpClass.KEYBOARD_UP
        else:
            self.op_type = MacroOpClass.KEYBOARD_DOWN
        self.op_value = struct.pack('>B', key)
    def get_keyboard(self):
        if self.get_category() != 'keyboard':
            raise ValueError()
        return dict(
            key=struct.unpack('>B', self.op_value)[0],
            is_up=self.op_type == MacroOpClass.KEYBOARD_UP
        )
    
    def set_system(self, system, *, is_b=False):
        if is_b:
            self.op_type = MacroOpClass.SYSTEM_B
        else:
            self.op_type = MacroOpClass.SYSTEM_A
        self.op_value = struct.pack('>B', system.value)
    def get_system(self):
        if self.get_category() != 'system':
            raise ValueError()
        return dict(
            key=struct.unpack('>B', self.op_value)[0],
            is_b=self.op_type == MacroOpClass.SYSTEM_B
        )
    
    def set_consumer(self, consumer, *, is_b=False):
        if is_b:
            self.op_type = MacroOpClass.CONSUMER_B
        else:
            self.op_type = MacroOpClass.CONSUMER_A
        self.op_value = struct.pack('>B', consumer.value)
    def get_consumer(self):
        if self.get_category() != 'consumer':
            raise ValueError()
        return dict(
            key=struct.unpack('>B', self.op_value)[0],
            is_b=self.op_type == MacroOpClass.CONSUMER_B
        )
    
    def set_mouse_button(self, button):
        self.op_type = MacroOpClass.MOUSE_BUTTON
        self.op_value = struct.pack('>B', button.value)
    def get_mouse_button(self):
        if self.get_category() != 'mouse_button':
            raise ValueError()
        return MacroOpMouseButton(struct.unpack('>B', self.op_value)[0])
        
    def set_mouse_wheel(self, value):
        self.op_type = MacroOpClass.MOUSE_WHEEL
        self.op_value = struct.pack('>b', value)
    def get_mouse_wheel(self):
        if self.get_category() != 'mouse_wheel':
            raise ValueError()
        return struct.unpack('>b', self.op_value)[0]
    
    def set_delay(self, ms):
        if ms < 0x100:
            self.op_type = MacroOpClass.DELAY_1
            self.op_value = struct.pack('>B', ms)
        else:
            self.op_type = MacroOpClass.DELAY_2
            self.op_value = struct.pack('>H', ms)
    def get_delay(self):
        if self.get_category() != 'delay':
            raise ValueError()
        if self.op_type == MacroOpClass.DELAY_1:
            return struct.unpack('>B', self.op_value)[0]
        else:
            return struct.unpack('>H', self.op_value)[0]

def calculate_lift_config(mouse_data, lift, land=None):
    if not (1 <= lift <= 10) or not (land is None or 1 <= land <= 10):
        raise ValueError('lift and land must be within 1 and 10')
    asym = land is not None
    def calc0(l, m0):
        return round(m0 - (m0 - 8) / 10 * (l-1))
    def calc2(l, m1, m3):
        return (l-1) * m3 + m1
    m0, m1, m2, m3 = mouse_data
    
    a0 = calc0(lift, m0)
    if lift < 5: a1 = m2
    else:        a1 = [0,0,0,0,0x30,0x30,0x38,0x38,0x38,0x38][lift-1]
    a2 = calc2(lift, m1, m3)
    a3 = 0x88 if asym else 0x08
    a4 = max(10, a2)
    if asym: a5 = [0x5,0xf,0xf,0xf,0xf,0xf,0x0,0x0,0x0,0x0][lift-1]
    else:    a5 = [0x5,0x5,0x5,0x5,0x5,0x5,0x0,0x0,0x0,0x0][lift-1]
    a6 = [0x10,0xf,0xf,0xf,0xf,0xf,0xf,0xe,0xe,0xe,0xe][lift]
    a7 = [0xf,0xd,0xa,0xa,0xa,0x8,0x8,0x8,0x8,0x8][lift-1]
    a = bytes([a0, a1, a2, a3, a4, a5, a6, a7])
    if not asym:
        return a
    
    b0 = calc0(land, m0)
    if lift < 5: b1 = m2
    else:        b1 = [0,0,0,0,0x30,0x30,0x38,0x38,0x38,0x38][land-1]
    b2 = calc2(land, m1, m3)
    b3 = max(10, b2)
    b4 = [0xf,0xd,0xa,0xa,0xa,0x8,0x8,0x8,0x8,0x8][land-1]
    b = bytes([b0, b1, b2, b3, b4])
    return a, b
    