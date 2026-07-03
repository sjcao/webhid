import { create } from 'zustand';
import { hidService } from '@/services/hid/browser-hid-service';

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
  refreshDevices: () => Promise<void>;
  requestDevice: () => Promise<void>;
  connectDevice: (id: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  enterPreviewMode: () => void;
  leavePreviewMode: () => void;
};

export const useDeviceStore = create<DeviceState>((set, get) => ({
  supported: hidService.supported,
  devices: [],
  currentDevice: null,
  previewMode: false,
  connecting: false,
  error: null,
  refreshDevices: async () => {
    const devices = await hidService.getAuthorizedDevices();
    set({ devices: devices.map(toDeviceRecord), supported: hidService.supported });
  },
  requestDevice: async () => {
    set({ connecting: true, error: null });
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
      set({ error: 'Selected device is no longer available.' });
      return;
    }
    set({ connecting: true, error: null });
    try {
      await hidService.connect(record.device);
      set({ currentDevice: { ...record, opened: true }, previewMode: false });
      await get().refreshDevices();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to connect HID device.' });
    } finally {
      set({ connecting: false });
    }
  },
  disconnectDevice: async () => {
    await hidService.disconnect();
    set({ currentDevice: null });
    await get().refreshDevices();
  },
  enterPreviewMode: () => set({ previewMode: true, currentDevice: null, error: null }),
  leavePreviewMode: () => set({ previewMode: false }),
}));
