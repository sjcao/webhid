import { useState } from 'react';
import { ChevronRight, RotateCcw, Settings2 } from 'lucide-react';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { PanelHeader } from '@/shared/ui/panel-header';

export function ResetPanel() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'buttons' | 'all' | null>(null);
  const resetButtons = useMouseStore((state) => state.resetButtons);
  const resetAll = useMouseStore((state) => state.resetAll);

  async function confirm() {
    // 先关闭对话框再执行异步重置，避免异步期间对话框状态与操作错位
    const target = mode;
    setMode(null);
    if (target === 'buttons') await resetButtons();
    if (target === 'all') await resetAll();
  }

  const description = mode === 'all' ? t('mouse.resetAllDescription') : t('mouse.resetButtonsDescription');

  return (
    <div className="min-h-full bg-driver-bg text-driver-text">
      <PanelHeader title={t('nav.other')} subtitle={t('mouse.resetHint')} />

      <div className="p-6">
        <div className="overflow-hidden rounded-xl border border-driver-line bg-driver-panel">
          <ResetAction
            icon={Settings2}
            title={t('mouse.resetButtons')}
            description={t('mouse.resetButtonsDescription')}
            onClick={() => setMode('buttons')}
          />
          <ResetAction
            icon={RotateCcw}
            title={t('mouse.resetAll')}
            description={t('mouse.resetAllDescription')}
            onClick={() => setMode('all')}
            separated
          />
        </div>
      </div>

      <ConfirmDialog
        open={mode !== null}
        title={mode === 'all' ? t('mouse.resetAll') : t('mouse.resetButtons')}
        description={`${description} ${t('mouse.irreversible')}`}
        confirmLabel={t('mouse.confirm')}
        cancelLabel={t('mouse.cancel')}
        confirmVariant="danger"
        onOpenChange={(open) => !open && setMode(null)}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}

function ResetAction({
  icon: Icon,
  title,
  description,
  onClick,
  separated = false,
}: {
  icon: typeof RotateCcw;
  title: string;
  description: string;
  onClick: () => void;
  separated?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-4 px-5 py-5 text-left transition hover:bg-driver-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-danger ${separated ? 'border-t border-driver-line' : ''}`}
      onClick={onClick}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-driver-muted">{description}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-danger">
        {title}
        <ChevronRight size={15} />
      </span>
    </button>
  );
}
