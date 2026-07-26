import { useEffect, useRef, useState } from 'react';
import { ButtonId, KeyFunctionType } from '@/protocol/mouse';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';

const DEFAULT_INTERVAL = 3;
const DEFAULT_COUNT = 1;

function clampByte(raw: string, fallback: number) {
  const parsed = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(parsed)) return fallback;
  return Math.min(255, Math.max(1, Math.round(parsed)));
}

type BurstFireFormProps = {
  selectedButton: ButtonId;
};

export function BurstFireForm({ selectedButton }: BurstFireFormProps) {
  const { t } = useI18n();
  const config = useMouseStore((state) => state.buttonConfigs[selectedButton]);
  const setButtonMapping = useMouseStore((state) => state.setButtonMapping);

  const [intervalText, setIntervalText] = useState(String(DEFAULT_INTERVAL));
  const [burstMode, setBurstMode] = useState<'times' | 'hold'>('times');
  const [countText, setCountText] = useState(String(DEFAULT_COUNT));
  const lastSyncedRef = useRef<string | null>(null);

  // 配置回显；内容未变的重复响应不覆盖未保存草稿
  useEffect(() => {
    const signature =
      config?.functionType === KeyFunctionType.BurstFire
        ? `${selectedButton}:${config.values.join(',')}`
        : `${selectedButton}:none`;
    if (lastSyncedRef.current === signature) return;
    lastSyncedRef.current = signature;
    if (config?.functionType === KeyFunctionType.BurstFire) {
      const interval = config.values[0] ?? DEFAULT_INTERVAL;
      const count = config.values[1] ?? 0;
      setIntervalText(String(interval));
      if (count === 0) {
        setBurstMode('hold');
        setCountText(String(DEFAULT_COUNT));
      } else {
        setBurstMode('times');
        setCountText(String(count));
      }
    } else {
      setIntervalText(String(DEFAULT_INTERVAL));
      setBurstMode('times');
      setCountText(String(DEFAULT_COUNT));
    }
  }, [selectedButton, config]);

  async function saveBurstFire() {
    const interval = clampByte(intervalText, DEFAULT_INTERVAL);
    const count = burstMode === 'hold' ? 0 : clampByte(countText, DEFAULT_COUNT);
    setIntervalText(String(interval));
    if (burstMode === 'times') {
      setCountText(String(count));
    }
    await setButtonMapping({
      buttonId: selectedButton,
      functionType: KeyFunctionType.BurstFire,
      index: 0,
      values: [interval, count],
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-driver-line bg-driver-panel p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-driver-line pb-2">
        <span className="text-sm font-black text-driver-text">{t('mouse.burstFire')}</span>
        <span className="rounded bg-warn/10 px-2 py-0.5 text-[10px] font-black text-warn">
          Burst
        </span>
      </div>

      <div className="space-y-3">
        {/* 点击间隔 */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-driver-muted">{t('mouse.clickInterval')}</span>
          <div className="flex items-center rounded-md border border-driver-line bg-driver-raised px-3">
            <input
              type="number"
              min={1}
              max={255}
              className="h-9 w-full bg-transparent text-xs font-semibold outline-none"
              value={intervalText}
              onChange={(e) => setIntervalText(e.target.value)}
              onBlur={() => setIntervalText(String(clampByte(intervalText, DEFAULT_INTERVAL)))}
            />
            <span className="ml-2 text-xs text-driver-muted">ms</span>
          </div>
        </div>

        {/* 触发模式选择 */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-driver-muted">{t('mouse.clickTimes')}</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`flex h-8 items-center justify-center rounded border text-xs font-bold transition ${
                burstMode === 'times'
                  ? 'border-warn bg-warn/5 text-warn'
                  : 'border-driver-line text-driver-text hover:bg-driver-hover'
              }`}
              onClick={() => setBurstMode('times')}
            >
              {t('mouse.burstModeTimes')}
            </button>
            <button
              type="button"
              className={`flex h-8 items-center justify-center rounded border text-xs font-bold transition ${
                burstMode === 'hold'
                  ? 'border-warn bg-warn/5 text-warn'
                  : 'border-driver-line text-driver-text hover:bg-driver-hover'
              }`}
              onClick={() => setBurstMode('hold')}
            >
              {t('mouse.burstModeHold')}
            </button>
          </div>
        </div>

        {/* 具体次数输入 (如果不是持续触发) */}
        {burstMode === 'times' && (
          <div className="space-y-1">
            <div className="flex items-center rounded-md border border-driver-line bg-driver-raised px-3">
              <input
                type="number"
                min={1}
                max={255}
                className="h-9 w-full bg-transparent text-xs font-semibold outline-none"
                value={countText}
                onChange={(e) => setCountText(e.target.value)}
                onBlur={() => setCountText(String(clampByte(countText, DEFAULT_COUNT)))}
              />
              <span className="ml-2 text-xs text-driver-muted">{t('mouse.timesUnit')}</span>
            </div>
          </div>
        )}

        <Button variant="primary" className="w-full mt-2 font-bold text-xs" onClick={saveBurstFire}>
          {t('mouse.save')}
        </Button>
      </div>
    </div>
  );
}
