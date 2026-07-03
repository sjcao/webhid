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
    <div className="min-h-full bg-white text-[#101114]">
      <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-4">
        <div>
          <h1 className="text-lg font-black">{t('nav.dpi')}</h1>
          <p className="mt-1 text-xs text-[#7a808a]">{t('mouse.protocolFixedDpi')}</p>
        </div>
        <div className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white">{currentDpi} DPI</div>
      </div>

      <div className="grid gap-4 bg-[#f6f7f9] p-6 lg:grid-cols-2">
        {dpiStages.map((stage) => {
          const active = currentDpi === stage.value;
          return (
            <button
              key={stage.name}
              className={`rounded-lg bg-white p-6 text-left shadow-[0_1px_0_rgba(0,0,0,0.04)] transition ${active ? 'ring-2 ring-black' : 'hover:bg-[#fbfbfc]'}`}
              onClick={() => void updateDpi(stage.value)}
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#dedfe2] px-4 py-2 text-sm">
                  <span className="h-4 w-4 rounded-full" style={{ background: stage.color }} />
                  {stage.name}
                </span>
                {active && <span className="rounded-full bg-black px-3 py-1 text-xs text-white">{t('mouse.active')}</span>}
              </div>

              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">DPI</span>
                <span className="rounded-md border border-[#d5dae2] bg-white px-4 py-1 text-sm font-semibold">{stage.value}</span>
              </div>
              <div className="relative h-3 rounded-full bg-[#e2e5eb]">
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#333] bg-white"
                  style={{ left: `${Math.min((stage.value / 8000) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-[#6b7280]">
                <span>800</span>
                <span>3200</span>
                <span>6000</span>
                <span>8000</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
