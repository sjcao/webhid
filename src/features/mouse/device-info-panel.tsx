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
  const connected = Boolean(device);
  const status = previewMode ? t('app.preview') : connected ? t('app.connected') : t('app.disconnected');

  return (
    <div className="min-h-full bg-driver-bg text-driver-text">
      <PanelHeader
        title={t('nav.params')}
        subtitle={t('mouse.deviceInfoHint')}
        actions={
          <div className="flex items-center gap-2 rounded-md bg-driver-raised px-3 py-2 text-xs font-bold">
             {previewMode ? <MonitorPlay size={15} className="text-warn" /> : <Cable size={15} className={connected ? 'text-success' : 'text-danger'} />}
             {status}
          </div>
        }
      />

      <div className="p-3 sm:p-6">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-driver-line bg-driver-panel p-4 sm:mb-4 sm:p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-warn/10 text-warn">
            <Cpu size={24} />
          </span>
          <div className="min-w-0">
             <div className="truncate text-lg font-black">{device?.productName ?? (previewMode ? t('mouse.previewDeviceName') : '—')}</div>
             <div className="mt-1 text-xs text-driver-muted">
               {t('mouse.connectionStatus')}: {status}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          <InfoRow label={t('mouse.version')} value={previewMode || connected ? version : '—'} />
          <InfoRow label={t('mouse.workMode')} value={previewMode ? t('app.demoData') : connected ? t(workModeKey(workMode)) : '—'} />
          <InfoRow label={t('mouse.profileStatus')} value={previewMode || connected ? `Profile ${activeProfile + 1}` : '—'} />
          <InfoRow label={t('mouse.receiverStatus')} value={previewMode || connected ? (deviceType === 'mouse' ? t('mouse.mouse') : t('mouse.receiver')) : '—'} />
          <InfoRow label="VID / PID" value={device ? `${formatUsbId(device.vendorId)} / ${formatUsbId(device.productId)}` : '—'} />
          <InfoRow label={t('mouse.protocolStatus')} value="WebHID · 0x09 · 17 bytes" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-driver-line bg-driver-panel p-4 sm:p-5">
      <div className="text-xs font-bold uppercase tracking-wide text-driver-muted">{label}</div>
      <div className="mt-2 truncate text-base font-semibold">{value}</div>
    </div>
  );
}
