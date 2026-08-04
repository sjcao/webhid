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
  autoReconnectPending: boolean;
  refreshDevices: () => Promise<void>;
  requestDevice: () => Promise<void>;
  connectDevice: (id: string) => Promise<boolean>;
  reconnectAuthorizedDevice: (preferredDevice?: HIDDevice) => Promise<boolean>;
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
  autoReconnectPending: false,
  refreshDevices: async () => {
    try {
      const devices = await hidService.getAuthorizedDevices();
      set({
        devices: devices.map(toDeviceRecord),
        supported: hidService.supported,
        error: null,
        errorKey: null,
      });
    } catch (error) {
      set({
        devices: [],
        supported: hidService.supported,
        error: error instanceof Error ? error.message : 'Failed to list authorized HID devices.',
        errorKey: null,
      });
    }
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
      set({ currentDevice: { ...record, opened: true }, previewMode: false, disconnectNotice: false, autoReconnectPending: false });
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
  reconnectAuthorizedDevice: async (preferredDevice) => {
    const authorized = await hidService.getAuthorizedDevices().catch(() => [] as HIDDevice[]);
    const devices = preferredDevice
      ? [preferredDevice, ...authorized.filter((device) => device !== preferredDevice)]
      : authorized;
    for (let index = 0; index < devices.length; index += 1) {
      const device = devices[index];
      try {
        await hidService.connect(device);
        // 刷新列表后按设备对象取回 record，使 currentDevice.id 与 devices 列表保持一致，
        // 避免用一次性下标合成的 id 与列表对不上
        await get().refreshDevices();
        const record = get().devices.find((item) => item.device === device);
        set({
          currentDevice: record ? { ...record, opened: true } : toDeviceRecord(device, index),
          previewMode: false,
          disconnectNotice: false,
          autoReconnectPending: false,
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
      set({ currentDevice: null, previewMode: false, disconnectNotice: false, autoReconnectPending: false });
      await get().refreshDevices();
    }
  },
  enterPreviewMode: () => set({ previewMode: true, currentDevice: null, error: null, errorKey: null, disconnectNotice: false, autoReconnectPending: false }),
  clearDisconnectNotice: () => set({ disconnectNotice: false }),
}));

hidService.onConnect((connectedDevice) => {
  void useDeviceStore.getState().refreshDevices().then(() => {
    // 热插拔：此前正在使用的设备曾断开(autoReconnectPending)、当前无连接且非预览时，
    // 设备重新插入即自动重连，避免用户停留在“已断开”横幅需返回首页重连
    const { currentDevice, previewMode, autoReconnectPending } = useDeviceStore.getState();
    if (!currentDevice && !previewMode && autoReconnectPending) {
      void useDeviceStore.getState().reconnectAuthorizedDevice(connectedDevice);
    }
  });
});

hidService.onDisconnect((device) => {
  const { currentDevice } = useDeviceStore.getState();
  if (currentDevice?.device === device) {
    useDeviceStore.setState({ currentDevice: null, disconnectNotice: true, autoReconnectPending: true });
  }
  void useDeviceStore.getState().refreshDevices();
});
