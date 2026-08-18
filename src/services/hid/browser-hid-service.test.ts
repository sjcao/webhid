import { describe, expect, it, vi } from 'vitest';
import { MouseCommands } from '@/protocol/mouse';
import { BrowserHidService, UnsupportedDeviceError, isDeviceSupported } from './browser-hid-service';

type FakeDevice = HIDDevice & {
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  sendReport: ReturnType<typeof vi.fn>;
  emitInput: (reportId: number, payload: Uint8Array) => void;
};

function fakeDevice({ protocol = true } = {}): FakeDevice {
  const listeners = new Map<string, EventListenerOrEventListenerObject>();
  const device = {
    opened: false,
    vendorId: 0x1189,
    productId: 0x2011,
    productName: 'Test Mouse',
    collections: protocol
      ? [{ outputReports: [{ reportId: MouseCommands.reportId }], children: [] }]
      : [],
    open: vi.fn(async () => { device.opened = true; }),
    close: vi.fn(async () => { device.opened = false; }),
    sendReport: vi.fn(async () => {}),
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.set(type, listener);
    }),
    removeEventListener: vi.fn((type: string) => {
      listeners.delete(type);
    }),
    emitInput: (reportId: number, payload: Uint8Array) => {
      const listener = listeners.get('inputreport');
      if (!listener) return;
      const event = {
        device,
        reportId,
        data: new DataView(payload.buffer, payload.byteOffset, payload.byteLength),
      } as unknown as HIDInputReportEvent;
      if (typeof listener === 'function') listener(event as unknown as Event);
      else listener.handleEvent(event as unknown as Event);
    },
  };
  return device as unknown as FakeDevice;
}

describe('BrowserHidService', () => {
  it('rejects devices that do not expose report 0x09', async () => {
    const service = new BrowserHidService();
    const device = fakeDevice({ protocol: false });

    await expect(service.connect(device)).rejects.toBeInstanceOf(UnsupportedDeviceError);
    expect(device.open).not.toHaveBeenCalled();
  });

  it('sends report 0x09 without the report id and snapshots mutable commands', async () => {
    const service = new BrowserHidService();
    const device = fakeDevice();
    await service.connect(device);
    const command = MouseCommands.readDpi();
    const expected = Array.from(command);

    const sending = service.send(command);
    command.fill(0);
    await sending;

    expect(device.sendReport).toHaveBeenCalledTimes(1);
    expect(device.sendReport.mock.calls[0][0]).toBe(MouseCommands.reportId);
    expect(Array.from(device.sendReport.mock.calls[0][1] as Uint8Array)).toEqual(expected);
  });

  it('reconstructs the omitted report id on incoming WebHID payloads', async () => {
    const service = new BrowserHidService();
    const device = fakeDevice();
    const received: Uint8Array[] = [];
    service.subscribe((packet) => received.push(packet));
    await service.connect(device);

    device.emitInput(MouseCommands.reportId, Uint8Array.from({ length: 16 }, (_, index) => index));
    device.emitInput(0x08, new Uint8Array(16));

    expect(received).toHaveLength(1);
    expect(received[0]).toHaveLength(17);
    expect(Array.from(received[0].slice(0, 4))).toEqual([MouseCommands.reportId, 0, 1, 2]);
  });

  it('does not leak queued commands onto a newly connected device', async () => {
    const service = new BrowserHidService();
    const firstDevice = fakeDevice();
    const secondDevice = fakeDevice();
    let finishFirst!: () => void;
    firstDevice.sendReport.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    await service.connect(firstDevice);

    const first = service.send(MouseCommands.readDpi());
    await vi.waitFor(() => expect(firstDevice.sendReport).toHaveBeenCalledTimes(1));
    const queuedForFirstDevice = service.send(MouseCommands.readProfile());
    await service.connect(secondDevice);
    finishFirst();

    await first;
    await expect(queuedForFirstDevice).rejects.toThrow(/device changed/);
    expect(secondDevice.sendReport).not.toHaveBeenCalled();
  });

  it('correctly identifies whether a device supports the protocol', () => {
    const supportedDevice = fakeDevice({ protocol: true });
    const unsupportedDevice = fakeDevice({ protocol: false });

    expect(isDeviceSupported(supportedDevice)).toBe(true);
    expect(isDeviceSupported(unsupportedDevice)).toBe(false);
  });
});
