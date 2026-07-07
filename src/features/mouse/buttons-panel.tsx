import { useEffect, useMemo, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import {
  ButtonId,
  findKeyOption,
  keyGroups,
  KeyOption,
  mouseButtons,
  KeyFunctionType,
  browserKeyToHid,
} from '@/protocol/mouse';
import { useMouseStore } from '@/stores/mouse-store';
import { useMacroStore } from '@/stores/macro-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';

const mouseImage = `${import.meta.env.BASE_URL}ic-moouse.png`;

const MODIFIER_OPTIONS = [
  { label: 'Ctrl', value: 0xe0 },
  { label: 'Shift', value: 0xe1 },
  { label: 'Alt', value: 0xe2 },
  { label: 'Win', value: 0xe3 },
];

export function ButtonsPanel() {
  const { t, locale } = useI18n();
  const [selectedButton, setSelectedButton] = useState<ButtonId>(ButtonId.Middle);
  const [confirmLeft, setConfirmLeft] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(true);

  // Zustand stores
  const readButton = useMouseStore((state) => state.readButton);
  const setButtonMapping = useMouseStore((state) => state.setButtonMapping);
  const bindComboToButton = useMouseStore((state) => state.bindComboToButton);
  const bindMacroToButton = useMouseStore((state) => state.bindMacroToButton);
  const resetButtons = useMouseStore((state) => state.resetButtons);
  const buttonConfigs = useMouseStore((state) => state.buttonConfigs);
  const macros = useMacroStore((state) => state.macros);

  // 侧边栏内部的状态
  const [activeTab, setActiveTab] = useState<'system' | 'keyboard' | 'special' | 'macro'>('system');
  const [searchQuery, setSearchQuery] = useState('');

  // 火力键表单状态
  const [burstInterval, setBurstInterval] = useState(3);
  const [burstMode, setBurstMode] = useState<'times' | 'hold'>('times');
  const [burstCount, setBurstCount] = useState(1);

  // 组合键表单状态
  const [comboModifiers, setComboModifiers] = useState<number[]>([]);
  const [comboNormalKey, setComboNormalKey] = useState<{ name: string; value: number } | null>(null);
  const [isRecordingCombo, setIsRecordingCombo] = useState(false);

  // 1. 监听选中的按键以及它的配置变化，实现配置回显
  useEffect(() => {
    const config = buttonConfigs[selectedButton];
    if (!config) {
      setBurstInterval(3);
      setBurstMode('times');
      setBurstCount(1);
      setComboModifiers([]);
      setComboNormalKey(null);
      return;
    }

    if (config.functionType === KeyFunctionType.BurstFire) {
      setActiveTab('special');
      const interval = config.values[0] ?? 3;
      const count = config.values[1] ?? 0;
      setBurstInterval(interval);
      if (count === 0) {
        setBurstMode('hold');
        setBurstCount(1);
      } else {
        setBurstMode('times');
        setBurstCount(count);
      }
    } else if (config.functionType === KeyFunctionType.ComboKey) {
      setActiveTab('special');
      // 解析修饰键
      const mods = config.values.filter((v) => [0xe0, 0xe1, 0xe2, 0xe3].includes(v));
      setComboModifiers(mods);
      
      // 解析普通键
      const normalVal = config.values.find((v) => ![0xe0, 0xe1, 0xe2, 0xe3].includes(v));
      if (normalVal !== undefined) {
        let name = '';
        for (const [key, val] of Object.entries(browserKeyToHid)) {
          if (val[0] === normalVal) {
            name = key === ' ' ? 'Space' : key.toUpperCase();
            break;
          }
        }
        setComboNormalKey({ name: name || `Key(${normalVal})`, value: normalVal });
      } else {
        setComboNormalKey(null);
      }
    } else if (config.functionType === KeyFunctionType.Macro) {
      setActiveTab('macro');
    } else if (
      [KeyFunctionType.Mouse, KeyFunctionType.ProfileChange, KeyFunctionType.DpiAction].includes(config.functionType)
    ) {
      setActiveTab('system');
    } else {
      setActiveTab('keyboard');
    }
  }, [selectedButton, buttonConfigs]);

  // 2. 录制组合键时的键盘监听
  useEffect(() => {
    if (!isRecordingCombo) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      
      const code = browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()] ?? browserKeyToHid[event.code];
      if (!code) return;

      const hidVal = code[0];
      
      // 如果是修饰键，在多选框中自动联动勾选
      if ([0xe0, 0xe1, 0xe2, 0xe3].includes(hidVal)) {
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

  // 应用普通键映射
  async function applyMapping(option: KeyOption) {
    await setButtonMapping({
      buttonId: selectedButton,
      functionType: option.functionType,
      index: option.index,
      values: option.values,
    });
  }

  // 保存火力键
  async function saveBurstFire() {
    const count = burstMode === 'hold' ? 0 : burstCount;
    await setButtonMapping({
      buttonId: selectedButton,
      functionType: KeyFunctionType.BurstFire,
      index: 0,
      values: [burstInterval, count],
    });
  }

  // 保存组合键
  async function saveComboKey() {
    const values = [...comboModifiers];
    if (comboNormalKey) {
      values.push(comboNormalKey.value);
    }
    await bindComboToButton(selectedButton, values);
  }

  // 清除组合键
  function clearComboKey() {
    setComboModifiers([]);
    setComboNormalKey(null);
    setIsRecordingCombo(false);
  }

  const selectedButtonLabel = mouseButtons.find((b) => b.id === selectedButton);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // 系统按键列表过滤与分组
  const systemGroups = useMemo(() => {
    const groups = [
      {
        title: locale === 'zh-CN' ? '鼠标键盘' : 'Mouse & Keyboard',
        options: keyGroups.find((g) => g.id === 'mouse')?.options ?? [],
      },
      {
        title: locale === 'zh-CN' ? '板载配置' : 'Onboard Profile',
        options: keyGroups.find((g) => g.id === 'profile')?.options ?? [],
      },
      {
        title: locale === 'zh-CN' ? 'DPI按键' : 'DPI Buttons',
        options: keyGroups.find((g) => g.id === 'dpi')?.options ?? [],
      },
    ];

    if (!normalizedQuery) return groups;

    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter((opt) =>
          `${opt.label} ${opt.labelZh}`.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [locale, normalizedQuery]);

  // 键盘按键列表过滤与分组
  const keyboardGroups = useMemo(() => {
    const groups = [
      {
        title: locale === 'zh-CN' ? '字母和数字键' : 'Alphanumeric Keys',
        options: keyGroups.find((g) => g.id === 'keyboard')?.options ?? [],
      },
      {
        title: locale === 'zh-CN' ? 'F区功能键' : 'Function Keys (F1-F12)',
        options: keyGroups.find((g) => g.id === 'function')?.options ?? [],
      },
      {
        title: locale === 'zh-CN' ? '数字小键盘' : 'Numpad Keys',
        options: keyGroups.find((g) => g.id === 'numpad')?.options ?? [],
      },
      {
        title: locale === 'zh-CN' ? '控制键与字符键' : 'Control & Punctuation Keys',
        options: keyGroups.find((g) => g.id === 'control')?.options ?? [],
      },
      {
        title: locale === 'zh-CN' ? '鼠标滚轮' : 'Mouse Wheel',
        options: keyGroups.find((g) => g.id === 'wheel')?.options ?? [],
      },
      {
        title: locale === 'zh-CN' ? '多媒体' : 'Multimedia Keys',
        options: keyGroups.find((g) => g.id === 'media')?.options ?? [],
      },
    ];

    if (!normalizedQuery) return groups;

    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter((opt) =>
          `${opt.label} ${opt.labelZh}`.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [locale, normalizedQuery]);

  // 检查系统/键盘项是否当前高亮绑定
  function isOptionActive(option: KeyOption) {
    const config = buttonConfigs[selectedButton];
    if (!config) return false;
    return (
      config.functionType === option.functionType &&
      config.index === option.index &&
      (config.values.length === option.values.length &&
        config.values.every((v, idx) => v === option.values[idx]))
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#f6f7f9] text-[#101114]">
      {/* 左侧：鼠标按键映射画布 */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-[#eef0f2]/80 bg-white px-6 py-4">
          <div>
            <h1 className="text-lg font-black">{t('nav.buttons')}</h1>
            <p className="mt-1 text-xs text-[#7a808a]">{t('mouse.mappingHint')}</p>
          </div>
          <Button
            className="border border-[#d7dbe2] bg-white text-[#1d2129] shadow-sm hover:bg-[#eff0f2]"
            onClick={() => void resetButtons()}
          >
            {t('mouse.restoreDefault')}
          </Button>
        </div>

        <div className="relative mt-12 h-[500px] w-[520px] max-w-full">
          <img
            src={mouseImage}
            alt="mouse"
            className="mx-auto h-full object-contain drop-shadow-[0_20px_42px_rgba(0,0,0,0.18)]"
          />

          {/* 渲染每一个按键的绑定显示标签 */}
          {mouseButtons.filter((button) => button.id !== ButtonId.Dpi).map((button) => {
            const config = buttonConfigs[button.id];
            const option = config ? findKeyOption(config.functionType, config.index, config.values) : null;
            
            // 获取默认的功能文本（即按键出厂本身的物理名称）
            const defaultName = locale === 'zh-CN' ? button.labelZh : button.label;
            let binding: string = defaultName;

            if (config) {
              if (config.functionType === KeyFunctionType.Default) {
                binding = defaultName;
              } else if (config.functionType === KeyFunctionType.BurstFire) {
                const interval = config.values[0];
                const count = config.values[1];
                binding = count === 0
                  ? (locale === 'zh-CN' ? `连点(${interval}ms)` : `Burst(${interval}ms)`)
                  : (locale === 'zh-CN' ? `连点 ${count}次/${interval}ms` : `${count} Clicks / ${interval}ms`);
              } else if (config.functionType === KeyFunctionType.ComboKey) {
                // 组合键友好文本
                const mods = config.values.filter((v) => [0xe0, 0xe1, 0xe2, 0xe3].includes(v));
                const modLabels = mods.map((v) => MODIFIER_OPTIONS.find((o) => o.value === v)?.label || '');
                const normalVal = config.values.find((v) => ![0xe0, 0xe1, 0xe2, 0xe3].includes(v));
                let normalLabel = '';
                if (normalVal !== undefined) {
                  for (const [k, val] of Object.entries(browserKeyToHid)) {
                    if (val[0] === normalVal) {
                      normalLabel = k === ' ' ? 'Space' : k.toUpperCase();
                      break;
                    }
                  }
                  if (!normalLabel) normalLabel = `Key(${normalVal})`;
                }
                binding = [...modLabels, normalLabel].filter(Boolean).join('+') || defaultName;
              } else if (config.functionType === KeyFunctionType.Macro) {
                const macroObj = macros[config.index];
                binding = macroObj ? macroObj.name : `Macro ${config.index + 1}`;
              } else if (option) {
                binding = locale === 'zh-CN' ? option.labelZh : option.label;
              }
            }

            const active = selectedButton === button.id;
            return (
              <button
                key={button.id}
                className={`absolute w-[136px] rounded-md px-3 py-2 text-left text-sm font-black shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition duration-200 hover:-translate-y-0.5 ${
                  active
                    ? 'bg-[#101114] text-white ring-2 ring-[#ff6b00] ring-offset-2'
                    : 'bg-white text-[#101114] hover:bg-slate-50'
                } ${positionClass(button.id)}`}
                onClick={() => chooseButton(button.id)}
              >
                <span
                  className={`block text-[11px] font-semibold ${
                    active ? 'text-[#a9adb3]' : 'text-[#7a808a]'
                  }`}
                >
                  {locale === 'zh-CN' ? button.labelZh : button.label}
                </span>
                <span className="mt-0.5 block truncate font-bold text-xs">{binding}</span>
              </button>
            );
          })}

          {/* 渲染高亮圆圈指示器 */}
          {mouseButtons.filter((button) => button.id !== ButtonId.Dpi).map((button) => {
            const active = selectedButton === button.id;
            return (
              <span
                key={`dot-${button.id}`}
                className={`absolute h-6 w-6 rounded-full transition-all duration-300 ${dotClass(button.id)} ${
                  active
                    ? 'border-solid border-[3px] border-[#ff6b00] bg-[#ff6b00]/30 shadow-[0_0_10px_#ff6b00]'
                    : 'border-dotted border-[3px] border-[#ff6b00]/70 bg-transparent hover:border-solid hover:scale-105'
                }`}
                onClick={() => chooseButton(button.id)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </div>

      </div>

      {/* 右侧：改键侧边栏面板 */}
      {mappingOpen && (
        <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-[#eef0f2] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.02)] animate-[slideIn_0.2s_ease-out]">
          {/* 标题栏 */}
          <div className="flex h-14 items-center justify-between border-b border-[#eef0f2] px-5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#7a808a]">
                {locale === 'zh-CN' ? '当前按键' : 'Target Button'}:
              </span>
              <span className="rounded bg-[#ff6b00]/10 px-2 py-0.5 text-xs font-black text-[#ff6b00]">
                {selectedButtonLabel ? (locale === 'zh-CN' ? selectedButtonLabel.labelZh : selectedButtonLabel.label) : ''}
              </span>
            </div>
            <button
              className="rounded-md p-1.5 text-[#5d6673] hover:bg-[#f0f1f3] hover:text-[#101114]"
              onClick={() => setMappingOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* 左键修改特别警告 */}
          {selectedButton === ButtonId.Left && (
            <div className="bg-red-50 border-b border-red-200 px-5 py-2.5 text-xs text-red-600 font-bold leading-normal flex items-start gap-2">
              <span className="shrink-0 text-sm mt-0.5">⚠️</span>
              <div>
                {locale === 'zh-CN' ? (
                  <span>
                    <strong className="text-red-700 block mb-0.5 text-[13px]">注意注意！</strong>
                    修改左键可能导致鼠标无法继续点击。请确保其他物理按键已被绑定为左键，以免鼠标失效。
                  </span>
                ) : (
                  <span>
                    <strong className="text-red-700 block mb-0.5 text-[13px]">Warning!</strong>
                    Modifying Left Click may cause the mouse to lose clicking capability. Ensure another button is mapped to Left Click first.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 页签选择栏 */}
          <div className="grid grid-cols-4 border-b border-[#eef0f2] bg-[#fdfdfd] p-1.5">
            {(
              [
                { id: 'system', name: '系统', nameEn: 'System' },
                { id: 'keyboard', name: '键盘', nameEn: 'Key' },
                { id: 'special', name: '特殊', nameEn: 'Special' },
                { id: 'macro', name: '快捷指令', nameEn: 'Macro' },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`rounded py-2 text-xs font-bold transition ${
                    active
                      ? 'bg-[#101114] text-white shadow-sm'
                      : 'text-[#6b7280] hover:bg-[#f3f4f6]'
                  }`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery('');
                  }}
                >
                  {locale === 'zh-CN' ? tab.name : tab.nameEn}
                </button>
              );
            })}
          </div>

          {/* 搜索框 (仅系统和键盘需要) */}
          {(activeTab === 'system' || activeTab === 'keyboard') && (
            <div className="relative border-b border-[#eef0f2] p-3">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#9aa0a9]" size={15} />
              <input
                className="h-9 w-full rounded-md border border-[#d7dbe2] bg-[#f7f8fa] pl-9 pr-3 text-xs outline-none focus:border-[#ff6b00]"
                placeholder={locale === 'zh-CN' ? '搜索功能按键' : 'Search buttons...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* 主列表内容区域 */}
          <div className="flex-1 overflow-y-auto bg-[#f7f8fa] p-4">
            
            {/* TAB 1: 系统 */}
            {activeTab === 'system' && (
              <div className="space-y-4">
                {systemGroups.map((group) => (
                  <div key={group.title} className="rounded-lg bg-white p-3 shadow-sm border border-[#eef0f2]">
                    <div className="mb-2 text-xs font-black text-[#86909c]">{group.title}</div>
                    <div className="grid gap-1">
                      {group.options.map((option) => {
                        const active = isOptionActive(option);
                        return (
                          <button
                            key={option.id}
                            className={`flex h-9 w-full items-center justify-between rounded px-3 text-left text-xs font-semibold transition ${
                              active
                                ? 'bg-[#ff6b00]/10 text-[#ff6b00]'
                                : 'text-[#4b5563] hover:bg-[#f3f4f6]'
                            }`}
                            onClick={() => void applyMapping(option)}
                          >
                            <span>{locale === 'zh-CN' ? option.labelZh : option.label}</span>
                            {active && <Check size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {systemGroups.length === 0 && (
                  <div className="py-8 text-center text-xs text-[#9aa0a9]">
                    {locale === 'zh-CN' ? '没有找到匹配的功能' : 'No matches found'}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 键盘 */}
            {activeTab === 'keyboard' && (
              <div className="space-y-4">
                {keyboardGroups.map((group) => (
                  <div key={group.title} className="rounded-lg bg-white p-3 shadow-sm border border-[#eef0f2]">
                    <div className="mb-2 text-xs font-black text-[#86909c]">{group.title}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.options.map((option) => {
                        const active = isOptionActive(option);
                        return (
                          <button
                            key={option.id}
                            className={`flex h-8 items-center justify-between rounded px-2.5 text-xs font-semibold transition border ${
                              active
                                ? 'border-[#ff6b00] bg-[#ff6b00]/5 text-[#ff6b00]'
                                : 'border-[#eef0f2] text-[#4b5563] hover:bg-[#f3f4f6]'
                            }`}
                            onClick={() => void applyMapping(option)}
                          >
                            <span className="truncate">{locale === 'zh-CN' ? option.labelZh : option.label}</span>
                            {active && <Check size={12} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {keyboardGroups.length === 0 && (
                  <div className="py-8 text-center text-xs text-[#9aa0a9]">
                    {locale === 'zh-CN' ? '没有找到匹配的键盘按键' : 'No matches found'}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: 特殊 (火力键 + 组合键) */}
            {activeTab === 'special' && (
              <div className="space-y-4">
                {/* 1. 火力键配置 */}
                <div className="rounded-lg bg-white p-4 shadow-sm border border-[#eef0f2] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#eef0f2] pb-2">
                    <span className="text-sm font-black text-[#1d2129]">
                      {locale === 'zh-CN' ? '火力键' : 'Burst Fire'}
                    </span>
                    <span className="rounded bg-[#ff6b00]/10 px-2 py-0.5 text-[10px] font-black text-[#ff6b00]">
                      Burst
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {/* 点击间隔 */}
                    <div className="space-y-1">
                      <span className="text-xs text-[#86909c] font-semibold">
                        {locale === 'zh-CN' ? '点击间隔 (ms)' : 'Click Interval (ms)'}
                      </span>
                      <div className="flex items-center rounded-md border border-[#d7dbe2] bg-[#f7f8fa] px-3">
                        <input
                          type="number"
                          min={1}
                          max={255}
                          className="h-9 w-full bg-transparent text-xs font-semibold outline-none"
                          value={burstInterval}
                          onChange={(e) => setBurstInterval(Math.max(1, Number(e.target.value)))}
                        />
                        <span className="text-xs text-[#86909c] ml-2">ms</span>
                      </div>
                    </div>

                    {/* 触发模式选择 */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-[#86909c] font-semibold">
                        {locale === 'zh-CN' ? '点击次数' : 'Click Times'}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={`flex h-8 items-center justify-center rounded border text-xs font-bold transition ${
                            burstMode === 'times'
                              ? 'border-[#ff6b00] bg-[#ff6b00]/5 text-[#ff6b00]'
                              : 'border-[#eef0f2] text-[#4b5563] hover:bg-slate-50'
                          }`}
                          onClick={() => setBurstMode('times')}
                        >
                          {locale === 'zh-CN' ? '单/多次触发' : 'Single/Multi'}
                        </button>
                        <button
                          type="button"
                          className={`flex h-8 items-center justify-center rounded border text-xs font-bold transition ${
                            burstMode === 'hold'
                              ? 'border-[#ff6b00] bg-[#ff6b00]/5 text-[#ff6b00]'
                              : 'border-[#eef0f2] text-[#4b5563] hover:bg-slate-50'
                          }`}
                          onClick={() => setBurstMode('hold')}
                        >
                          {locale === 'zh-CN' ? '持续触发' : 'Continuous'}
                        </button>
                      </div>
                    </div>

                    {/* 具体次数输入 (如果不是持续触发) */}
                    {burstMode === 'times' && (
                      <div className="space-y-1">
                        <div className="flex items-center rounded-md border border-[#d7dbe2] bg-[#f7f8fa] px-3">
                          <input
                            type="number"
                            min={1}
                            max={255}
                            className="h-9 w-full bg-transparent text-xs font-semibold outline-none"
                            value={burstCount}
                            onChange={(e) => setBurstCount(Math.max(1, Number(e.target.value)))}
                          />
                          <span className="text-xs text-[#86909c] ml-2">
                            {locale === 'zh-CN' ? '次' : 'times'}
                          </span>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      className="w-full mt-2 font-bold text-xs"
                      onClick={saveBurstFire}
                    >
                      {locale === 'zh-CN' ? '保存并设置' : 'Save & Set'}
                    </Button>
                  </div>
                </div>

                {/* 2. 组合键配置 */}
                <div className="rounded-lg bg-white p-4 shadow-sm border border-[#eef0f2] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#eef0f2] pb-2">
                    <span className="text-sm font-black text-[#1d2129]">
                      {locale === 'zh-CN' ? '组合键' : 'Combo Key'}
                    </span>
                    <span className="rounded bg-[#ff6b00]/10 px-2 py-0.5 text-[10px] font-black text-[#ff6b00]">
                      Combo
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* 系统键多选 */}
                    <div className="space-y-1">
                      <span className="text-xs text-[#86909c] font-semibold">
                        {locale === 'zh-CN' ? '系统键' : 'Modifier Keys'}
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {MODIFIER_OPTIONS.map((opt) => {
                          const active = comboModifiers.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`flex h-8 items-center justify-center rounded border text-xs font-bold transition ${
                                active
                                  ? 'border-[#ff6b00] bg-[#ff6b00]/5 text-[#ff6b00]'
                                  : 'border-[#eef0f2] text-[#4b5563] hover:bg-slate-50'
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
                      <span className="text-xs text-[#86909c] font-semibold">
                        {locale === 'zh-CN' ? '任意键' : 'Normal Key'}
                      </span>
                      <button
                        type="button"
                        className={`flex h-10 w-full items-center justify-center rounded-md border border-dashed text-xs font-bold transition ${
                          isRecordingCombo
                            ? 'border-[#ff6b00] bg-[#ff6b00]/5 text-[#ff6b00] animate-pulse'
                            : comboNormalKey
                            ? 'border-solid border-[#ff6b00] bg-white text-[#ff6b00]'
                            : 'border-[#d7dbe2] bg-[#f7f8fa] text-[#7a808a] hover:bg-slate-50'
                        }`}
                        onClick={() => setIsRecordingCombo((prev) => !prev)}
                      >
                        {isRecordingCombo
                          ? (locale === 'zh-CN' ? '按下任意按键...' : 'Press any key...')
                          : comboNormalKey
                          ? comboNormalKey.name
                          : (locale === 'zh-CN' ? '点击此处捕获按键' : 'Click to record key')}
                      </button>
                      <span className="block text-[10px] text-[#86909c] mt-1 leading-normal">
                        {locale === 'zh-CN' ? '* 支持选择系统修饰键 + 任意键' : '* Supports Modifier + Any key'}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="primary"
                        className="flex-1 font-bold text-xs"
                        disabled={comboModifiers.length === 0 && !comboNormalKey}
                        onClick={saveComboKey}
                      >
                        {locale === 'zh-CN' ? '保存并设置' : 'Save & Set'}
                      </Button>
                      <Button
                        type="button"
                        className="border border-[#d7dbe2] bg-[#e5e7eb] text-[#1d2129] hover:bg-[#dfe2e7] font-bold text-xs"
                        onClick={clearComboKey}
                      >
                        {locale === 'zh-CN' ? '清除' : 'Clear'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: 快捷指令 (宏) */}
            {activeTab === 'macro' && (
              <div className="space-y-3">
                {macros.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#d7dbe2] bg-white p-6 text-center text-xs text-[#7a808a] font-semibold">
                    {locale === 'zh-CN' ? '没有可用的宏，请在“快捷指令设置”中录制' : 'No macros recorded. Record one in Shortcuts settings'}
                  </div>
                )}
                
                {macros.map((macro, idx) => {
                  const config = buttonConfigs[selectedButton];
                  const active =
                    config?.functionType === KeyFunctionType.Macro && config.index === idx;

                  return (
                    <div
                      key={macro.id}
                      className={`flex items-center justify-between rounded-lg bg-white p-3 border transition duration-200 ${
                        active
                          ? 'border-[#ff6b00] shadow-sm bg-[#ff6b00]/5'
                          : 'border-[#eef0f2] hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate text-[#1d2129]">{macro.name}</div>
                        <div className="mt-1 text-[10px] text-[#86909c] font-semibold">
                          {macro.actions.length} {locale === 'zh-CN' ? '个动作' : 'actions'} · {
                            macro.repeatType === 0xf0 ? (locale === 'zh-CN' ? '按住循环' : 'Hold Loop') : `${macro.loopTimes}x`
                          }
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`rounded px-2.5 py-1.5 text-[10px] font-bold transition shrink-0 ${
                          active
                            ? 'bg-[#ff6b00] text-white'
                            : 'bg-[#f0f1f3] text-[#1d2129] hover:bg-[#e5e7eb]'
                        }`}
                        onClick={() => void bindMacroToButton(selectedButton, idx, macro)}
                      >
                        {active ? (locale === 'zh-CN' ? '已绑定' : 'Bound') : (locale === 'zh-CN' ? '绑定' : 'Bind')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

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
    </div>
  );
}

function positionClass(buttonId: ButtonId) {
  switch (buttonId) {
    case ButtonId.Left:
      return 'left-[4%] top-[14%]';
    case ButtonId.Right:
      return 'right-[4%] top-[34%]';
    case ButtonId.Middle:
      return 'right-[4%] top-[14%]';
    case ButtonId.Forward:
      return 'left-[4%] top-[38%]';
    case ButtonId.Backward:
      return 'left-[4%] top-[58%]';
    case ButtonId.Dpi:
      return 'right-[20%] top-[4%]';
    default:
      return 'left-1/2 top-1/2';
  }
}

function dotClass(buttonId: ButtonId) {
  switch (buttonId) {
    case ButtonId.Left:
      return 'left-[34%] top-[18%]';
    case ButtonId.Right:
      return 'right-[34%] top-[18%]';
    case ButtonId.Middle:
      return 'left-[48%] top-[20%]';
    case ButtonId.Forward:
      return 'left-[28%] top-[45%]';
    case ButtonId.Backward:
      return 'left-[29%] top-[53%]';
    case ButtonId.Dpi:
      return 'left-[48%] top-[30%]';
    default:
      return 'left-1/2 top-1/2';
  }
}

function keyName(event: KeyboardEvent) {
  if (event.key === ' ') return 'Space';
  if (event.key === 'Control') return 'Ctrl';
  if (event.key === 'Meta') return 'Win';
  return event.key.length === 1 ? event.key.toUpperCase() : event.key;
}
