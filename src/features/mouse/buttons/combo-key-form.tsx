import { useEffect, useRef, useState } from 'react';
import { browserKeyToHid, ButtonId, KeyFunctionType } from '@/protocol/mouse';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
import { hidValueToName, keyName, MODIFIER_OPTIONS, MODIFIER_VALUES, parseComboValues } from './helpers';

type ComboKeyFormProps = {
  selectedButton: ButtonId;
  active: boolean;
};

export function ComboKeyForm({ selectedButton, active }: ComboKeyFormProps) {
  const { t } = useI18n();
  const config = useMouseStore((state) => state.buttonConfigs[selectedButton]);
  const bindComboToButton = useMouseStore((state) => state.bindComboToButton);

  const [comboModifiers, setComboModifiers] = useState<number[]>([]);
  const [comboNormalKey, setComboNormalKey] = useState<{ name: string; value: number } | null>(null);
  const [isRecordingCombo, setIsRecordingCombo] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastSyncedRef = useRef<string | null>(null);

  // 切换目标按键时取消录制
  useEffect(() => {
    setIsRecordingCombo(false);
  }, [selectedButton]);

  // 表单不可见（切页签/收起侧栏）时停止捕获，避免隐藏的监听器继续吞按键
  useEffect(() => {
    if (!active) setIsRecordingCombo(false);
  }, [active]);

  // 监听选中按键的配置变化，实现配置回显；内容未变的重复响应不覆盖未保存草稿
  useEffect(() => {
    const signature =
      config?.functionType === KeyFunctionType.ComboKey
        ? `${selectedButton}:${config.values.join(',')}`
        : `${selectedButton}:none`;
    if (lastSyncedRef.current === signature) return;
    lastSyncedRef.current = signature;
    if (config?.functionType === KeyFunctionType.ComboKey) {
      const { modifiers, normalValue } = parseComboValues(config.values);
      setComboModifiers(modifiers);
      setComboNormalKey(
        normalValue !== undefined ? { name: hidValueToName(normalValue), value: normalValue } : null
      );
    } else {
      setComboModifiers([]);
      setComboNormalKey(null);
    }
  }, [selectedButton, config]);

  // 录制组合键时的键盘监听
  useEffect(() => {
    if (!isRecordingCombo) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();

      // Esc 取消录制
      if (event.key === 'Escape') {
        setIsRecordingCombo(false);
        return;
      }

      const code = browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()] ?? browserKeyToHid[event.code];
      if (!code) return;

      const hidVal = code[0];

      // 如果是修饰键，在多选框中自动联动勾选
      if (MODIFIER_VALUES.includes(hidVal)) {
        setComboModifiers((prev) => {
          if (prev.includes(hidVal)) return prev;
          return [...prev, hidVal];
        });
        return;
      }

      // 如果是普通按键，记录下来并退出录制状态
      setComboNormalKey({
        name: keyName(event),
        value: hidVal,
      });
      setIsRecordingCombo(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecordingCombo]);

  async function saveComboKey() {
    if (saving) return;
    const values = [...comboModifiers];
    if (comboNormalKey) {
      values.push(comboNormalKey.value);
    }
    setSaving(true);
    try {
      await bindComboToButton(selectedButton, values);
    } finally {
      setSaving(false);
    }
  }

  function clearComboKey() {
    setComboModifiers([]);
    setComboNormalKey(null);
    setIsRecordingCombo(false);
  }

  return (
    <div className="space-y-4 rounded-lg border border-driver-line bg-driver-panel p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-driver-line pb-2">
        <span className="text-sm font-black text-driver-text">{t('mouse.comboKey')}</span>
        <span className="rounded bg-warn/10 px-2 py-0.5 text-[10px] font-black text-warn">
          Combo
        </span>
      </div>

      <div className="space-y-3">
        {/* 系统键多选 */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-driver-muted">{t('mouse.modifierKeys')}</span>
          <div className="grid grid-cols-4 gap-1">
            {MODIFIER_OPTIONS.map((opt) => {
              const active = comboModifiers.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`flex h-8 items-center justify-center rounded border text-xs font-bold transition ${
                    active
                      ? 'border-warn bg-warn/5 text-warn'
                      : 'border-driver-line text-driver-text hover:bg-driver-hover'
                  }`}
                  onClick={() => {
                    setComboModifiers((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((v) => v !== opt.value)
                        : [...prev, opt.value]
                    );
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 任意键捕获 */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-driver-muted">{t('mouse.normalKey')}</span>
          <button
            type="button"
            className={`flex h-10 w-full items-center justify-center rounded-md border border-dashed text-xs font-bold transition ${
              isRecordingCombo
                ? 'animate-pulse border-warn bg-warn/5 text-warn'
                : comboNormalKey
                ? 'border-solid border-warn bg-driver-panel text-warn'
                : 'border-driver-line bg-driver-raised text-driver-muted hover:bg-driver-hover'
            }`}
            onClick={() => setIsRecordingCombo((prev) => !prev)}
          >
            {isRecordingCombo
              ? t('mouse.pressAnyKey')
              : comboNormalKey
              ? comboNormalKey.name
              : t('mouse.clickToRecord')}
          </button>
          <span className="mt-1 block text-[10px] leading-normal text-driver-muted">
            {t('mouse.comboHint')}
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            className="flex-1 font-bold text-xs"
            disabled={saving || (comboModifiers.length === 0 && !comboNormalKey)}
            onClick={saveComboKey}
          >
            {t('mouse.save')}
          </Button>
          <Button
            type="button"
            className="border border-driver-line bg-driver-raised text-xs font-bold text-driver-text hover:bg-driver-hover"
            onClick={clearComboKey}
          >
            {t('mouse.clear')}
          </Button>
        </div>
      </div>
    </div>
  );
}
