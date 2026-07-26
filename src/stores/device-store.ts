import { create } from 'zustand';
import { hidService, UnsupportedDeviceError } from '@/services/hid/browser-hid-service';
import type { TranslationKey } from '@/i18n/use-i18n';

export type DeviceRecord = {
  id: string;
  productName: string;
  vendorId: number;
  productId: number;
  opened: boolean;
  device: HIDDevice;
};

function toDeviceRecord(device: HIDDevice, index: number): DeviceRecord {
  return {
    id: `${device.vendorId}:${device.productId}:${index}:${device.productName}`,
    productName: device.productName || 'HID Mouse',
    vendorId: device.vendorId,
    productId: device.productId,
    opened: device.opened,
    device,
  };
}

type DeviceState = {
  supported: boolean;
  devices: DeviceRecord[];
  currentDevice: DeviceRecord | null;
  previewMode: boolean;
  connecting: boolean;
  error: string | null;
  errorKey: TranslationKey | null;
  disconnectNotice: boolean;
  refreshDevices: () => Promise<void>;
  requestDevice: () => Promise<void>;
  connectDevice: (id: string) => Promise<boolean>;
  reconnectAuthorizedDevice: () => Promise<boolean>;
  disconnectDevice: () => Promise<void>;
  enterPreviewMode: () => void;
  clearDisconnectNotice: () => void;
};

export const useDeviceStore = create<DeviceState>((set, get) => ({
  supported: hidService.supported,
  devices: [],
  currentDevice: null,
  previewMode: false,
  connecting: false,
  error: null,
  errorKey: null,
  disconnectNotice: false,
  refreshDevices: async () => {
    const devices = await hidService.getAuthorizedDevices();
    set({ devices: devices.map(toDeviceRecord), supported: hidService.supported });
  },
  requestDevice: async () => {
    set({ connecting: true, error: null, errorKey: null });
    try {
      await hidService.requestDevices();
      await get().refreshDevices();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to request HID device.' });
    } finally {
      set({ connecting: false });
    }
  },
  connectDevice: async (id: string) => {
    const record = get().devices.find((device) => device.id === id);
    if (!record) {
      set({ error: 'Selected device is no longer available.', errorKey: null });
      return false;
    }
    set({ connecting: true, error: null, errorKey: null });
    try {
      await hidService.connect(record.device);
      set({ currentDevice: { ...record, opened: true }, previewMode: false, disconnectNotice: false });
      await get().refreshDevices();
      return true;
    } catch (error) {
      if (error instanceof UnsupportedDeviceError) {
        set({ errorKey: 'connect.unsupportedDevice' });
      } else {
        set({ error: error instanceof Error ? error.message : 'Failed to connect HID device.' });
      }
      return false;
    } finally {
      set({ connecting: false });
    }
  },
  reconnectAuthorizedDevice: async () => {
    const devices = await hidService.getAuthorizedDevices().catch(() => [] as HIDDevice[]);
    for (let index = 0; index < devices.length; index += 1) {
      try {
        await hidService.connect(devices[index]);
        set({
          currentDevice: toDeviceRecord(devices[index], index),
          previewMode: false,
          disconnectNotice: false,
          error: null,
          errorKey: null,
        });
        return true;
      } catch {
        // Try the next authorized device.
      }
    }
    return false;
  },
  disconnectDevice: async () => {
    try {
      await hidService.disconnect();
    } finally {
      set({ currentDevice: null, previewMode: false, disconnectNotice: false });
      await get().refreshDevices();
    }
  },
  enterPreviewMode: () => set({ previewMode: true, currentDevice: null, error: null, errorKey: null, disconnectNotice: false }),
  clearDisconnectNotice: () => set({ disconnectNotice: false }),
}));

hidService.onConnect(() => {
  void useDeviceStore.getState().refreshDevices();
});

hidService.onDisconnect((device) => {
  const { currentDevice } = useDeviceStore.getState();
  if (currentDevice?.device === device) {
    useDeviceStore.setState({ currentDevice: null, disconnectNotice: true });
  }
  void useDeviceStore.getState().refreshDevices();
});
