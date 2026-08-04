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
  const [countText, setCountText] = useState(String(DEFAULT_COUNT));
  const [saving, setSaving] = useState(false);
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
      const count = config.values[1] ?? DEFAULT_COUNT;
      setIntervalText(String(interval));
      setCountText(String(count > 0 ? count : DEFAULT_COUNT));
    } else {
      setIntervalText(String(DEFAULT_INTERVAL));
      setCountText(String(DEFAULT_COUNT));
    }
  }, [selectedButton, config]);

  async function saveBurstFire() {
    if (saving) return;
    const interval = clampByte(intervalText, DEFAULT_INTERVAL);
    const count = clampByte(countText, DEFAULT_COUNT);
    setIntervalText(String(interval));
    setCountText(String(count));
    setSaving(true);
    try {
      await setButtonMapping({
        buttonId: selectedButton,
        functionType: KeyFunctionType.BurstFire,
        index: 0,
        values: [interval, count],
      });
    } finally {
      setSaving(false);
    }
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

        <div className="space-y-1">
          <span className="text-xs font-semibold text-driver-muted">{t('mouse.clickTimes')}</span>
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

        <Button variant="primary" className="w-full mt-2 font-bold text-xs" disabled={saving} onClick={saveBurstFire}>
          {t('mouse.saveAndApply')}
        </Button>
      </div>
    </div>
  );
}
