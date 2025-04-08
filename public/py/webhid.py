import enum

__all__ = ['HIDException', 'Device', 'enumerate', 'BusType', 'set_await_js']

def await_js(code):
    print('await js is not set')
    raise NotImplementedError()

def set_await_js(f):
    global await_js
    await_js = f

class HIDException(Exception):
    pass

class BusType(enum.Enum):
    UNKNOWN = 0x00
    USB = 0x01
    BLUETOOTH = 0x02
    I2C = 0x03
    SPI = 0x04

def enumerate(vid=0, pid=0):
    devices = await_js('''
        this.devices = await navigator.hid.requestDevice({filters: []});
        const new_devices = [];
        for (let [i, d] of this.devices.entries()) {
            const dd = {
                'path': i,
                'vendor_id': d.vendorId,
                'product_id': d.productId,
                'serial_number': '',
                'manufacturer_string': '',
                'product_string': d.productName,
                'usage_page': d.collections[0].usagePage,
                'usage': d.collections[0].usage,
                'interface_number': -1,
                'fio_count': [d.collections[0].featureReports.length, d.collections[0].inputReports.length, d.collections[0].outputReports.length],
            }
            new_devices.push(dd);
        }
        console.log('selected devices', JSON.stringify(new_devices));
        return new_devices;
    ''').to_py()
    return devices

def find_device(vid=None, pid=None, serial=None, path=None):
    if path is not None:
        return path
    elif serial is not None:
        raise ValueError('serial is not available in webhid')
    elif vid is not None and pid is not None:
        path = await_js(f'''
            for (let [i, d] of this.devices.entries()) {{
                if (d.vendorId == {vid} && d.productId == {pid}) {{
                    return i;
                }}
            }}
            return -1;
        ''')
        if path == -1:
            raise ValueError('no device with vid pid found')
        return path
    else:
        raise ValueError('specify vid/pid or path')

class Device(object):
    def __init__(self, vid=None, pid=None, serial=None, path=None):
        self.__dev = find_device(vid, pid, serial, path)
        await_js(f'this.devices[{self.__dev}].open()')

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        self.close()

    def write(self, data):
        report_id, data = data[0], data[1:]
        await_js(f'''
            const d = this.devices[{self.__dev}];
            await d.sendReport({report_id}, new Uint8Array([{', '.join(map(str, list(data)))}]));
        ''')

    def read(self, size, timeout=None):
        raise NotImplementedError()

    def get_input_report(self, report_id, size):
        raise NotImplementedError()

    def send_feature_report(self, data):
        report_id, data = data[0], data[1:]
        await_js(f'''
            const d = this.devices[{self.__dev}];
            await d.sendFeatureReport({report_id}, new Uint8Array([{', '.join(map(str, list(data)))}]));
        ''')

    def get_feature_report(self, report_id, size):
        hex = await_js(f'''
            const d = this.devices[{self.__dev}];
            let data = await d.receiveFeatureReport({report_id});
            data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            const hex = Array.from(data)
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join('');
            return hex;
        ''')
        b = bytes.fromhex(hex)
        # at least on windows, report id is at front
        if b[0] == report_id:
            # guess it's really at front
            b = b[1:] + b'\x00'
        return (bytes([report_id]) + b)[:size]

    def close(self):
        if self.__dev:
            self.__dev.close()
            self.__dev = None

    @property
    def nonblocking(self):
        return getattr(self, '_nonblocking', 0)

    @nonblocking.setter
    def nonblocking(self, value):
        setattr(self, '_nonblocking', value)

    @property
    def manufacturer(self):
        return ''

    @property
    def product(self):
        return self.__dev.productName

    @property
    def serial(self):
        return ''

    def get_indexed_string(self, index, max_length=255):
        return ''
