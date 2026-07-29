import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Cable, Check, ChevronRight, Cpu, Globe2, Grid2X2, Home, Keyboard, MonitorPlay, Moon, Mouse, Settings, SlidersHorizontal, Sun, X } from 'lucide-react';
import { hidService } from '@/services/hid/browser-hid-service';
import { useDeviceStore } from '@/stores/device-store';
import { MousePanel, useUiStore } from '@/stores/ui-store';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { OverviewPanel } from './overview-panel';
import { ButtonsPanel } from './buttons-panel';
import { MacroPanel } from './macro-panel';
import { DeviceInfoPanel } from './device-info-panel';
import { ResetPanel } from './reset-panel';
import { DpiPanel } from './dpi-panel';
import { workModeKey } from './work-mode';

const navItems: Array<{ id: MousePanel; icon: typeof Mouse; key: Parameters<ReturnType<typeof useI18n>['t']>[0] }> = [
  { id: 'buttons', icon: Mouse, key: 'nav.buttons' },
  { id: 'shortcuts', icon: Keyboard, key: 'nav.shortcuts' },
  { id: 'dpi', icon: Cpu, key: 'nav.dpi' },
  { id: 'params', icon: SlidersHorizontal, key: 'nav.params' },
  { id: 'profiles', icon: Grid2X2, key: 'nav.profiles' },
  { id: 'other', icon: Settings, key: 'nav.other' },
];

export function MouseWorkspacePage() {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const activePanel = useUiStore((state) => state.activePanel);
  const setActivePanel = useUiStore((state) => state.setActivePanel);
  const macroEditorDirty = useUiStore((state) => state.macroEditorDirty);
  const pendingPanel = useUiStore((state) => state.pendingPanel);
  const confirmPanelChange = useUiStore((state) => state.confirmPanelChange);
  const cancelPanelChange = useUiStore((state) => state.cancelPanelChange);
  const currentDevice = useDeviceStore((state) => state.currentDevice);
  const previewMode = useDeviceStore((state) => state.previewMode);
  const disconnectDevice = useDeviceStore((state) => state.disconnectDevice);
  const disconnectNotice = useDeviceStore((state) => state.disconnectNotice);
  const clearDisconnectNotice = useDeviceStore((state) => state.clearDisconnectNotice);
  const activeProfile = useMouseStore((state) => state.activeProfile);
  const dpi = useMouseStore((state) => state.dpi);
  const workMode = useMouseStore((state) => state.workMode);
  const deviceType = useMouseStore((state) => state.deviceType);
  const lastError = useMouseStore((state) => state.lastError);
  const deviceUnresponsive = useMouseStore((state) => state.deviceUnresponsive);
  const clearLastError = useMouseStore((state) => state.clearLastError);
  const handleInputReport = useMouseStore((state) => state.handleInputReport);
  const refreshInitialState = useMouseStore((state) => state.refreshInitialState);
  const [profileOpen, setProfileOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const closeDevice = useCallback(() => setDeviceOpen(false), []);

  useEffect(() => {
    const unsubscribe = hidService.subscribe(handleInputReport);
    return unsubscribe;
  }, [handleInputReport]);

  // 挂载及设备重连（热插拔后底层 HIDDevice 变化）时重新拉取设备状态
  const activeDevice = currentDevice?.device ?? null;
  useEffect(() => {
    if (!activeDevice && !previewMode) return;
    void refreshInitialState();
  }, [activeDevice, previewMode, refreshInitialState]);

  async function leaveWorkspace(force = false) {
    if (macroEditorDirty && !force) {
      setExitConfirmOpen(true);
      return;
    }
    try {
      await disconnectDevice();
    } finally {
      await navigate({ to: '/' });
    }
  }

  const banner = previewMode
    ? null
    : disconnectNotice
      ? { message: t('mouse.deviceDisconnected'), onDismiss: clearDisconnectNotice }
      : deviceUnresponsive
        ? { message: t('mouse.deviceUnresponsive'), onDismiss: clearLastError }
        : lastError
          ? { message: `${t('mouse.communicationError')}: ${lastError}`, onDismiss: clearLastError }
          : null;

  const panel = {
    buttons: <ButtonsPanel />,
    shortcuts: <MacroPanel />,
    dpi: <DpiPanel />,
    params: <DeviceInfoPanel />,
    profiles: <OverviewPanel />,
    other: <ResetPanel />,
  }[activePanel];

  return (
    <main className="min-h-screen bg-bg text-text">
      <header className="flex h-12 items-center justify-between bg-bg-soft px-5">
        <div className="flex h-full items-center gap-3">
          <button className="flex h-10 items-center gap-2 rounded-full bg-surface-2 px-5 text-sm font-semibold" onClick={() => void leaveWorkspace()}>
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="h-6 w-6" />
            <Home size={16} />
            {t('mouse.home')}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === 'dark' ? t('app.light') : t('app.dark')} title={theme === 'dark' ? t('app.light') : t('app.dark')}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')} aria-label={t('app.language')} title={t('app.language')}>
            <Globe2 size={20} />
          </Button>
        </div>
      </header>

      {/* 常驻 live region：容器始终存在，内容变化才能被屏幕阅读器稳定播报 */}
      <div role="alert" aria-live="assertive" className="pointer-events-none fixed left-1/2 top-14 z-50 -translate-x-1/2">
        {banner && (
          <div className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-md border border-danger/40 bg-surface-2 px-4 py-2 text-sm text-danger shadow-panel">
            <span className="min-w-0">{banner.message}</span>
            <button
              type="button"
              className="shrink-0 rounded p-1 hover:bg-surface-3"
              aria-label={t('mouse.dismiss')}
              onClick={banner.onDismiss}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="grid h-[calc(100vh-48px)] grid-cols-[72px_minmax(0,1fr)] gap-0 min-[1200px]:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col bg-surface-2 px-2 pb-3 pt-2">
          <button className="hidden rounded-md bg-surface-3 p-3 text-left shadow-[inset_0_0_0_1px_var(--color-line)] min-[1200px]:block" onClick={() => setActivePanel('params')}>
            <span className="flex items-center justify-between gap-2">
              <span className="block truncate text-sm font-semibold">{currentDevice?.productName ?? t('mouse.previewDeviceName')}</span>
              <ChevronRight size={16} className="shrink-0 text-muted" />
            </span>
            <span className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
              <span className="flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1.5">
                <Mouse size={14} />
                {deviceType === 'mouse' ? t('mouse.mouse') : t('mouse.receiver')}
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1.5">
                {previewMode ? <MonitorPlay size={14} /> : <Cable size={14} />}
                {previewMode ? t('app.preview') : t(workModeKey(workMode))}
              </span>
            </span>
          </button>

          <div className="relative z-20 mt-2 hidden rounded-md bg-surface-3 shadow-[inset_0_0_0_1px_var(--color-line)] min-[1200px]:block">
            <button
              className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-semibold"
              aria-expanded={profileOpen}
              aria-haspopup="dialog"
              aria-controls="profile-popover-desktop"
              onClick={() => setProfileOpen(true)}
            >
              <span>{t('mouse.profileSelector')}</span>
              <span className="flex items-center gap-2">
                <span className="rounded-md bg-surface-2 px-2 py-1 text-xs">P{activeProfile + 1}</span>
                <ChevronRight size={16} className="text-muted" />
              </span>
            </button>
            <div className="border-t border-line px-3 pb-3 pt-2 text-xs text-muted">
              {t('mouse.currentDpi')}: <span className="font-semibold text-text">{dpi}</span>
            </div>

            {profileOpen && (
              <ProfilePopover
                id="profile-popover-desktop"
                className="left-[calc(100%+10px)] top-0 w-[260px] shadow-[0_18px_48px_rgba(0,0,0,0.32)]"
                showDpi
                onClose={closeProfile}
              />
            )}
          </div>

          <div className="relative z-30 grid gap-2 min-[1200px]:hidden">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center rounded-md bg-surface-3 text-text shadow-[inset_0_0_0_1px_var(--color-line)]"
              aria-expanded={deviceOpen}
              aria-haspopup="dialog"
              aria-controls="device-popover-mobile"
              aria-label={currentDevice?.productName ?? t('mouse.previewDeviceName')}
              title={currentDevice?.productName ?? t('mouse.previewDeviceName')}
              onClick={() => {
                setDeviceOpen((open) => !open);
                setProfileOpen(false);
              }}
            >
              <Mouse size={20} />
            </button>
            {deviceOpen && (
              <PopoverShell
                id="device-popover-mobile"
                label={currentDevice?.productName ?? t('mouse.previewDeviceName')}
                className="left-[calc(100%+10px)] top-0 w-[270px] shadow-panel"
                onClose={closeDevice}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{currentDevice?.productName ?? t('mouse.previewDeviceName')}</div>
                    <div className="mt-1 text-xs text-muted">{previewMode ? t('app.preview') : t('app.connected')}</div>
                  </div>
                  <button type="button" className="rounded p-1 text-muted hover:bg-surface-3 hover:text-text" aria-label={t('mouse.cancel')} onClick={closeDevice}>
                    <X size={15} />
                  </button>
                </div>
                <button type="button" className="mt-3 flex w-full items-center justify-between rounded-md bg-surface-3 px-3 py-2 text-left text-xs font-semibold" onClick={() => { setActivePanel('params'); setDeviceOpen(false); }}>
                  {t('mouse.openDetails')}
                  <ChevronRight size={15} />
                </button>
              </PopoverShell>
            )}

            <button
              type="button"
              className="flex h-12 w-full items-center justify-center rounded-md bg-surface-3 text-xs font-bold text-text shadow-[inset_0_0_0_1px_var(--color-line)]"
              aria-expanded={profileOpen}
              aria-haspopup="dialog"
              aria-controls="profile-popover-mobile"
              aria-label={`${t('mouse.profileSelector')} P${activeProfile + 1}`}
              title={`${t('mouse.profileSelector')} P${activeProfile + 1}`}
              onClick={() => {
                setProfileOpen((open) => !open);
                setDeviceOpen(false);
              }}
            >
              P{activeProfile + 1}
            </button>
            {profileOpen && (
              <ProfilePopover
                id="profile-popover-mobile"
                className="left-[calc(100%+10px)] top-14 w-[260px] shadow-panel"
                onClose={closeProfile}
              />
            )}
          </div>

          <div className="hidden px-7 pb-2 pt-4 text-xs text-muted min-[1200px]:block">{t('nav.mouseConfig')}</div>
          <nav className="min-h-0 flex-1 space-y-1 overflow-auto px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`flex h-[46px] w-full items-center justify-center rounded-md px-0 py-3 text-sm transition min-[1200px]:justify-start min-[1200px]:gap-3 min-[1200px]:px-4 ${
                    activePanel === item.id ? 'bg-surface-4 font-semibold text-text shadow-[inset_3px_0_0_var(--color-warn)]' : 'text-text/90 hover:bg-surface-3'
                  }`}
                  aria-label={t(item.key)}
                  title={t(item.key)}
                  onClick={() => setActivePanel(item.id)}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="hidden truncate min-[1200px]:inline">{t(item.key)}</span>
                </button>
              );
            })}
          </nav>

        </aside>

        <section className="min-w-0 overflow-hidden bg-bg p-1">
          <div className="driver-theme-scope h-full overflow-auto rounded-md bg-driver-bg text-driver-text shadow-[0_0_0_1px_rgba(0,0,0,0.03)]">
            {panel}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={pendingPanel !== null}
        title={t('mouse.discardChanges')}
        description={t('mouse.discardChangesHint')}
        confirmLabel={t('mouse.discardChanges')}
        cancelLabel={t('mouse.cancel')}
        confirmVariant="danger"
        onOpenChange={(open) => !open && cancelPanelChange()}
        onConfirm={confirmPanelChange}
      />
      <ConfirmDialog
        open={exitConfirmOpen}
        title={t('mouse.discardChanges')}
        description={t('mouse.discardChangesHint')}
        confirmLabel={t('mouse.discardChanges')}
        cancelLabel={t('mouse.cancel')}
        confirmVariant="danger"
        onOpenChange={setExitConfirmOpen}
        onConfirm={() => {
          setExitConfirmOpen(false);
          void leaveWorkspace(true);
        }}
      />

    </main>
  );
}

function PopoverShell({ id, label, className, onClose, children }: {
  id: string;
  label: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        id={id}
        role="dialog"
        aria-label={label}
        className={`absolute rounded-md border border-line bg-surface-2 p-3 text-text ${className ?? ''}`}
      >
        {children}
      </div>
    </>
  );
}

function ProfilePopover({ id, className, showDpi = false, onClose }: {
  id: string;
  className?: string;
  showDpi?: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const activeProfile = useMouseStore((state) => state.activeProfile);
  const dpi = useMouseStore((state) => state.dpi);
  const selectProfile = useMouseStore((state) => state.selectProfile);

  return (
    <PopoverShell id={id} label={t('mouse.profileSelector')} className={className} onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">{t('mouse.profileSelector')}</div>
          <div className="mt-0.5 text-xs text-muted">{t('mouse.profileHint')}</div>
        </div>
        <button type="button" className="rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-text" aria-label={t('mouse.cancel')} onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((profile) => {
          const active = profile === activeProfile;
          return (
            <button
              key={profile}
              type="button"
              className={`flex h-11 items-center justify-between rounded-md px-3 text-sm font-semibold transition ${
                active ? 'bg-warn text-white' : 'bg-surface-3 text-text hover:bg-surface-4'
              }`}
              onClick={() => {
                void selectProfile(profile);
                onClose();
              }}
            >
              P{profile + 1}
              {active && <Check size={16} />}
            </button>
          );
        })}
      </div>
      {showDpi && (
        <div className="mt-3 rounded-md bg-surface-3 px-3 py-2 text-xs text-muted">
          {t('mouse.currentDpi')}: <span className="font-semibold text-text">{dpi}</span>
        </div>
      )}
    </PopoverShell>
  );
}
