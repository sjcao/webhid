import { useEffect, useState } from 'react';
import { Copy, Play, RotateCcw, Save, Square } from 'lucide-react';
import { MacroRepeatType } from '@/protocol/mouse';
import { normalizeLoopTimes } from '@/stores/macro-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';

type MacroToolbarProps = {
  name: string;
  dirty: boolean;
  recording: boolean;
  repeatType: MacroRepeatType;
  loopTimes: number;
  onNameChange: (name: string) => void;
  onRepeatTypeChange: (repeatType: MacroRepeatType) => void;
  onLoopTimesChange: (loopTimes: number) => void;
  onToggleRecording: () => void;
  onDuplicate: () => void;
  onReset: () => void;
  onSave: () => void;
};

export function MacroToolbar({
  name,
  dirty,
  recording,
  repeatType,
  loopTimes,
  onNameChange,
  onRepeatTypeChange,
  onLoopTimesChange,
  onToggleRecording,
  onDuplicate,
  onReset,
  onSave,
}: MacroToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-driver-line bg-driver-panel px-3 py-2.5 shadow-sm sm:px-4 min-[1200px]:px-6">
      <div className="flex shrink-0 items-center gap-2">
        <span className="whitespace-nowrap text-xs font-bold text-driver-muted">{t('mouse.shortcutName')}:</span>
        <input
          type="text"
          maxLength={20}
          disabled={recording}
          aria-label={t('mouse.shortcutName')}
          className="h-8 w-36 rounded border border-driver-line bg-driver-raised px-2.5 text-xs font-bold text-driver-text outline-none focus:border-warn disabled:opacity-50 min-[1200px]:w-40"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${dirty ? 'bg-warn/10 text-warn' : 'bg-success/10 text-success'}`}>
          {dirty ? t('mouse.unsaved') : t('mouse.saved')}
        </span>
      </div>

      {/* 循环参数设置 */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs font-bold text-driver-muted">{t('mouse.repeatMode')}:</span>
          <select
            disabled={recording}
            aria-label={t('mouse.repeatMode')}
            className="h-8 rounded border border-driver-line bg-driver-raised px-2 text-xs font-bold text-driver-text outline-none focus:border-warn disabled:opacity-50"
            value={repeatType}
            onChange={(e) => onRepeatTypeChange(Number(e.target.value) as MacroRepeatType)}
          >
            <option value={MacroRepeatType.LoopTimes}>{t('mouse.repeatLoopTimes')}</option>
            <option value={MacroRepeatType.Hold}>{t('mouse.repeatHold')}</option>
            <option value={MacroRepeatType.UntilAssignedKey}>{t('mouse.repeatAssigned')}</option>
            <option value={MacroRepeatType.UntilAnyKey}>{t('mouse.repeatAny')}</option>
          </select>
        </div>

        {repeatType === MacroRepeatType.LoopTimes && (
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs font-bold text-driver-muted">{t('mouse.loopTimes')}:</span>
            <LoopCountInput value={loopTimes} disabled={recording} onChange={onLoopTimesChange} />
          </div>
        )}
      </div>

      {/* 控制按钮组 */}
      <div className="grid w-full grid-cols-4 items-center gap-1.5 sm:ml-auto sm:flex sm:w-auto sm:shrink-0">
        <Button
          variant={recording ? 'danger' : 'black'}
          onClick={onToggleRecording}
          className={`flex h-8 min-w-0 shrink-0 items-center gap-1 px-2 text-[11px] font-bold transition-all duration-200 sm:gap-1.5 sm:whitespace-nowrap sm:text-xs ${
            recording ? 'z-50 relative shadow-[0_0_15px_rgba(239,68,68,0.45)] ring-2 ring-red-500' : ''
          }`}
        >
          {recording ? (
            <>
              <Square size={13} fill="white" className="shrink-0" />
              <span className="truncate sm:whitespace-nowrap">{t('mouse.stopRecord')}</span>
            </>
          ) : (
            <>
              <Play size={13} fill="white" className="shrink-0" />
              <span className="truncate sm:whitespace-nowrap">{t('mouse.startRecord')}</span>
            </>
          )}
        </Button>

        <Button
          onClick={onDuplicate}
          disabled={recording || dirty}
          className="flex h-8 min-w-0 shrink-0 items-center gap-1 border border-driver-line bg-driver-panel px-2 text-[11px] font-bold text-driver-text shadow-sm hover:bg-driver-hover sm:gap-1.5 sm:whitespace-nowrap sm:text-xs"
        >
          <Copy size={13} className="shrink-0" />
          <span className="truncate sm:whitespace-nowrap">{t('mouse.duplicate')}</span>
        </Button>

        <Button
          onClick={onReset}
          disabled={recording}
          className="flex h-8 min-w-0 shrink-0 items-center gap-1 border border-driver-line bg-driver-panel px-2 text-[11px] font-bold text-driver-text shadow-sm hover:bg-driver-hover sm:gap-1.5 sm:whitespace-nowrap sm:text-xs"
        >
          <RotateCcw size={13} className="shrink-0" />
          <span className="truncate sm:whitespace-nowrap">{t('mouse.reset')}</span>
        </Button>

        <Button
          onClick={onSave}
          disabled={recording || !name.trim() || !dirty}
          className="flex h-8 min-w-0 shrink-0 items-center gap-1 bg-driver-text px-2 text-[11px] font-bold text-driver-panel shadow-sm hover:opacity-90 sm:gap-1.5 sm:whitespace-nowrap sm:text-xs"
        >
          <Save size={13} className="shrink-0" />
          <span className="truncate sm:whitespace-nowrap">{t('mouse.save')}</span>
        </Button>
      </div>
    </div>
  );
}

// 循环次数输入：保留原始输入串，失焦时再 clamp 到 [1, 255]
function LoopCountInput({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (val: number) => void;
}) {
  const { t } = useI18n();
  const [localVal, setLocalVal] = useState(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setLocalVal(raw);
    if (raw !== '') {
      const num = normalizeLoopTimes(Number(raw));
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  }

  function handleBlur() {
    if (localVal === '' || isNaN(Number(localVal))) {
      setLocalVal(String(value));
      return;
    }
    const num = normalizeLoopTimes(Number(localVal));
    setLocalVal(String(num));
    onChange(num);
  }

  return (
    <input
      type="number"
      min={1}
      max={255}
      disabled={disabled}
      aria-label={t('mouse.loopTimes')}
      className="h-8 w-16 rounded border border-driver-line bg-driver-raised px-2 text-xs font-bold text-driver-text outline-none focus:border-warn disabled:opacity-50"
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
