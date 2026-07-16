import { Check } from 'lucide-react';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';

const dpiStages = [
  { name: 'DPI 1', color: '#ff1717', value: 800 },
  { name: 'DPI 2', color: '#00c853', value: 1600 },
  { name: 'DPI 3', color: '#1769ff', value: 3200 },
  { name: 'DPI 4', color: '#ff7a00', value: 4000 },
  { name: 'DPI 5', color: '#8e24aa', value: 6000 },
  { name: 'DPI 6', color: '#00a6c8', value: 8000 },
];

export function DpiPanel() {
  const { t } = useI18n();
  const currentDpi = useMouseStore((state) => state.dpi);
  const updateDpi = useMouseStore((state) => state.updateDpi);

  return (
    <div className="min-h-full bg-driver-bg text-driver-text">
      <div className="flex items-center justify-between border-b border-driver-line bg-driver-panel px-6 py-4">
        <div>
          <h1 className="text-lg font-black">{t('nav.dpi')}</h1>
          <p className="mt-1 text-xs text-driver-muted">{t('mouse.chooseDpi')}</p>
        </div>
        <div className="rounded-md bg-driver-text px-4 py-2 text-sm font-semibold text-driver-panel">{currentDpi} DPI</div>
      </div>

      <div className="p-6">
        <section className="rounded-xl border border-driver-line bg-driver-panel p-6 shadow-sm">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-driver-muted">{t('mouse.currentDpi')}</div>
              <div className="mt-1 text-3xl font-black">{currentDpi} DPI</div>
            </div>
            <div className="rounded-full bg-warn/10 px-3 py-1.5 text-xs font-bold text-warn">{t('mouse.protocolFixedDpi')}</div>
          </div>

          <div className="relative pt-3">
            <div className="absolute left-[8.333%] right-[8.333%] top-8 h-1 rounded-full bg-driver-raised" aria-hidden="true" />
            <div className="relative grid grid-cols-6 gap-2">
              {dpiStages.map((stage) => {
                const active = currentDpi === stage.value;
                return (
                  <button
                    key={stage.name}
                    type="button"
                    aria-pressed={active}
                    aria-label={stage.name}
                    className={`group flex min-w-0 flex-col items-center rounded-lg px-2 pb-4 pt-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn ${
                      active ? 'bg-driver-raised' : 'hover:bg-driver-hover'
                    }`}
                    onClick={() => void updateDpi(stage.value)}
                  >
                    <span
                      className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-driver-panel shadow-sm transition ${active ? 'scale-110' : 'group-hover:scale-105'}`}
                      style={{ background: stage.color }}
                    >
                      {active && <Check size={16} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className="mt-3 text-xs font-bold text-driver-muted">{stage.name}</span>
                    <span className="mt-1 whitespace-nowrap text-sm font-black">{stage.value} DPI</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
