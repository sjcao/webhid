import { Activity, Check, MousePointer2, SlidersHorizontal, Workflow } from 'lucide-react';
import { useMouseStore } from '@/stores/mouse-store';
import { useMacroStore } from '@/stores/macro-store';
import { useUiStore } from '@/stores/ui-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
import { workModeKey } from './work-mode';

export function OverviewPanel() {
  const { t } = useI18n();
  const setPanel = useUiStore((state) => state.setActivePanel);
  const dpi = useMouseStore((state) => state.dpi);
  const activeProfile = useMouseStore((state) => state.activeProfile);
  const selectProfile = useMouseStore((state) => state.selectProfile);
  const workMode = useMouseStore((state) => state.workMode);
  const macros = useMacroStore((state) => state.macros);

  return (
    <div className="min-h-full bg-white text-[#101114]">
      <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-4">
        <div>
          <h1 className="text-lg font-black">{t('nav.profiles')}</h1>
          <p className="mt-1 text-xs text-[#7a808a]">{t('mouse.profileHint')}</p>
        </div>
        <div className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white">Profile {activeProfile + 1}</div>
      </div>

      <div className="bg-[#f6f7f9] p-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric icon={SlidersHorizontal} label={t('mouse.currentDpi')} value={`${dpi}`} />
          <Metric icon={Workflow} label={t('mouse.profiles')} value={`Profile ${activeProfile + 1}`} />
          <Metric icon={Activity} label={t('mouse.workMode')} value={t(workModeKey(workMode))} />
          <Metric icon={MousePointer2} label={t('nav.shortcuts')} value={`${macros.length}`} />
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((profile) => {
            const active = activeProfile === profile;
            return (
              <button
                key={profile}
                className={`min-h-40 rounded-lg border p-5 text-left transition ${
                  active ? 'border-black bg-black text-white' : 'border-[#e6e8eb] bg-white hover:bg-[#fbfbfc]'
                }`}
                onClick={() => void selectProfile(profile)}
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-sm font-semibold">Profile {profile + 1}</span>
                  {active ? <Check size={18} /> : <span className="h-2.5 w-2.5 rounded-full bg-[#d6dae0]" />}
                </div>
                <div className={`text-xs ${active ? 'text-white/70' : 'text-[#7b818a]'}`}>{active ? t('mouse.profileActive') : t('mouse.profileHint')}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Button className="justify-start bg-white text-[#1d2129] hover:bg-[#eff0f2]" onClick={() => setPanel('buttons')}>
            <MousePointer2 size={16} />
            {t('nav.buttons')}
          </Button>
          <Button className="justify-start bg-white text-[#1d2129] hover:bg-[#eff0f2]" onClick={() => setPanel('dpi')}>
            <SlidersHorizontal size={16} />
            {t('nav.dpi')}
          </Button>
          <Button className="justify-start bg-white text-[#1d2129] hover:bg-[#eff0f2]" onClick={() => setPanel('shortcuts')}>
            <Workflow size={16} />
            {t('nav.shortcuts')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#ff6b00] shadow-sm">
        <Icon size={20} />
      </div>
      <div className="text-xs text-[#7a808a]">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}
