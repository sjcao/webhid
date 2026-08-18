import { MouseCommands, MouseCommand } from '@/protocol/mouse';
import { toHexString } from '@/lib/hex';

export type HidInputHandler = (data: Uint8Array) => void;
export type HidConnectHandler = (device: HIDDevice) => void;
export type HidDisconnectHandler = (device: HIDDevice) => void;

export class UnsupportedDeviceError extends Error {
  constructor() {
    super('This device does not expose the mouse control protocol.');
    this.name = 'UnsupportedDeviceError';
  }
}

const PACKET_SIZE = MouseCommands.payloadSize + 1;

function collectionHasProtocolOutput(collection: HIDCollectionInfo): boolean {
  if ((collection.outputReports ?? []).some((report) => report.reportId === MouseCommands.reportId)) {
    return true;
  }
  return (collection.children ?? []).some(collectionHasProtocolOutput);
}

export function isDeviceSupported(device: HIDDevice): boolean {
  return (device.collections ?? []).some(collectionHasProtocolOutput);
}

export class BrowserHidService {
  private device: HIDDevice | null = null;
  private inputListener: ((event: HIDInputReportEvent) => void) | null = null;
  private handlers = new Set<HidInputHandler>();
  private connectHandlers = new Set<HidConnectHandler>();
  private disconnectHandlers = new Set<HidDisconnectHandler>();
  private sendTail: Promise<unknown> = Promise.resolve();

  constructor() {
    if (this.supported) {
      navigator.hid.addEventListener('connect', (event) => {
        this.connectHandlers.forEach((handler) => handler(event.device));
      });
      navigator.hid.addEventListener('disconnect', (event) => {
        if (event.device === this.device) {
          this.detachInput();
          this.device = null;
        }
        this.disconnectHandlers.forEach((handler) => handler(event.device));
      });
    }
  }

  // 移除当前设备上的输入监听，供断开/重连复用，避免同一设备重复挂载导致监听器泄漏
  private detachInput() {
    if (this.device && this.inputListener) {
      this.device.removeEventListener('inputreport', this.inputListener);
    }
    this.inputListener = null;
  }

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
    if (!isDeviceSupported(device)) {
      throw new UnsupportedDeviceError();
    }

    if (this.device && this.device !== device) {
      await this.disconnect();
    }

    if (!device.opened) {
      await device.open();
    }

    // 重连同一设备前先摘掉旧监听，防止重复挂载
    this.detachInput();
    this.device = device;
    this.inputListener = (event) => {
      const packet = this.toProtocolPacket(event);
      if (!packet) return;
      this.handlers.forEach((handler) => handler(packet));
    };
    device.addEventListener('inputreport', this.inputListener);
  }

  async disconnect() {
    if (!this.device) return;
    const device = this.device;
    this.detachInput();
    this.device = null;
    if (device.opened) {
      try {
        await device.close();
      } catch (error) {
        console.warn('HID close failed', error);
      }
    }
  }

  subscribe(handler: HidInputHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  onConnect(handler: HidConnectHandler) {
    this.connectHandlers.add(handler);
    return () => {
      this.connectHandlers.delete(handler);
    };
  }

  onDisconnect(handler: HidDisconnectHandler) {
    this.disconnectHandlers.add(handler);
    return () => {
      this.disconnectHandlers.delete(handler);
    };
  }

  send(command: MouseCommand) {
    const device = this.device;
    if (!device) return Promise.reject(new Error('No HID device is connected.'));
    const payload = new Uint8Array(command);
    return this.enqueue(() => this.performSend(device, payload));
  }

  // 整批命令作为单个队列任务串行发送，期间不允许其他命令插入
  sendBatch(commands: readonly MouseCommand[]) {
    const device = this.device;
    if (!device) return Promise.reject(new Error('No HID device is connected.'));
    const payloads = commands.map((command) => new Uint8Array(command));
    return this.enqueue(async () => {
      for (const command of payloads) {
        await this.performSend(device, command);
      }
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.sendTail.catch(() => undefined).then(task);
    this.sendTail = run;
    return run;
  }

  private async performSend(device: HIDDevice, command: MouseCommand) {
    // 队列中的任务必须绑定到入队时的设备。断开后即使很快连上另一台设备，
    // 旧设备残留命令也不能误写到新设备。
    if (this.device !== device) {
      throw new Error('The HID device changed before the command was sent.');
    }
    if (!device.opened) {
      await device.open();
      if (this.device !== device) {
        throw new Error('The HID device changed before the command was sent.');
      }
    }
    if (import.meta.env.DEV) console.debug('HID ->', toHexString(command));
    // TS 5.7+ distinguishes ArrayBuffer from SharedArrayBuffer-backed typed arrays;
    // WebHID accepts an ArrayBuffer-backed BufferSource, so make that ownership explicit.
    await device.sendReport(MouseCommands.reportId, new Uint8Array(command));
  }

  private toProtocolPacket(event: HIDInputReportEvent): Uint8Array | null {
    const view = event.data;
    const payload = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    if (payload.length === MouseCommands.payloadSize) {
      if (event.reportId !== MouseCommands.reportId) return null;
      const packet = new Uint8Array(payload.length + 1);
      packet[0] = event.reportId;
      packet.set(payload, 1);
      return packet;
    }
    if (payload.length === PACKET_SIZE && payload[0] === MouseCommands.reportId) {
      return payload;
    }
    return null;
  }
}

export const hidService = new BrowserHidService();
