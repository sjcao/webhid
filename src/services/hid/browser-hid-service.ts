import { MouseCommands, MouseCommand } from '@/protocol/mouse';
import { toHexString } from '@/lib/hex';

export type HidInputHandler = (data: Uint8Array) => void;

class BrowserHidService {
  private device: HIDDevice | null = null;
  private handlers = new Set<HidInputHandler>();

  get supported() {
    return typeof navigator !== 'undefined' && 'hid' in navigator;
  }

  get currentDevice() {
    return this.device;
  }

  async getAuthorizedDevices() {
    if (!this.supported) return [];
    return navigator.hid.getDevices();
  }

  async requestDevices() {
    if (!this.supported) {
      throw new Error('This browser does not support WebHID.');
    }
    return navigator.hid.requestDevice({ filters: [] });
  }

  async connect(device: HIDDevice) {
    if (this.device && this.device !== device) {
      await this.disconnect();
    }

    if (!device.opened) {
      await device.open();
    }

    this.device = device;
    device.oninputreport = (event) => {
      const data = new Uint8Array(event.data.buffer);
      this.handlers.forEach((handler) => handler(data));
    };
  }

  async disconnect() {
    if (!this.device) return;
    const device = this.device;
    device.oninputreport = null;
    if (device.opened) {
      await device.close();
    }
    this.device = null;
  }

  subscribe(handler: HidInputHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async send(command: MouseCommand) {
    if (!this.device) {
      throw new Error('No HID device is connected.');
    }
    if (!this.device.opened) {
      await this.device.open();
    }
    console.debug('HID ->', toHexString(command));
    await this.device.sendReport(MouseCommands.reportId, command);
  }
}

export const hidService = new BrowserHidService();
