import { useMemo } from 'react';
import { ButtonId, findKeyOption, KeyFunctionType, mouseButtons } from '@/protocol/mouse';
import { useMouseStore } from '@/stores/mouse-store';
import { useMacroStore } from '@/stores/macro-store';
import { useI18n } from '@/i18n/use-i18n';
import { MouseGraphic } from '../mouse-graphic';
import { formatTemplate, hidValueToName, modifierLabel, parseComboValues, pickLabel } from './helpers';

type MouseCanvasProps = {
  selectedButton: ButtonId;
  onChoose: (buttonId: ButtonId) => void;
};

export function MouseCanvas({ selectedButton, onChoose }: MouseCanvasProps) {
  const { t, locale } = useI18n();
  const buttonConfigs = useMouseStore((state) => state.buttonConfigs);
  const macroSlots = useMouseStore((state) => state.macroSlots);
  const macros = useMacroStore((state) => state.macros);

  // 预计算「设备槽位 → 宏名」映射，避免每个按键在渲染时各跑一次 macros.find
  const macroNameBySlot = useMemo(() => {
    const map: Record<number, string> = {};
    for (const [slot, macroId] of Object.entries(macroSlots)) {
      const macro = macros.find((item) => item.id === macroId);
      if (macro) map[Number(slot)] = macro.name;
    }
    return map;
  }, [macroSlots, macros]);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
      <div className="relative aspect-[2/3] h-full max-h-[540px] shrink-0">
        <MouseGraphic className="mx-auto h-full w-full drop-shadow-[0_20px_42px_rgba(0,0,0,0.18)]" />

        {/* 渲染每一个按键的绑定显示标签 */}
        {mouseButtons.map((button) => {
          const config = buttonConfigs[button.id];
          const option = config ? findKeyOption(config.functionType, config.index, config.values) : null;

          // 获取默认的功能文本（即按键出厂本身的物理名称）
          const defaultName = pickLabel(button, locale);
          let binding: string = defaultName;

          if (config) {
            if (config.functionType === KeyFunctionType.Default) {
              binding = defaultName;
            } else if (config.functionType === KeyFunctionType.BurstFire) {
              const interval = config.values[0];
              const count = config.values[1];
              binding = count === 0
                ? formatTemplate(t('mouse.burstHoldLabel'), { interval })
                : formatTemplate(t('mouse.burstTimesLabel'), { count, interval });
            } else if (config.functionType === KeyFunctionType.ComboKey) {
              // 组合键友好文本
              const { modifiers, normalValue } = parseComboValues(config.values);
              const modLabels = modifiers.map((value) => modifierLabel(value));
              const normalLabel = normalValue !== undefined ? hidValueToName(normalValue) : '';
              binding = [...modLabels, normalLabel].filter(Boolean).join('+') || defaultName;
            } else if (config.functionType === KeyFunctionType.Macro) {
              binding = macroNameBySlot[config.index] ?? t('mouse.unknownMacro');
            } else if (option) {
              binding = pickLabel(option, locale);
            }
          }

          const active = selectedButton === button.id;
          return (
            <button
              key={button.id}
              type="button"
              aria-pressed={active}
              aria-label={`${pickLabel(button, locale)}: ${binding}`}
              className={`absolute w-[130px] rounded-md px-3 py-2 text-left text-sm font-black shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition duration-200 hover:-translate-y-0.5 ${
                active
                  ? 'bg-driver-text text-driver-panel ring-2 ring-warn ring-offset-2 ring-offset-driver-bg'
                  : 'bg-driver-panel text-driver-text hover:bg-driver-hover'
              } ${positionClass(button.id)}`}
              onClick={() => onChoose(button.id)}
            >
              <span
                className={`block text-[11px] font-semibold ${
                  active ? 'text-driver-panel/65' : 'text-driver-muted'
                }`}
              >
                {pickLabel(button, locale)}
              </span>
              <span className="mt-0.5 block truncate font-bold text-xs">{binding}</span>
            </button>
          );
        })}

        {/* 渲染高亮圆圈指示器 */}
        {mouseButtons.map((button) => {
          const active = selectedButton === button.id;
          const label = pickLabel(button, locale);
          return (
            <button
              key={`dot-${button.id}`}
              type="button"
              aria-label={label}
              aria-pressed={active}
              title={label}
              className={`absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full p-0 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn focus-visible:ring-offset-2 focus-visible:ring-offset-driver-bg ${dotClass(button.id)} ${
                active
                  ? 'border-solid border-[3px] border-warn bg-warn/30 shadow-[0_0_12px_var(--color-warn)]'
                  : 'border-dotted border-[3px] border-warn/70 bg-transparent hover:scale-110 hover:border-solid'
              }`}
              onClick={() => onChoose(button.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function positionClass(buttonId: ButtonId) {
  switch (buttonId) {
    case ButtonId.Left:
      return 'right-[102%] top-[25%]';
    case ButtonId.Forward:
      return 'right-[102%] top-[44%]';
    case ButtonId.Backward:
      return 'right-[102%] top-[62%]';
    case ButtonId.Middle:
      return 'left-[102%] top-[20%]';
    case ButtonId.Right:
      return 'left-[102%] top-[35%]';
    case ButtonId.Dpi:
      return 'left-[102%] top-[54%]';
    default:
      return 'left-1/2 top-1/2';
  }
}

function dotClass(buttonId: ButtonId) {
  switch (buttonId) {
    case ButtonId.Left:
      return 'left-[33%] top-[30%]';
    case ButtonId.Right:
      return 'left-[67%] top-[30%]';
    case ButtonId.Middle:
      return 'left-[50%] top-[26.1%]';
    case ButtonId.Dpi:
      return 'left-[50%] top-[41.1%]';
    case ButtonId.Forward:
      return 'left-[16.3%] top-[42%]';
    case ButtonId.Backward:
      return 'left-[16%] top-[51.6%]';
    default:
      return 'left-1/2 top-1/2';
  }
}
