import { ButtonId, KeyFunctionType, MacroRepeatType } from '@/protocol/mouse';
import { useMouseStore } from '@/stores/mouse-store';
import { SavedMacro, useMacroStore } from '@/stores/macro-store';
import { useI18n } from '@/i18n/use-i18n';
import { formatTemplate } from './helpers';

type MacroBindListProps = {
  selectedButton: ButtonId;
};

export function MacroBindList({ selectedButton }: MacroBindListProps) {
  const { t } = useI18n();
  const macros = useMacroStore((state) => state.macros);
  const config = useMouseStore((state) => state.buttonConfigs[selectedButton]);
  const macroSlots = useMouseStore((state) => state.macroSlots);
  const bindMacroToButton = useMouseStore((state) => state.bindMacroToButton);
  const macroUploading = useMouseStore((state) => state.macroUploading);

  const boundMacroId = config?.functionType === KeyFunctionType.Macro ? macroSlots[config.index] : undefined;

  function repeatLabel(macro: SavedMacro) {
    switch (macro.repeatType) {
      case MacroRepeatType.Hold:
        return t('mouse.repeatHold');
      case MacroRepeatType.UntilAssignedKey:
        return t('mouse.repeatAssigned');
      case MacroRepeatType.UntilAnyKey:
        return t('mouse.repeatAny');
      case MacroRepeatType.LoopTimes:
      default:
        return `${macro.loopTimes}x`;
    }
  }

  return (
    <div className="space-y-3">
      {macros.length === 0 && (
        <div className="rounded-lg border border-dashed border-driver-line bg-driver-panel p-6 text-center text-xs font-semibold text-driver-muted">
          {t('mouse.noMacros')}
        </div>
      )}

      {macros.map((macro) => {
        const active = macro.id === boundMacroId;

        return (
          <div
            key={macro.id}
            className={`flex items-center justify-between rounded-lg bg-driver-panel p-3 border transition duration-200 ${
              active
                ? 'border-warn bg-warn/5 shadow-sm'
                : 'border-driver-line hover:bg-driver-hover'
            }`}
          >
            <div className="min-w-0 pr-2">
              <div className="truncate text-xs font-bold text-driver-text">{macro.name}</div>
              <div className="mt-1 text-[10px] font-semibold text-driver-muted">
                {formatTemplate(t('mouse.macroActionsCount'), { count: macro.actions.length })} · {repeatLabel(macro)}
              </div>
            </div>
            <button
              type="button"
              disabled={macroUploading}
              className={`rounded px-2.5 py-1.5 text-[10px] font-bold transition shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? 'bg-warn text-white'
                  : 'bg-driver-raised text-driver-text hover:bg-driver-hover'
              }`}
              onClick={() => void bindMacroToButton(selectedButton, macro)}
            >
              {active ? t('mouse.bound') : t('mouse.bind')}
            </button>
          </div>
        );
      })}
    </div>
  );
}
