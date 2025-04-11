import ctypes
import struct
from enum import Enum
from time import sleep

from . import protocol as pt

class Device:
    
    def send(self, report):
        raise NotImplementedError
    
    def recv(self):
        raise NotImplementedError
    
    def send_recv(self, report, *, wait_power=0):
        raise NotImplementedError
    
    def get_info_manufacturer(self):
        raise NotImplementedError
    
    def get_info_product(self):
        raise NotImplementedError
    
    def get_info_serial(self):
        raise NotImplementedError
    
    def sr_with(self, full_command, fmt, *args, **kwargs):
        '''
        Example:
            sr_with(0x0688, '>HI', 123) sets H to 123 and returns I
        '''
        all_args = kwargs.pop('all', False)
        size = struct.calcsize(fmt)
        zero_unpack = struct.unpack(fmt, bytes(size))
        r = pt.Report.new((full_command >> 8) & 0xff, full_command & 0xff, size)
        r.arguments[:size] = struct.pack(fmt, *args, *zero_unpack[len(args):])
        rr = self.send_recv(r, **kwargs)
        return struct.unpack(fmt, bytes(rr.arguments[:size]))[0 if all_args else len(args):]

    def set_device_mode(self, mode, param=0):
        # 0: normal, 1: bootloader, 2: test, 3: driver
        self.sr_with(0x0004, '>BB', mode.value, param)
    def get_device_mode(self):
        mode, param = self.sr_with(0x0084, '>BB')
        return pt.DeviceMode(mode), param

    def get_serial(self):
        return self.sr_with(0x0082, '>16s')[0].rstrip(b'\x00')

    def get_firmware_version(self):
        return self.sr_with(0x0081, '>4B')

    def set_scroll_mode(self, mode: pt.ScrollMode, *, profile=pt.Profile.DEFAULT):
        self.sr_with(0x0214, '>BB', profile.value, mode.value)
    def get_scroll_mode(self, *, profile=pt.Profile.DEFAULT):
        mode, = self.sr_with(0x0294, '>BB', profile.value)
        return pt.ScrollMode(mode)
    
    def set_scroll_acceleration(self, is_on: bool, *, profile=pt.Profile.DEFAULT):
        self.sr_with(0x0216, '>BB', profile.value, int(is_on))
    def get_scroll_acceleration(self, *, profile=pt.Profile.DEFAULT):
        return bool(self.sr_with(0x0296, '>BB', profile.value)[0])
    
    def set_scroll_smart_reel(self, is_on: bool, *, profile=pt.Profile.DEFAULT):
        self.sr_with(0x0217, '>BB', profile.value, int(is_on))
    def get_scroll_smart_reel(self, *, profile=pt.Profile.DEFAULT):
        return bool(self.sr_with(0x0297, '>BB', profile.value)[0])

    def set_button_function(self, fn, button, hypershift=pt.Hypershift.OFF, *, profile=pt.Profile.DEFAULT):
        self.sr_with(0x020c, '>BBB7s', profile.value, button.value, hypershift.value, bytes(fn))
    def get_button_function(self, button, hypershift=pt.Hypershift.OFF, *, profile=pt.Profile.DEFAULT):
        return pt.ButtonFunction.from_buffer_copy(self.sr_with(0x028c, '>BBB7s', profile.value, button.value, hypershift.value)[0])

    def set_polling_rate(self, delay_ms, *, profile=pt.Profile.DEFAULT):
        self.sr_with(0x000e, '>BB', profile.value, delay_ms)
    def get_polling_rate(self, *, profile=pt.Profile.DEFAULT):
        return self.sr_with(0x008e, '>BB', profile.value)[0]
    
    def set_dpi_xy(self, dpi, *, profile=pt.Profile.DEFAULT):
        self.sr_with(0x0405, '>BHHxx', profile.value, dpi[0], dpi[1])
    def get_dpi_xy(self, *, profile=pt.Profile.DEFAULT):
        return self.sr_with(0x0485, '>BHHxx', profile.value)
    
    def set_dpi_stages(self, dpi_stages, active_stage, *, profile=pt.Profile.DEFAULT):
        self.sr_with(0x0406, '>BBB35s', profile.value, active_stage, len(dpi_stages),
                     b''.join(struct.pack('>BHHxx', i, x, y) for i, (x, y) in enumerate(dpi_stages + [(0, 0)] * (5-len(dpi_stages)))))
    def get_dpi_stages(self, *, profile=pt.Profile.DEFAULT):
        active_stage, len_dpi_stages, dpi_stages = self.sr_with(0x0486, '>BBB35s', profile.value)
        dpi_stages = [struct.unpack('>BHHxx', bytes(x))[1:] for x in zip(*[iter(dpi_stages[:7*len_dpi_stages])] * 7)]
        return dpi_stages, active_stage

    def get_flash_usage(self):
        return self.sr_with(0x068e, '>HIII')
    
    def wait_device_ready(self):
        self.sr_with(0x0086, '>xxx', wait_power=1)
        self.sr_with(0x0086, '>xx')
        return True
    
    def get_profile_total_count(self):
        return self.sr_with(0x058a, '>B')[0]
    
    def get_profile_available_count(self):
        return self.sr_with(0x0580, '>B')[0]
    
    def get_profile_list(self):
        length = self.get_profile_available_count()
        _, *l = self.sr_with(0x0581, f'>B{length}B')
        return [pt.Profile(p) for p in l]
    
    def new_profile(self, profile):
        self.sr_with(0x0502, '>B', profile.value)
    
    def delete_profile(self, profile):
        self.sr_with(0x0503, '>B', profile.value)
    
    def get_profile_info(self, profile):
        data = b''
        size, chunk = self.sr_with(0x0588, '>BHH64s', profile.value, len(data), wait_power=1)
        while size - len(data) > 64:
            data += chunk
            _, chunk = self.sr_with(0x0588, '>BHH64s', profile.value, len(data), wait_power=1)
        data += chunk[:size-len(data)]
        return data
    
    def set_profile_info(self, profile, data):
        size = len(data)
        while len(data) > 0:
            self.sr_with(0x0508, f'>BHH{len(data[:64])}s', profile.value, size - len(data), size, data[:64], wait_power=1)
            data = data[64:]
    
    def get_macro_count(self):
        return self.sr_with(0x0680, '>H')[0]

    def get_macro_list(self):
        data = []
        size, *chunk = self.sr_with(0x068b, '>HH32H', len(data))
        while size - len(data) > 32:
            data += chunk
            _, *chunk = self.sr_with(0x068b, '>HH32H', len(data))
        data += chunk[:size-len(data)]
        return data
    
    def get_macro_info(self, macro_id):
        data = b''
        size, chunk = self.sr_with(0x068c, '>HHH64s', macro_id, len(data), wait_power=1)
        while size - len(data) > 64:
            data += chunk
            _, chunk = self.sr_with(0x068c, '>HHH64s', macro_id, len(data), wait_power=1)
        data += chunk[:size-len(data)]
        return data

    def set_macro_info(self, macro_id, data):
        size = len(data)
        while len(data) > 0:
            self.sr_with(0x060c, f'>HHH{len(data[:64])}s', macro_id, size - len(data), size, data[:64], wait_power=1)
            data = data[64:]
    
    def delete_macro(self, macro_id):
        self.sr_with(0x0603, '>H', macro_id)
    
    def get_macro_size(self, macro_id):
        return self.sr_with(0x0688, '>HI', macro_id)[0]
    
    def set_macro_size(self, macro_id, length):
        self.sr_with(0x0608, '>HI', macro_id, length)
        
    def get_macro_function(self, macro_id):
        size = self.get_macro_size(macro_id)
        data = b''
        while size - len(data) > 0:
            chunk = self.sr_with(0x0689, '>HIB64s', macro_id, len(data), 64, wait_power=1)[0]
            data += chunk[:size-len(data)]
        return data
    
    def set_macro_function(self, macro_id, data):
        size = len(data)
        self.set_macro_size(macro_id, size)
        while len(data) > 0:
            self.sr_with(0x0609, f'>HIB{len(data[:64])}s', macro_id, size - len(data), len(data[:64]), data[:64], wait_power=1)
            data = data[64:]

    def reset_flash(self):
        self.sr_with(0x060a, '>6s', bytes.fromhex('0000 0002 0000'))
        # I don't know exactly the meaning of args
        i = 0
        while self.sr_with(0x068a, '>6s', bytes.fromhex('0000 0002 0000'), all=True)[0] != bytes.fromhex('0000 0202 0000'):
            sleep(0.5)
            if i >= 20: raise pt.RazerException('resetting flash takes too long')
            i += 1
    
    def set_sensor_state(self, use_lift):
        self.sr_with(0x0b03, '>HB', 0x0004, int(use_lift))
    def get_sensor_state(self):
        return bool(self.sr_with(0x0b83, '>HB', 0x0004)[0])
    
    def set_sensor_calibration(self, calib):
        self.sr_with(0x0b09, '>HH', 0x0004, int(calib))
    
    def set_sensor_lift(self, lift_config):
        self.sr_with(0x0b0b, '>HH', 0x0004, lift_config.value)
    def get_sensor_lift(self):
        return pt.LiftConfig(self.sr_with(0x0b8b, '>HH', 0x0004)[0])
    
    def set_sensor_lift_config(self, data):
        self.sr_with(0x0b05, '>H8s', 0x0004, data)
    def get_sensor_lift_config(self):
        return self.sr_with(0x0b85, '>H8s', 0x0004)[0]
    
    def set_sensor_lift_config_b(self, data):
        self.sr_with(0x0b0c, '>H5s', 0x0004, data)
    def get_sensor_lift_config_b(self):
        return self.sr_with(0x0b8c, '>H5s', 0x0004)[0]
    
    def set_sensor_lift_config_a(self, data):
        self.sr_with(0x0b0d, '>H8s', 0x0004, data)
    def get_sensor_lift_config_a(self):
        return self.sr_with(0x0b8d, '>H8s', 0x0004)[0]

    def set_led_effect(self, region, effect, mode=0, speed=0, colors=None, *, profile=pt.Profile.DEFAULT):
        colors = colors or []
        color_bytes = b''.join(bytes(t) for t in colors)
        self.sr_with(0x0f02, f'>BBBBBB{len(color_bytes)}s', profile.value, region.value, effect.value, mode, speed, len(colors), color_bytes)
    def get_led_effect(self, region, *, profile=pt.Profile.DEFAULT):
        effect, mode, speed, len_colors, color_bytes = self.sr_with(0x0f82, f'>BBBBBB6s', profile.value, region.value)
        colors = [struct.unpack('>BBB', bytes(x)) for x in zip(*[iter(color_bytes[:len_colors*3])] * 3)]
        return pt.LedEffect(effect), mode, speed, colors
    
    def set_led_static(self, colors):
        '''
        LED order: Logo, Wheel, Strip counter-clockwise
        '''
        self.sr_with(0x0f03, '>5s33s', bytes.fromhex('00000000 0a'), b''.join(bytes(t) for t in colors), wait_power=None)

    def set_led_brightness(self, region, brightness, *, profile=pt.Profile.DEFAULT):
        self.sr_with(0x0f04, '>BBB', profile.value, region.value, brightness)
    
    def get_led_brightness(self, region, *, profile=pt.Profile.DEFAULT):
        return self.sr_with(0x0f84, '>BBB', profile.value, region.value)[0]

    def dump_profile(self, profile):
        simple = [
            'scroll_mode', 'scroll_acceleration', 'scroll_smart_reel',
            'polling_rate', 'dpi_xy', 'dpi_stages'
        ]
        dump = {}
        for name in simple:
            ret = getattr(self, 'get_' + name)(profile=profile)
            dump[name] = ret
        
        # button function
        associated_macros = set()
        button_function = {}
        for hypershift in pt.Hypershift:
            for button in pt.Button:
                bf = button_function[button, hypershift] = self.get_button_function(button, hypershift, profile=profile)
                if bf.get_subtype() == 'macro':
                    associated_macros.add(bf.get_macro()['macro_id'])
        dump['button_function'] = button_function
        
        # macros
        macro = {}
        for macro_id in associated_macros:
            macro[macro_id] = self.dump_macro(macro_id)
        dump['macro'] = macro
        
        # profile info
        try:
            dump['profile_info'] = self.get_profile_info(profile=profile)
        except pt.RazerException:
            pass
        
        # led effect
        led_effect = {}
        led_brightness = {}
        for region in pt.LedRegion:
            if region == pt.LedRegion.ALL:
                continue
            led_effect[region] = self.get_led_effect(region, profile=profile)
            led_brightness[region] = self.get_led_brightness(region, profile=profile)
        
        return dump
    
    def load_profile(self, profile, dump):
        if profile not in self.get_profile_list():
            self.new_profile(profile)
        simple = [
            'scroll_mode', 'scroll_acceleration', 'scroll_smart_reel',
            'polling_rate', 'dpi_xy', 'dpi_stages'
        ]
        for name in simple:
            if dump[name]:
                f = getattr(self, 'set_' + name)
                try:
                    f(dump[name], profile=profile)
                except TypeError:
                    if isinstance(dump[name], dict):
                        f(**dump[name], profile=profile)
                    else:
                        f(*dump[name], profile=profile)
        
        # macros
        if macro := dump.get('macro'):
            for macro_id, macro_dump in macro.items():
                self.load_macro(macro_id, macro_dump)
        
        # button function
        if button_function := dump.get('button_function'):
            for hypershift in pt.Hypershift:
                for button in pt.Button:
                    if fn := button_function.get((button, hypershift)):
                        self.set_button_function(fn, button, hypershift, profile=profile)
        
        # profile info
        if profile_info := dump.get('profile_info'):
            self.set_profile_info(profile, profile_info)

        # led effect
        if led_effect := dump.get('led_effect'):
            for region, effect in led_effect.items():
                self.set_led_effect(region, *effect, profile=profile)
        if led_brightness := dump.get('led_brightness'):
            for region, brightness in led_brightness.items():
                self.set_led_brightness(region, brightness, profile=profile)
        
        return dump
    
    def dump_macro(self, macro_id):
        dump = {}
        dump['macro_info'] = self.get_macro_info(macro_id)
        dump['macro_function'] = self.get_macro_function(macro_id)
        return dump

    def load_macro(self, macro_id, dump):
        try:
            self.get_macro_size(macro_id)
        except pt.RazerException:
            self.set_macro_size(macro_id, len(dump.get('macro_function', b'')))
        if (_ := dump.get('macro_info')):
            self.set_macro_info(macro_id, _)
        if (_ := dump.get('macro_function')):
            self.set_macro_function(macro_id, _)
    