import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Battery, Cable, Check, ChevronRight, Cpu, Globe2, Grid2X2, Home, Keyboard, Mouse, Settings, SlidersHorizontal, Sun, X } from 'lucide-react';
import { hidService } from '@/services/hid/browser-hid-service';
import { useDeviceStore } from '@/stores/device-store';
import { MousePanel, useUiStore } from '@/stores/ui-store';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
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
  const currentDevice = useDeviceStore((state) => state.currentDevice);
  const previewMode = useDeviceStore((state) => state.previewMode);
  const disconnectDevice = useDeviceStore((state) => state.disconnectDevice);
  const activeProfile = useMouseStore((state) => state.activeProfile);
  const selectProfile = useMouseStore((state) => state.selectProfile);
  const dpi = useMouseStore((state) => state.dpi);
  const workMode = useMouseStore((state) => state.workMode);
  const handleInputReport = useMouseStore((state) => state.handleInputReport);
  const refreshInitialState = useMouseStore((state) => state.refreshInitialState);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setActivePanel('buttons');
    const unsubscribe = hidService.subscribe(handleInputReport);
    void refreshInitialState();
    return unsubscribe;
  }, [handleInputReport, refreshInitialState, setActivePanel]);

  async function leaveWorkspace() {
    await disconnectDevice();
    await navigate({ to: '/' });
  }

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
          <button className="flex h-10 items-center gap-2 rounded-full bg-surface-2 px-5 text-sm font-semibold" onClick={leaveWorkspace}>
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="h-6 w-6" />
            <Home size={16} />
            {t('mouse.home')}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'dark' ? t('app.light') : t('app.dark')}>
            <Sun size={20} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')} title={t('app.language')}>
            <Globe2 size={20} />
          </Button>
        </div>
      </header>

      <div className="grid h-[calc(100vh-48px)] grid-cols-[228px_1fr] gap-0">
        <aside className="flex min-h-0 flex-col bg-surface-2 px-2 pb-3 pt-2">
          <button className="rounded-md bg-surface-3 p-3 text-left shadow-[inset_0_0_0_1px_var(--color-line)]" onClick={() => setActivePanel('params')}>
            <span className="flex items-center justify-between gap-2">
              <span className="block truncate text-sm font-semibold">{currentDevice?.productName ?? t('mouse.previewDeviceName')}</span>
              <ChevronRight size={16} className="shrink-0 text-muted" />
            </span>
            <span className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
              <span className="flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1.5">
                <Battery size={14} />
                100%
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1.5">
                <Cable size={14} />
                {previewMode ? t('app.preview') : t(workModeKey(workMode))}
              </span>
            </span>
          </button>

          <div className="relative z-20 mt-2 rounded-md bg-surface-3 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <button
              className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-semibold"
              aria-expanded={profileOpen}
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
              <div className="absolute left-[calc(100%+10px)] top-0 w-[260px] rounded-md border border-line bg-surface-2 p-3 text-text shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{t('mouse.profileSelector')}</div>
                    <div className="mt-0.5 text-xs text-muted">{t('mouse.profileHint')}</div>
                  </div>
                  <button className="rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-text" aria-label={t('mouse.cancel')} onClick={() => setProfileOpen(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((profile) => {
                    const active = profile === activeProfile;
                    return (
                      <button
                        key={profile}
                        className={`flex h-11 items-center justify-between rounded-md px-3 text-sm font-semibold transition ${
                          active ? 'bg-warn text-white' : 'bg-surface-3 text-text hover:bg-surface-4'
                        }`}
                        onClick={() => {
                          void selectProfile(profile);
                          setProfileOpen(false);
                        }}
                      >
                        P{profile + 1}
                        {active && <Check size={16} />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-md bg-surface-3 px-3 py-2 text-xs text-muted">
                  {t('mouse.currentDpi')}: <span className="font-semibold text-text">{dpi}</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-7 pb-2 pt-4 text-xs text-muted">{t('nav.mouseConfig')}</div>
          <nav className="min-h-0 flex-1 space-y-1 overflow-auto px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`flex h-[46px] w-full items-center gap-3 rounded-md px-4 py-3 text-sm transition ${
                    activePanel === item.id ? 'bg-surface-4 font-semibold text-text shadow-[inset_3px_0_0_var(--color-warn)]' : 'text-text/90 hover:bg-surface-3'
                  }`}
                  onClick={() => setActivePanel(item.id)}
                >
                  <Icon size={18} />
                  {t(item.key)}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 px-5 py-4 text-xs text-muted">BUG反馈</div>
        </aside>

        <section className="min-w-0 overflow-hidden bg-bg p-1">
          <div className="driver-theme-scope h-full overflow-auto rounded-md bg-white text-[#101114] shadow-[0_0_0_1px_rgba(0,0,0,0.03)]">
            {panel}
          </div>
        </section>
      </div>

    </main>
  );
}
