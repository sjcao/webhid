import { useState } from 'react';
import { PanelRightOpen, RotateCcw } from 'lucide-react';
import { ButtonId } from '@/protocol/mouse';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { PanelHeader } from '@/shared/ui/panel-header';
import { MouseCanvas } from './buttons/mouse-canvas';
import { MappingSidebar } from './buttons/mapping-sidebar';

export function ButtonsPanel() {
  const { t } = useI18n();
  const [selectedButton, setSelectedButton] = useState<ButtonId>(ButtonId.Middle);
  const [confirmLeft, setConfirmLeft] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(() => (
    typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches
  ));

  const readButton = useMouseStore((state) => state.readButton);
  const resetButtons = useMouseStore((state) => state.resetButtons);

  // 选择鼠标上的按键
  function chooseButton(buttonId: ButtonId) {
    if (buttonId === ButtonId.Left && selectedButton !== ButtonId.Left) {
      setConfirmLeft(true);
      return;
    }
    setSelectedButton(buttonId);
    void readButton(buttonId);
    setMappingOpen(true);
  }

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-driver-bg text-driver-text">
      {/* 左侧：鼠标按键映射画布 */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <PanelHeader
          title={t('nav.buttons')}
          subtitle={t('mouse.mappingHint')}
          actions={
            <div className="flex items-center gap-2">
              {!mappingOpen && (
                <Button
                  className="border border-driver-line bg-driver-raised text-driver-text shadow-sm hover:bg-driver-hover"
                  onClick={() => setMappingOpen(true)}
                >
                  <PanelRightOpen size={16} />
                  {t('mouse.openFunctionLibrary')}
                </Button>
              )}
              <Button
                className="border border-driver-line bg-driver-panel text-driver-text shadow-sm hover:bg-driver-hover"
                aria-label={t('mouse.restoreDefault')}
                title={t('mouse.restoreDefault')}
                 onClick={() => setConfirmReset(true)}
              >
                <RotateCcw size={16} className="sm:hidden" />
                <span className="hidden sm:inline">{t('mouse.restoreDefault')}</span>
              </Button>
            </div>
          }
        />

        <MouseCanvas selectedButton={selectedButton} onChoose={chooseButton} />
      </div>

      {/* 右侧：改键侧边栏面板 */}
      <MappingSidebar open={mappingOpen} selectedButton={selectedButton} onClose={() => setMappingOpen(false)} />

      {/* 左键选中警告确认 Dialog */}
      <ConfirmDialog
        open={confirmLeft}
        title={t('mouse.selectButton')}
        description={t('mouse.leftClickWarning')}
        confirmLabel={t('mouse.confirm')}
        cancelLabel={t('mouse.cancel')}
        onOpenChange={setConfirmLeft}
        onConfirm={() => {
          setConfirmLeft(false);
          setSelectedButton(ButtonId.Left);
          void readButton(ButtonId.Left);
          setMappingOpen(true);
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        title={t('mouse.resetButtons')}
        description={`${t('mouse.resetButtonsDescription')} ${t('mouse.irreversible')}`}
        confirmLabel={t('mouse.confirm')}
        cancelLabel={t('mouse.cancel')}
        confirmVariant="danger"
        onOpenChange={setConfirmReset}
        onConfirm={() => {
          setConfirmReset(false);
          void resetButtons();
        }}
      />
    </div>
  );
}
