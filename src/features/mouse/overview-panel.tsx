import { Activity, Check, SlidersHorizontal, Workflow } from 'lucide-react';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import { workModeKey } from './work-mode';

export function OverviewPanel() {
  const { t } = useI18n();
  const dpi = useMouseStore((state) => state.dpi);
  const activeProfile = useMouseStore((state) => state.activeProfile);
  const selectProfile = useMouseStore((state) => state.selectProfile);
  const workMode = useMouseStore((state) => state.workMode);

  return (
    <div className="min-h-full bg-driver-bg text-driver-text">
      <div className="flex items-center justify-between border-b border-driver-line bg-driver-panel px-6 py-4">
        <div>
          <h1 className="text-lg font-black">{t('nav.profiles')}</h1>
          <p className="mt-1 text-xs text-driver-muted">{t('mouse.profileHint')}</p>
        </div>
        <div className="rounded-md bg-driver-text px-4 py-2 text-sm font-semibold text-driver-panel">Profile {activeProfile + 1}</div>
      </div>

      <div className="p-6">
        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatusItem icon={SlidersHorizontal} label={t('mouse.currentDpi')} value={`${dpi} DPI`} />
          <StatusItem icon={Workflow} label={t('mouse.profileStatus')} value={`Profile ${activeProfile + 1}`} />
          <StatusItem icon={Activity} label={t('mouse.workMode')} value={t(workModeKey(workMode))} />
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((profile) => {
            const active = activeProfile === profile;
            return (
              <button
                key={profile}
                type="button"
                aria-pressed={active}
                className={`min-h-44 rounded-xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn ${
                  active
                    ? 'border-driver-text bg-driver-text text-driver-panel shadow-lg'
                    : 'border-driver-line bg-driver-panel text-driver-text hover:-translate-y-0.5 hover:bg-driver-hover'
                }`}
                onClick={() => void selectProfile(profile)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black">Profile {profile + 1}</span>
                  {active ? <Check size={18} /> : <span className="h-2.5 w-2.5 rounded-full bg-driver-muted/35" />}
                </div>
                <div className={`mt-12 text-xs font-semibold ${active ? 'text-driver-panel/70' : 'text-driver-muted'}`}>
                  {active ? t('mouse.profileActive') : t('mouse.profileHint')}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusItem({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-driver-line bg-driver-panel p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-warn/10 text-warn">
        <Icon size={19} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-driver-muted">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-bold">{value}</span>
      </span>
    </div>
  );
}
