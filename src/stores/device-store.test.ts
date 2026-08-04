import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hidService, UnsupportedDeviceError } from '@/services/hid/browser-hid-service';
import { useDeviceStore, type DeviceRecord } from './device-store';

vi.mock('@/services/hid/browser-hid-service', () => {
  const connectHandlers = new Set<(device: HIDDevice) => void>();
  const disconnectHandlers = new Set<(device: HIDDevice) => void>();
  class UnsupportedDeviceError extends Error {
    constructor() {
      super('This device does not expose the mouse control protocol.');
      this.name = 'UnsupportedDeviceError';
    }
  }
  const hidService = {
    supported: true,
    send: vi.fn(async () => {}),
    subscribe: () => () => {},
    onConnect: (handler: (device: HIDDevice) => void) => {
      connectHandlers.add(handler);
      return () => connectHandlers.delete(handler);
    },
    onDisconnect: (handler: (device: HIDDevice) => void) => {
      disconnectHandlers.add(handler);
      return () => disconnectHandlers.delete(handler);
    },
    getAuthorizedDevices: vi.fn(async () => [] as HIDDevice[]),
    requestDevices: vi.fn(async () => [] as HIDDevice[]),
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    emitConnect: (device: HIDDevice) => connectHandlers.forEach((handler) => handler(device)),
    emitDisconnect: (device: HIDDevice) => disconnectHandlers.forEach((handler) => handler(device)),
  };
  return { hidService, UnsupportedDeviceError };
});

const connectMock = vi.mocked(hidService.connect);
const disconnectMock = vi.mocked(hidService.disconnect);
const getAuthorizedDevicesMock = vi.mocked(hidService.getAuthorizedDevices);

function emitConnect(device: HIDDevice) {
  (hidService as unknown as { emitConnect: (device: HIDDevice) => void }).emitConnect(device);
}

function emitDisconnect(device: HIDDevice) {
  (hidService as unknown as { emitDisconnect: (device: HIDDevice) => void }).emitDisconnect(device);
}

function fakeDevice(name = 'Test Mouse'): HIDDevice {
  return {
    productName: name,
    vendorId: 0x1189,
    productId: 0x2011,
    opened: false,
    collections: [],
  } as unknown as HIDDevice;
}

function seedDevice(device: HIDDevice, id = 'dev-1'): DeviceRecord {
  const record: DeviceRecord = {
    id,
    productName: device.productName || 'HID Mouse',
    vendorId: device.vendorId,
    productId: device.productId,
    opened: false,
    device,
  };
  useDeviceStore.setState({ devices: [record] });
  return record;
}

beforeEach(() => {
  connectMock.mockClear();
  connectMock.mockImplementation(async () => {});
  disconnectMock.mockClear();
  disconnectMock.mockImplementation(async () => {});
  getAuthorizedDevicesMock.mockClear();
  getAuthorizedDevicesMock.mockImplementation(async () => []);
  useDeviceStore.setState({
    devices: [],
    currentDevice: null,
    previewMode: false,
    connecting: false,
    error: null,
    errorKey: null,
    disconnectNotice: false,
    autoReconnectPending: false,
  });
});

describe('connectDevice', () => {
  it('connects a listed device and leaves preview mode', async () => {
    useDeviceStore.getState().enterPreviewMode();
    const device = fakeDevice();
    const record = seedDevice(device);

    const ok = await useDeviceStore.getState().connectDevice(record.id);

    expect(ok).toBe(true);
    expect(connectMock).toHaveBeenCalledWith(device);
    const state = useDeviceStore.getState();
    expect(state.currentDevice).toMatchObject({ id: record.id, opened: true });
    expect(state.previewMode).toBe(false);
    expect(state.connecting).toBe(false);
    expect(state.error).toBeNull();
  });

  it('returns false and records the error when opening the device fails', async () => {
    const record = seedDevice(fakeDevice());
    connectMock.mockRejectedValueOnce(new Error('Device is busy'));

    const ok = await useDeviceStore.getState().connectDevice(record.id);

    expect(ok).toBe(false);
    const state = useDeviceStore.getState();
    expect(state.currentDevice).toBeNull();
    expect(state.error).toBe('Device is busy');
    expect(state.connecting).toBe(false);
  });

  it('maps unsupported devices to a translatable error key', async () => {
    const record = seedDevice(fakeDevice());
    connectMock.mockRejectedValueOnce(new UnsupportedDeviceError());

    const ok = await useDeviceStore.getState().connectDevice(record.id);

    expect(ok).toBe(false);
    const state = useDeviceStore.getState();
    expect(state.errorKey).toBe('connect.unsupportedDevice');
    expect(state.error).toBeNull();
    expect(state.currentDevice).toBeNull();
  });

  it('fails fast when the device id is no longer listed', async () => {
    const ok = await useDeviceStore.getState().connectDevice('missing');

    expect(ok).toBe(false);
    expect(useDeviceStore.getState().error).toBe('Selected device is no longer available.');
    expect(connectMock).not.toHaveBeenCalled();
  });
});

describe('preview mode transitions', () => {
  it('enterPreviewMode clears device state and previous errors', () => {
    useDeviceStore.setState({
      currentDevice: seedDevice(fakeDevice()),
      error: 'old error',
      errorKey: 'connect.unsupportedDevice',
      disconnectNotice: true,
    });

    useDeviceStore.getState().enterPreviewMode();

    const state = useDeviceStore.getState();
    expect(state.previewMode).toBe(true);
    expect(state.currentDevice).toBeNull();
    expect(state.error).toBeNull();
    expect(state.errorKey).toBeNull();
    expect(state.disconnectNotice).toBe(false);
  });

  it('disconnectDevice exits preview mode', async () => {
    useDeviceStore.getState().enterPreviewMode();

    await useDeviceStore.getState().disconnectDevice();

    expect(useDeviceStore.getState().previewMode).toBe(false);
    expect(disconnectMock).toHaveBeenCalled();
  });
});

describe('disconnectDevice', () => {
  it('clears the current device even when the service disconnect fails', async () => {
    useDeviceStore.setState({ currentDevice: seedDevice(fakeDevice()) });
    disconnectMock.mockRejectedValueOnce(new Error('close failed'));

    await expect(useDeviceStore.getState().disconnectDevice()).rejects.toThrow('close failed');

    expect(useDeviceStore.getState().currentDevice).toBeNull();
  });
});

describe('plug events', () => {
  it('refreshes the device list when an authorized device is plugged in', async () => {
    const device = fakeDevice('Plugged');
    getAuthorizedDevicesMock.mockResolvedValueOnce([device]);

    emitConnect(device);

    await vi.waitFor(() => {
      expect(useDeviceStore.getState().devices).toHaveLength(1);
    });
    expect(useDeviceStore.getState().devices[0].productName).toBe('Plugged');
  });

  it('records device enumeration failures instead of creating an unhandled rejection', async () => {
    getAuthorizedDevicesMock.mockRejectedValueOnce(new Error('enumeration failed'));

    await useDeviceStore.getState().refreshDevices();

    expect(useDeviceStore.getState().devices).toEqual([]);
    expect(useDeviceStore.getState().error).toBe('enumeration failed');
  });

  it('clears a stale enumeration error after a successful refresh', async () => {
    useDeviceStore.setState({ error: 'old enumeration failure' });
    getAuthorizedDevicesMock.mockResolvedValueOnce([fakeDevice()]);

    await useDeviceStore.getState().refreshDevices();

    expect(useDeviceStore.getState().devices).toHaveLength(1);
    expect(useDeviceStore.getState().error).toBeNull();
  });
});

describe('unplug events', () => {
  it('flags an unplug of the active device', () => {
    const device = fakeDevice();
    useDeviceStore.setState({ currentDevice: seedDevice(device) });

    emitDisconnect(device);

    const state = useDeviceStore.getState();
    expect(state.currentDevice).toBeNull();
    expect(state.disconnectNotice).toBe(true);
    expect(state.autoReconnectPending).toBe(true);

    useDeviceStore.getState().clearDisconnectNotice();
    expect(useDeviceStore.getState().disconnectNotice).toBe(false);
    expect(useDeviceStore.getState().autoReconnectPending).toBe(true);
  });

  it('still auto-reconnects after the disconnect notice is dismissed', async () => {
    const device = fakeDevice('Reconnect');
    useDeviceStore.setState({ currentDevice: seedDevice(device) });
    emitDisconnect(device);
    useDeviceStore.getState().clearDisconnectNotice();
    getAuthorizedDevicesMock.mockResolvedValue([device]);

    emitConnect(device);

    await vi.waitFor(() => expect(useDeviceStore.getState().currentDevice?.device).toBe(device));
    expect(useDeviceStore.getState().autoReconnectPending).toBe(false);
  });

  it('prefers the device that triggered the hot-plug event over other authorized devices', async () => {
    const previouslyAuthorized = fakeDevice('Other Mouse');
    const pluggedDevice = fakeDevice('Plugged Mouse');
    useDeviceStore.setState({ autoReconnectPending: true });
    getAuthorizedDevicesMock.mockResolvedValue([previouslyAuthorized, pluggedDevice]);

    emitConnect(pluggedDevice);

    await vi.waitFor(() => expect(useDeviceStore.getState().currentDevice?.device).toBe(pluggedDevice));
    expect(connectMock).toHaveBeenCalledWith(pluggedDevice);
    expect(connectMock).not.toHaveBeenCalledWith(previouslyAuthorized);
  });

  it('ignores unplug events for other devices', () => {
    const active = fakeDevice('Active');
    const record = seedDevice(active);
    useDeviceStore.setState({ currentDevice: record });

    emitDisconnect(fakeDevice('Other'));

    const state = useDeviceStore.getState();
    expect(state.currentDevice).toBe(record);
    expect(state.disconnectNotice).toBe(false);
  });
});

describe('reconnectAuthorizedDevice', () => {
  it('reconnects the first authorized device that opens', async () => {
    const deviceA = fakeDevice('Device A');
    const deviceB = fakeDevice('Device B');
    getAuthorizedDevicesMock.mockResolvedValueOnce([deviceA, deviceB]);
    connectMock
      .mockRejectedValueOnce(new Error('busy'))
      .mockImplementationOnce(async () => {});

    const ok = await useDeviceStore.getState().reconnectAuthorizedDevice();

    expect(ok).toBe(true);
    const state = useDeviceStore.getState();
    expect(state.currentDevice?.productName).toBe('Device B');
    expect(state.previewMode).toBe(false);
    expect(state.disconnectNotice).toBe(false);
  });

  it('returns false when no authorized device connects', async () => {
    getAuthorizedDevicesMock.mockResolvedValueOnce([fakeDevice()]);
    connectMock.mockRejectedValueOnce(new Error('busy'));

    const ok = await useDeviceStore.getState().reconnectAuthorizedDevice();

    expect(ok).toBe(false);
    expect(useDeviceStore.getState().currentDevice).toBeNull();
  });
});
