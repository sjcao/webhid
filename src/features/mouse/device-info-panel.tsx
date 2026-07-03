import { useMouseStore } from '@/stores/mouse-store';
import { useDeviceStore } from '@/stores/device-store';
import { useI18n } from '@/i18n/use-i18n';
import { workModeKey } from './work-mode';

export function DeviceInfoPanel() {
  const { t } = useI18n();
  const device = useDeviceStore((state) => state.currentDevice);
  const version = useMouseStore((state) => state.version);
  const deviceType = useMouseStore((state) => state.deviceType);
  const workMode = useMouseStore((state) => state.workMode);
  const activeProfile = useMouseStore((state) => state.activeProfile);

  return (
    <div className="min-h-full bg-white text-[#101114]">
      <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-4">
        <div>
          <h1 className="text-lg font-black">{t('nav.params')}</h1>
          <p className="mt-1 text-xs text-[#7a808a]">{t('mouse.deviceInfoHint')}</p>
        </div>
        <div className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white">{t('mouse.deviceStatus')}</div>
      </div>

      <div className="grid gap-4 bg-[#f6f7f9] p-6 lg:grid-cols-3">
        <InfoRow label={t('mouse.model')} value={device?.productName ?? t('mouse.previewDeviceName')} />
        <InfoRow label={t('mouse.version')} value={version} />
        <InfoRow label={t('mouse.workMode')} value={t(workModeKey(workMode))} />
        <InfoRow label={t('mouse.profileStatus')} value={`Profile ${activeProfile + 1}`} />
        <InfoRow label={t('mouse.receiverStatus')} value={deviceType === 'mouse' ? t('mouse.mouse') : t('mouse.receiver')} />
        <InfoRow label="VID/PID" value={device ? `${device.vendorId}/${device.productId}` : t('app.preview')} />
        <InfoRow label={t('mouse.protocolStatus')} value="WebHID 0x09 / 17 bytes" />
        <InfoRow label={t('mouse.batteryLevel')} value="100%" />
        <InfoRow label={t('mouse.connectedBy')} value={device ? t('app.connected') : t('app.preview')} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="text-xs uppercase tracking-wide text-[#7a808a]">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}
