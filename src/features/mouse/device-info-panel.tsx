import { Cable, Cpu, MonitorPlay } from 'lucide-react';
import { useMouseStore } from '@/stores/mouse-store';
import { useDeviceStore } from '@/stores/device-store';
import { useI18n } from '@/i18n/use-i18n';
import { formatUsbId } from '@/lib/hex';
import { PanelHeader } from '@/shared/ui/panel-header';
import { workModeKey } from './work-mode';

export function DeviceInfoPanel() {
  const { t } = useI18n();
  const device = useDeviceStore((state) => state.currentDevice);
  const previewMode = useDeviceStore((state) => state.previewMode);
  const version = useMouseStore((state) => state.version);
  const deviceType = useMouseStore((state) => state.deviceType);
  const workMode = useMouseStore((state) => state.workMode);
  const activeProfile = useMouseStore((state) => state.activeProfile);

  return (
    <div className="min-h-full bg-driver-bg text-driver-text">
      <PanelHeader
        title={t('nav.params')}
        subtitle={t('mouse.deviceInfoHint')}
        actions={
          <div className="flex items-center gap-2 rounded-md bg-driver-raised px-3 py-2 text-xs font-bold">
            {previewMode ? <MonitorPlay size={15} className="text-warn" /> : <Cable size={15} className="text-success" />}
            {previewMode ? t('app.demoData') : t('app.connected')}
          </div>
        }
      />

      <div className="p-6">
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-driver-line bg-driver-panel p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-warn/10 text-warn">
            <Cpu size={24} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-lg font-black">{device?.productName ?? t('mouse.previewDeviceName')}</div>
            <div className="mt-1 text-xs text-driver-muted">
              {t('mouse.connectionStatus')}: {previewMode ? t('app.preview') : t('app.connected')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <InfoRow label={t('mouse.version')} value={version} />
          <InfoRow label={t('mouse.workMode')} value={previewMode ? t('app.demoData') : t(workModeKey(workMode))} />
          <InfoRow label={t('mouse.profileStatus')} value={`Profile ${activeProfile + 1}`} />
          <InfoRow label={t('mouse.receiverStatus')} value={deviceType === 'mouse' ? t('mouse.mouse') : t('mouse.receiver')} />
          <InfoRow label="VID / PID" value={device ? `${formatUsbId(device.vendorId)} / ${formatUsbId(device.productId)}` : '—'} />
          <InfoRow label={t('mouse.protocolStatus')} value="WebHID · 0x09 · 17 bytes" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-driver-line bg-driver-panel p-5">
      <div className="text-xs font-bold uppercase tracking-wide text-driver-muted">{label}</div>
      <div className="mt-2 truncate text-base font-semibold">{value}</div>
    </div>
  );
}
