import { memo, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Menu, Trash2 } from 'lucide-react';
import { MacroActionKind, MacroDirection } from '@/stores/macro-store';
import { useI18n } from '@/i18n/use-i18n';
import { formatTemplate } from '../buttons/helpers';
import { EditorAction, MOUSE_BUTTON_LABEL_KEYS, mouseButtonKeyOf } from './helpers';

type MacroActionRowProps = {
  action: EditorAction;
  index: number;
  count: number;
  delay: number;
  recording: boolean;
  isCapturing: boolean;
  isDragged: boolean;
  onToggleCapture: (id: string) => void;
  onMove: (index: number, offset: -1 | 1) => void;
  onToggleDirection: (id: string, direction: MacroDirection) => void;
  onDelayChange: (index: number, value: number) => void;
  onRemove: (index: number) => void;
  onDragStart: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
};

export const MacroActionRow = memo(function MacroActionRow({
  action,
  index,
  count,
  delay,
  recording,
  isCapturing,
  isDragged,
  onToggleCapture,
  onMove,
  onToggleDirection,
  onDelayChange,
  onRemove,
  onDragStart,
  onDrop,
  onDragEnd,
}: MacroActionRowProps) {
  const { t } = useI18n();

  const isDown = action.direction === MacroDirection.Down;
  const mouseButton = action.kind === MacroActionKind.Mouse ? mouseButtonKeyOf(action) : null;
  const label = mouseButton
    ? formatTemplate(t(isDown ? 'mouse.mouseDownLabel' : 'mouse.mouseUpLabel'), {
        button: t(MOUSE_BUTTON_LABEL_KEYS[mouseButton]),
      })
    : action.keyName;

  return (
    <div
      draggable={!recording}
      onDragStart={(e) => {
        // Firefox 需要设置 dataTransfer 才会真正发起拖拽
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        onDragStart(index);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      onDragEnd={onDragEnd}
      className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border border-driver-line bg-driver-panel px-3 py-2 shadow-sm transition duration-150 min-[1200px]:px-4 ${
        isDragged ? 'scale-95 border-dashed border-warn opacity-40' : 'hover:bg-driver-hover'
      }`}
    >
      {/* 左侧：手柄和动作名 */}
      <div className="flex min-w-0 items-center gap-2 min-[1200px]:gap-4">
        {!recording && (
          <div className="cursor-grab text-driver-muted hover:text-driver-text" title={t('mouse.dragToSort')}>
            <Menu size={16} />
          </div>
        )}

        {/* 按键名胶囊徽标 */}
        <div className="relative group/btn">
          <button
            type="button"
            disabled={recording}
            onClick={() => onToggleCapture(action.id)}
            className={`flex h-9 items-center justify-center rounded px-4 text-xs font-black min-w-16 transition ${
              isCapturing
                ? 'animate-pulse border border-warn bg-warn text-white'
                : 'border border-driver-line bg-driver-raised text-driver-text hover:bg-driver-hover'
            }`}
          >
            {isCapturing ? t('mouse.capturingKey') : label}
          </button>

          {/* 悬浮提示气泡卡片 */}
          {!recording && !isCapturing && (
            <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 -translate-x-1/2 scale-0 whitespace-nowrap rounded bg-driver-text px-2.5 py-1 text-[10px] font-bold text-driver-panel shadow-lg transition duration-150 group-hover/btn:scale-100 group-focus-within/btn:scale-100">
              {t('mouse.pressKeyToModify')}
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-driver-text" />
            </div>
          )}
        </div>

        {/* 动作类型说明 */}
        <span className="text-[10px] font-black uppercase text-driver-muted">
          {action.kind === MacroActionKind.Mouse ? t('mouse.mouse') : t('mouse.keyboard')}
        </span>
      </div>

      {/* 右侧：方向按钮、延迟输入框和删除 */}
      <div className="flex shrink-0 items-center gap-2 min-[1200px]:gap-3">
        <div className="flex items-center rounded bg-driver-raised p-0.5">
          <button
            type="button"
            disabled={recording || index === 0}
            onClick={() => onMove(index, -1)}
            aria-label={t('mouse.moveUp')}
            title={t('mouse.moveUp')}
            className="rounded p-1.5 text-driver-muted transition hover:bg-driver-hover hover:text-driver-text disabled:opacity-30"
          >
            <ArrowUp size={13} />
          </button>
          <button
            type="button"
            disabled={recording || index === count - 1}
            onClick={() => onMove(index, 1)}
            aria-label={t('mouse.moveDown')}
            title={t('mouse.moveDown')}
            className="rounded p-1.5 text-driver-muted transition hover:bg-driver-hover hover:text-driver-text disabled:opacity-30"
          >
            <ArrowDown size={13} />
          </button>
        </div>
        {/* 方向单选按钮 */}
        <div className="flex rounded bg-driver-raised p-0.5">
          <button
            type="button"
            disabled={recording}
            onClick={() => onToggleDirection(action.id, MacroDirection.Down)}
            className={`rounded px-3 py-1.5 text-[10px] font-black transition flex items-center gap-1 ${
              isDown
                ? 'bg-driver-text text-driver-panel shadow-sm'
                : 'text-driver-muted hover:bg-driver-hover'
            }`}
          >
            ↓ {t('mouse.actionDown')}
          </button>
          <button
            type="button"
            disabled={recording}
            onClick={() => onToggleDirection(action.id, MacroDirection.Up)}
            className={`rounded px-3 py-1.5 text-[10px] font-black transition flex items-center gap-1 ${
              !isDown
                ? 'bg-driver-text text-driver-panel shadow-sm'
                : 'text-driver-muted hover:bg-driver-hover'
            }`}
          >
            ↑ {t('mouse.actionUp')}
          </button>
        </div>

        {/* 延迟时间修改：首行延迟不进协议，禁止编辑 */}
        <DelayInput
          value={delay}
          disabled={recording || index === 0}
          title={index === 0 ? t('mouse.delayNotSentHint') : undefined}
          onChange={(newVal) => onDelayChange(index, newVal)}
        />

        {/* 删除单个动作 */}
        <button
          type="button"
          disabled={recording}
          onClick={() => onRemove(index)}
          aria-label={t('mouse.delete')}
          title={t('mouse.delete')}
          className="rounded p-1.5 text-driver-muted transition hover:bg-driver-hover hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
});

function clampDelay(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(65535, Math.max(0, Math.round(value)));
}

function DelayInput({
  value,
  disabled,
  title,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  title?: string;
  onChange: (val: number) => void;
}) {
  const [localVal, setLocalVal] = useState(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setLocalVal(raw);
    if (raw === '') {
      onChange(0);
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num)) {
      onChange(clampDelay(num));
    }
  }

  function handleBlur() {
    const num = Number(localVal);
    const normalized = localVal === '' || Number.isNaN(num) ? 0 : clampDelay(num);
    setLocalVal(String(normalized));
    onChange(normalized);
  }

  function handleDecrease() {
    const current = localVal === '' ? 0 : Number(localVal);
    const next = clampDelay((Number.isNaN(current) ? 0 : current) - 10);
    setLocalVal(String(next));
    onChange(next);
  }

  function handleIncrease() {
    const current = localVal === '' ? 0 : Number(localVal);
    const next = clampDelay((Number.isNaN(current) ? 0 : current) + 10);
    setLocalVal(String(next));
    onChange(next);
  }

  return (
    <div title={title} className="flex h-8 w-[116px] shrink-0 items-center overflow-hidden rounded border border-driver-line bg-driver-raised">
      <button
        type="button"
        disabled={disabled}
        onClick={handleDecrease}
        aria-label="Decrease delay"
        className="h-full select-none border-r border-driver-line px-2 text-xs font-bold text-driver-muted transition hover:bg-driver-hover disabled:opacity-50"
      >
        -
      </button>
      <div className="flex-1 flex items-center px-1 min-w-0">
        <input
          type="number"
          min={0}
          max={65535}
          disabled={disabled}
          className="w-full bg-transparent text-xs font-bold outline-none text-right pr-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0 disabled:opacity-50"
          value={localVal}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <span className="shrink-0 select-none text-[10px] font-bold text-driver-muted">ms</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={handleIncrease}
        aria-label="Increase delay"
        className="h-full select-none border-l border-driver-line px-2 text-xs font-bold text-driver-muted transition hover:bg-driver-hover disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
