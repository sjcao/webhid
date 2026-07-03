import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
import { ButtonId, findKeyOption, keyGroups, KeyOption, mouseButtons } from '@/protocol/mouse';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';

const mouseImage = `${import.meta.env.BASE_URL}ic-moouse.png`;

export function ButtonsPanel() {
  const { t, locale } = useI18n();
  const [selectedButton, setSelectedButton] = useState<ButtonId>(ButtonId.Forward);
  const [confirmLeft, setConfirmLeft] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const readButton = useMouseStore((state) => state.readButton);
  const setButtonMapping = useMouseStore((state) => state.setButtonMapping);
  const resetButtons = useMouseStore((state) => state.resetButtons);
  const buttonConfigs = useMouseStore((state) => state.buttonConfigs);

  function chooseButton(buttonId: ButtonId) {
    if (buttonId === ButtonId.Left && selectedButton !== ButtonId.Left) {
      setConfirmLeft(true);
      return;
    }
    setSelectedButton(buttonId);
    void readButton(buttonId);
    setMappingOpen(true);
  }

  async function applyMapping(option: (typeof keyGroups)[number]['options'][number]) {
    await setButtonMapping({
      buttonId: selectedButton,
      functionType: option.functionType,
      index: option.index,
      values: option.values,
    });
    setMappingOpen(false);
  }

  const selectedButtonLabel = mouseButtons.find((button) => button.id === selectedButton);

  return (
    <div className="min-h-full bg-white text-[#101114]">
      <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-4">
        <div>
          <h1 className="text-lg font-black">{t('nav.buttons')}</h1>
          <p className="mt-1 text-xs text-[#7a808a]">{t('mouse.mappingHint')}</p>
        </div>
        <Button className="bg-[#eff0f2] text-[#1d2129] hover:bg-[#e5e6eb]" onClick={() => void resetButtons()}>
          {t('mouse.restoreDefault')}
        </Button>
      </div>

      <div className="relative flex min-h-[620px] flex-col items-center justify-center overflow-hidden bg-[#f6f7f9]">
        <div className="absolute inset-x-0 top-0 h-24 bg-white" />
        <div className="relative h-[500px] w-[520px] max-w-full">
          <img src={mouseImage} alt="mouse" className="mx-auto h-full object-contain drop-shadow-[0_20px_42px_rgba(0,0,0,0.28)]" />
          {mouseButtons.map((button) => {
            const config = buttonConfigs[button.id];
            const option = config ? findKeyOption(config.functionType, config.index, config.values) : null;
            const binding = option ? (locale === 'zh-CN' ? option.labelZh : option.label) : t('mouse.noBinding');
            return (
              <button
                key={button.id}
                className={`absolute w-[132px] rounded-md bg-white px-3 py-2 text-left text-sm font-black shadow-[0_10px_24px_rgba(0,0,0,0.13)] transition hover:-translate-y-0.5 ${
                  selectedButton === button.id ? 'ring-2 ring-warn' : ''
                } ${positionClass(button.id)}`}
                onClick={() => chooseButton(button.id)}
              >
                <span className="block text-[11px] font-semibold text-[#a9adb3]">{locale === 'zh-CN' ? button.labelZh : button.label}</span>
                <span className="mt-1 block truncate">{binding}</span>
              </button>
            );
          })}
          {mouseButtons.map((button) => (
            <span key={`dot-${button.id}`} className={`absolute h-6 w-6 rounded-full border-[3px] border-dotted border-warn ${dotClass(button.id)}`} />
          ))}
        </div>
      </div>

      <MappingDialog
        open={mappingOpen}
        title={t('mouse.functionLibrary')}
        buttonName={selectedButtonLabel ? (locale === 'zh-CN' ? selectedButtonLabel.labelZh : selectedButtonLabel.label) : ''}
        locale={locale}
        onOpenChange={setMappingOpen}
        onSelect={(option) => void applyMapping(option)}
      />

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
    </div>
  );
}

function MappingDialog({
  open,
  title,
  buttonName,
  locale,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  title: string;
  buttonName: string;
  locale: 'zh-CN' | 'en';
  onOpenChange: (open: boolean) => void;
  onSelect: (option: (typeof keyGroups)[number]['options'][number]) => void;
}) {
  const { t } = useI18n();
  const [activeGroup, setActiveGroup] = useState(keyGroups[0]?.id ?? 'default');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<KeyOption | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = keyGroups
    .filter((group) => activeGroup === 'all' || group.id === activeGroup)
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => {
        if (!normalizedQuery) return true;
        return `${option.label} ${option.labelZh}`.toLowerCase().includes(normalizedQuery);
      }),
    }))
    .filter((group) => group.options.length > 0);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(760px,calc(100vh-48px))] w-[min(1040px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white text-[#101114] shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
          <div className="flex h-16 items-center justify-between border-b border-[#eef0f2] px-6">
            <div>
              <DialogPrimitive.Title className="text-lg font-bold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-xs text-[#7a808a]">{t('mouse.selectedTarget')}: {buttonName}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-md p-2 text-[#5d6673] hover:bg-[#f0f1f3] hover:text-[#101114]">
              <X size={19} />
            </DialogPrimitive.Close>
          </div>

          <div className="flex items-center gap-3 border-b border-[#eef0f2] px-6 py-4">
            <div className="relative min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a9]" size={16} />
              <input
                className="h-10 w-full rounded-md border border-[#d7dbe2] bg-[#f7f8fa] pl-9 pr-3 text-sm outline-none focus:border-[#ff6b00]"
                placeholder={t('mouse.searchFunction')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-1 gap-2 overflow-auto">
              <button
                className={`shrink-0 rounded-md px-4 py-2 text-sm ${activeGroup === 'all' ? 'bg-black text-white' : 'bg-[#f0f1f3] text-[#6b7280]'}`}
                onClick={() => setActiveGroup('all')}
              >
                {t('mouse.allFunctions')}
              </button>
              {keyGroups.map((group) => (
                <button
                  key={group.id}
                  className={`shrink-0 rounded-md px-4 py-2 text-sm ${activeGroup === group.id ? 'bg-black text-white' : 'bg-[#f0f1f3] text-[#6b7280]'}`}
                  onClick={() => setActiveGroup(group.id)}
                >
                  {locale === 'zh-CN' ? group.labelZh : group.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid flex-1 gap-4 overflow-auto bg-[#f7f8fa] p-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleGroups.map((group) => (
              <div key={group.id} className="rounded-lg bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                <div className="mb-3 text-sm font-semibold">{locale === 'zh-CN' ? group.labelZh : group.label}</div>
                <div className="grid max-h-52 gap-2 overflow-auto pr-1">
                  {group.options.map((option) => (
                    <button
                      key={option.id}
                      className={`flex h-9 items-center justify-start rounded-md px-3 text-left text-sm transition ${
                        selected?.id === option.id ? 'bg-[#111827] text-white' : 'text-[#4b5563] hover:bg-[#f0f1f3] hover:text-[#111827]'
                      }`}
                      onClick={() => setSelected(option)}
                    >
                      {locale === 'zh-CN' ? option.labelZh : option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex h-16 items-center justify-between border-t border-[#eef0f2] px-6">
            <div className="text-sm text-[#7a808a]">
              {t('mouse.chooseFunction')}: <span className="font-semibold text-[#101114]">{selected ? (locale === 'zh-CN' ? selected.labelZh : selected.label) : '-'}</span>
            </div>
            <Button variant="primary" disabled={!selected} onClick={() => selected && onSelect(selected)}>
              {t('mouse.applyToButton')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function positionClass(buttonId: ButtonId) {
  switch (buttonId) {
    case ButtonId.Left:
      return 'left-[6%] top-[12%]';
    case ButtonId.Right:
      return 'right-[2%] top-[36%]';
    case ButtonId.Middle:
      return 'right-[15%] top-[15%]';
    case ButtonId.Forward:
      return 'left-[0%] top-[38%]';
    case ButtonId.Backward:
      return 'left-[10%] top-[58%]';
    case ButtonId.Dpi:
      return 'right-[19%] top-[4%]';
    default:
      return 'left-1/2 top-1/2';
  }
}

function dotClass(buttonId: ButtonId) {
  switch (buttonId) {
    case ButtonId.Left:
      return 'left-[31%] top-[17%]';
    case ButtonId.Right:
      return 'right-[25%] top-[39%]';
    case ButtonId.Middle:
      return 'right-[40%] top-[26%]';
    case ButtonId.Forward:
      return 'left-[25%] top-[43%]';
    case ButtonId.Backward:
      return 'left-[29%] top-[57%]';
    case ButtonId.Dpi:
      return 'right-[38%] top-[15%]';
    default:
      return 'left-1/2 top-1/2';
  }
}
