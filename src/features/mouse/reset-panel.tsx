import { useState } from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import { ConfirmDialog } from '@/shared/ui/dialog';

export function ResetPanel() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'buttons' | 'all' | null>(null);
  const resetButtons = useMouseStore((state) => state.resetButtons);
  const resetAll = useMouseStore((state) => state.resetAll);

  async function confirm() {
    if (mode === 'buttons') await resetButtons();
    if (mode === 'all') await resetAll();
    setMode(null);
  }

  return (
    <div className="min-h-full bg-white text-[#101114]">
      <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-4">
        <div>
          <h1 className="text-lg font-black">{t('nav.other')}</h1>
          <p className="mt-1 text-xs text-[#7a808a]">{t('mouse.resetHint')}</p>
        </div>
      </div>

      <div className="grid gap-4 bg-[#f6f7f9] p-6 md:grid-cols-2">
        <ResetAction
          icon={Settings2}
          title={t('mouse.resetButtons')}
          description={t('mouse.irreversible')}
          onClick={() => setMode('buttons')}
        />
        <ResetAction
          icon={RotateCcw}
          title={t('mouse.resetAll')}
          description={t('mouse.irreversible')}
          onClick={() => setMode('all')}
        />
      </div>

      <ConfirmDialog
        open={mode !== null}
        title={mode === 'all' ? t('mouse.resetAll') : t('mouse.resetButtons')}
        description={t('mouse.irreversible')}
        confirmLabel={t('mouse.confirm')}
        cancelLabel={t('mouse.cancel')}
        onOpenChange={(open) => !open && setMode(null)}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}

function ResetAction({ icon: Icon, title, description, onClick }: { icon: typeof RotateCcw; title: string; description: string; onClick: () => void }) {
  return (
    <button className="rounded-lg bg-white p-5 text-left shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5" onClick={onClick}>
      <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-[#fff0e7] text-[#ff6900]">
        <Icon size={22} />
      </span>
      <span className="block text-base font-bold">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-[#7a808a]">{description}</span>
      <span className="mt-5 inline-flex h-10 items-center rounded-md bg-[#ff4d4f]/10 px-4 text-sm font-semibold text-[#d9363e]">
        {title}
      </span>
    </button>
  );
}
