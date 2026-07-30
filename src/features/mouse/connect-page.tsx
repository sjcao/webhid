import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Globe2, MonitorPlay, Moon, RefreshCw, Sun, Usb } from 'lucide-react';
import { useDeviceStore } from '@/stores/device-store';
import { useUiStore } from '@/stores/ui-store';
import { useI18n } from '@/i18n/use-i18n';
import { formatUsbId } from '@/lib/hex';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { MouseGraphic } from './mouse-graphic';

export function ConnectPage() {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const supported = useDeviceStore((state) => state.supported);
  const devices = useDeviceStore((state) => state.devices);
  const connecting = useDeviceStore((state) => state.connecting);
  const error = useDeviceStore((state) => state.error);
  const errorKey = useDeviceStore((state) => state.errorKey);
  const refreshDevices = useDeviceStore((state) => state.refreshDevices);
  const requestDevice = useDeviceStore((state) => state.requestDevice);
  const connectDevice = useDeviceStore((state) => state.connectDevice);
  const enterPreviewMode = useDeviceStore((state) => state.enterPreviewMode);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  async function openWorkspace(deviceId?: string) {
    if (deviceId) {
      setConnectingId(deviceId);
      try {
        const connected = await connectDevice(deviceId);
        if (!connected) return;
      } finally {
        setConnectingId(null);
      }
    } else {
      enterPreviewMode();
    }
    await navigate({ to: '/workspace' });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-bg text-text">
      <header className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <img src="./logo.svg" alt="Logo" className="h-8 w-8" />
          <div className="text-base font-bold tracking-wide text-text">{t('app.title')}</div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === 'dark' ? t('app.light') : t('app.dark')} title={theme === 'dark' ? t('app.light') : t('app.dark')}>
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')} aria-label={t('app.language')} title={t('app.language')}>
            <Globe2 size={22} />
          </Button>
        </div>
      </header>

      <section className="relative flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-5 pb-10">
        <div className="absolute left-1/2 top-0 h-[32vh] w-3 -translate-x-1/2 bg-[#25272b] shadow-soft" />
        <div className="absolute left-1/2 top-[31vh] z-10 h-16 w-9 -translate-x-1/2 rounded-b-sm bg-[#2b2d31] shadow-soft before:absolute before:left-0 before:top-0 before:h-6 before:w-full before:rounded-t-sm before:bg-warn" />

        <div className="relative z-20 mt-10 flex w-full max-w-5xl flex-col items-center">
          <div className="relative w-full max-w-[540px]">
            <MouseGraphic className="mx-auto block h-[290px] w-auto max-w-full" />
            <Button
              variant="primary"
              className="absolute left-1/2 top-[54%] h-10 -translate-x-1/2 rounded-md bg-black px-6 text-base text-white hover:bg-black/90 shadow-md"
              onClick={requestDevice}
              disabled={!supported || connecting}
            >
              <Usb size={18} />
              {t('connect.pair')}
            </Button>
          </div>

          <h1 className="relative z-30 mt-6 text-center text-3xl font-black tracking-tight text-text md:text-4xl">
            {t('connect.title')}
          </h1>
          <p className="mt-6 text-center text-lg font-bold text-text/85">{t('connect.subtitle')}</p>
          <Button
            className="mt-4 rounded-md bg-surface-3 text-muted hover:bg-surface-4 hover:text-text"
            onClick={() => openWorkspace()}
            disabled={connecting}
          >
            <MonitorPlay size={17} />
            {t('connect.preview')}
          </Button>

          {!supported && (
            <div className="mt-6 rounded-lg border border-warn/35 bg-warn/10 px-4 py-3 text-sm text-warn">
              {t('connect.unsupported')}
            </div>
          )}
          {(errorKey || error) && (
            <div className="mt-6 rounded-lg border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorKey ? t(errorKey) : error}
            </div>
          )}

          <div className="mt-8 w-full max-w-3xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t('connect.authorized')} · {devices.length}
              </div>
              <Button variant="ghost" size="sm" onClick={refreshDevices}>
                <RefreshCw size={15} />
                {t('connect.refresh')}
              </Button>
            </div>

            {devices.length === 0 && (
              <div className="rounded-lg border border-dashed border-line bg-surface-2/60 p-4 text-center text-sm text-muted">
                {t('connect.noDevices')}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
            {devices.map((device) => (
              <button
                key={device.id}
                className="w-full rounded-lg border border-line bg-surface-2/70 p-4 text-left transition hover:border-brand/60 hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={connecting}
                aria-busy={connectingId === device.id}
                onClick={() => openWorkspace(device.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text">{device.productName}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                      <span>{t('connect.vendor')}: {formatUsbId(device.vendorId)}</span>
                      <span>{t('connect.product')}: {formatUsbId(device.productId)}</span>
                    </div>
                  </div>
                  <Badge className={connectingId === device.id ? 'border-warn/40 text-warn' : device.opened ? 'border-success/30 text-success' : ''}>
                    {connectingId === device.id ? t('connect.connecting') : device.opened ? t('app.connected') : t('app.disconnected')}
                  </Badge>
                </div>
              </button>
            ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
