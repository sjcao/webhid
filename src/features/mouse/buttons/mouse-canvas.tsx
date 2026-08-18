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
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 sm:p-4">
      <div className="relative aspect-[26/25] w-full max-w-[460px] shrink-0">
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
              const count = Math.max(1, config.values[1] ?? 1);
              binding = formatTemplate(t('mouse.burstTimesLabel'), { count, interval });
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
              className={`absolute w-[104px] rounded-md px-2 py-1.5 text-left text-sm font-black shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition duration-200 hover:-translate-y-0.5 sm:w-[136px] sm:px-3 sm:py-2 ${
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
                  ? 'border-solid border-[3px] border-warn bg-warn/30 shadow-[0_0_10px_var(--color-warn)]'
                  : 'border-dotted border-[3px] border-warn/70 bg-transparent hover:scale-105 hover:border-solid'
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
      return 'right-[70%] top-[14%] sm:right-[78%]';
    case ButtonId.Forward:
      return 'right-[70%] top-[38%] sm:right-[78%]';
    case ButtonId.Backward:
      return 'right-[70%] top-[58%] sm:right-[78%]';
    case ButtonId.Right:
      return 'left-[70%] top-[14%] sm:left-[78%]';
    case ButtonId.Middle:
      return 'left-[70%] top-[34%] sm:left-[78%]';
    case ButtonId.Dpi:
      return 'left-[70%] top-[55%] sm:left-[78%]';
    default:
      return 'left-1/2 top-1/2';
  }
}

function dotClass(buttonId: ButtonId) {
  switch (buttonId) {
    case ButtonId.Left:
      return 'left-[38%] top-[17%]';
    case ButtonId.Right:
      return 'left-[62%] top-[17%]';
    case ButtonId.Middle:
      return 'left-[50%] top-[20%]';
    case ButtonId.Dpi:
      return 'left-[50%] top-[7.5%]';
    case ButtonId.Forward:
      return 'left-[30.5%] top-[44%]';
    case ButtonId.Backward:
      return 'left-[30.5%] top-[51.5%]';
    default:
      return 'left-1/2 top-1/2';
  }
}
