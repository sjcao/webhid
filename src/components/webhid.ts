// stores/hid.ts
import {defineStore} from 'pinia';
import {onMounted, onUnmounted} from 'vue';

type HIDDataHandler = (data: Uint8Array) => void;

export const useHIDStore = defineStore('hid', {
    state: () => ({
        device: null as HIDDevice | null,
        isConnected: false,
        listeners: new Set<HIDDataHandler>(),
    }),

    actions: {
        async disConnectDevice() {
            if (!this.isConnected) return;

            try {
                if (!this.device) return;
                if (this.device.opened) {
                    await this.device.close();
                }
                this.isConnected = false;

                this.device.oninputreport = null

                this.device.removeEventListener('close', this.handleDisconnect);
            } catch (error) {
                console.error('HID dis connection failed:', error);
            }
        },
        async connectDevice() {
            if (this.isConnected) return;

            try {
                if (!this.device) return;
                if (!this.device.opened) {
                    await this.device.open();
                }
                this.isConnected = true;

                this.device.oninputreport = (event) => {
                    const data = new Uint8Array(event.data.buffer);
                    this.listeners.forEach(handler => handler(data));
                };

                this.device.addEventListener('close', this.handleDisconnect);
            } catch (error) {
                console.error('HID connection failed:', error);
            }
        },

        handleDisconnect() {
            this.isConnected = false;
            this.device = null;
            this.listeners.clear();
        },

        registerListener(handler: HIDDataHandler) {
            this.listeners.add(handler);
        },

        unregisterListener(handler: HIDDataHandler) {
            this.listeners.delete(handler);
        },
        async sendData(data: Uint8Array) {
            if (!this.device) {
                return;
            }
            if (!this.device?.opened) {
                await this.device?.open();
                console.log("设备已打开 🎉");
            }

            const reportId = 0x01; // 设备报告 ID（通常需要查设备文档）

            try {
                await this.device?.sendReport(reportId, data);
                console.log("数据已发送 ✅");
            } catch (err) {
                console.error("发送数据失败：", err);
            }
        }
    },
});

export function useHIDListener(handler: (data: Uint8Array) => void) {
    const store = useHIDStore();

    onMounted(() => {
        store.registerListener(handler);
        if (!store.isConnected) store.connectDevice();
    });

    onUnmounted(() => {
        store.unregisterListener(handler);
    });
}

export async function setHIDDevice(hidDevice: HIDDevice) {
    const store = useHIDStore();
    if (store.isConnected) {
        await store.disConnectDevice()
    }
    store.device = hidDevice;

    await store.connectDevice();
}


export async function sendDataToDevice(data: Uint8Array) {
    const store = useHIDStore();
    await store.sendData(data);
}
