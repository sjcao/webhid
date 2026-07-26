import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ButtonId, findKeyOption, KeyFunctionType, KeyOption, mouseButtons } from '@/protocol/mouse';
import { useMouseStore } from '@/stores/mouse-store';
import { useI18n } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/use-i18n';
import { BurstFireForm } from './burst-fire-form';
import { ComboKeyForm } from './combo-key-form';
import { KeyOptionGroups } from './key-option-groups';
import { MacroBindList } from './macro-bind-list';
import { buildGroups, pickLabel } from './helpers';

type SidebarTab = 'system' | 'keyboard' | 'special' | 'macro';

const TABS: Array<{ id: SidebarTab; labelKey: TranslationKey }> = [
  { id: 'system', labelKey: 'mouse.system' },
  { id: 'keyboard', labelKey: 'mouse.keyboard' },
  { id: 'special', labelKey: 'mouse.special' },
  { id: 'macro', labelKey: 'mouse.shortcuts' },
];

const SYSTEM_GROUP_SPECS: ReadonlyArray<{ titleKey: TranslationKey; groupId: string }> = [
  { titleKey: 'mouse.groupMouseKeyboard', groupId: 'mouse' },
  { titleKey: 'mouse.profileSelector', groupId: 'profile' },
  { titleKey: 'mouse.groupDpiButtons', groupId: 'dpi' },
];

const KEYBOARD_GROUP_SPECS: ReadonlyArray<{ titleKey: TranslationKey; groupId: string }> = [
  { titleKey: 'mouse.groupAlphanumeric', groupId: 'keyboard' },
  { titleKey: 'mouse.groupFunctionKeys', groupId: 'function' },
  { titleKey: 'mouse.groupNumpad', groupId: 'numpad' },
  { titleKey: 'mouse.groupControl', groupId: 'control' },
  { titleKey: 'mouse.groupWheel', groupId: 'wheel' },
  { titleKey: 'mouse.groupMedia', groupId: 'media' },
];

type MappingSidebarProps = {
  open: boolean;
  selectedButton: ButtonId;
  onClose: () => void;
};

// 收起时仅隐藏不卸载，保留页签、搜索词与连发/组合键表单的未保存草稿
export function MappingSidebar({ open, selectedButton, onClose }: MappingSidebarProps) {
  const { t, locale } = useI18n();
  const config = useMouseStore((state) => state.buttonConfigs[selectedButton]);
  const setButtonMapping = useMouseStore((state) => state.setButtonMapping);

  const [activeTab, setActiveTab] = useState<SidebarTab>('system');
  const [searchQuery, setSearchQuery] = useState('');

  // 仅在切换目标按键时按其配置自动跳转页签，被动刷新不覆盖手动选择
  useEffect(() => {
    const current = useMouseStore.getState().buttonConfigs[selectedButton];
    if (!current) return;
    if (
      current.functionType === KeyFunctionType.BurstFire ||
      current.functionType === KeyFunctionType.ComboKey
    ) {
      setActiveTab('special');
    } else if (current.functionType === KeyFunctionType.Macro) {
      setActiveTab('macro');
    } else if (
      [KeyFunctionType.Mouse, KeyFunctionType.ProfileChange, KeyFunctionType.DpiAction].includes(current.functionType)
    ) {
      setActiveTab('system');
    } else {
      setActiveTab('keyboard');
    }
  }, [selectedButton]);

  const selectedButtonLabel = mouseButtons.find((b) => b.id === selectedButton);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // 系统按键列表过滤与分组
  const systemGroups = useMemo(() => buildGroups(SYSTEM_GROUP_SPECS, normalizedQuery), [normalizedQuery]);

  // 键盘按键列表过滤与分组
  const keyboardGroups = useMemo(() => buildGroups(KEYBOARD_GROUP_SPECS, normalizedQuery), [normalizedQuery]);

  // 当前绑定的高亮项，匹配语义与画布共用冻结的 findKeyOption
  const activeOptionId = config
    ? findKeyOption(config.functionType, config.index, config.values)?.id ?? null
    : null;

  // 应用普通键映射
  async function applyMapping(option: KeyOption) {
    await setButtonMapping({
      buttonId: selectedButton,
      functionType: option.functionType,
      index: option.index,
      values: option.values,
    });
  }

  return (
    <div className={`${open ? 'flex' : 'hidden'} h-full w-[336px] shrink-0 flex-col border-l border-driver-line bg-driver-panel shadow-[-8px_0_24px_rgba(0,0,0,0.02)] min-[1200px]:w-[360px]`}>
      {/* 标题栏 */}
      <div className="flex h-14 items-center justify-between border-b border-driver-line px-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-driver-muted">{t('mouse.targetButton')}:</span>
          <span className="rounded bg-warn/10 px-2 py-0.5 text-xs font-black text-warn">
            {selectedButtonLabel ? pickLabel(selectedButtonLabel, locale) : ''}
          </span>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-driver-muted hover:bg-driver-hover hover:text-driver-text"
          aria-label={t('mouse.closeFunctionLibrary')}
          title={t('mouse.closeFunctionLibrary')}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      {/* 左键修改特别警告 */}
      {selectedButton === ButtonId.Left && (
        <div className="flex items-start gap-2 border-b border-danger/20 bg-danger/10 px-5 py-2.5 text-xs font-bold leading-normal text-danger">
          <span className="shrink-0 text-sm mt-0.5">⚠️</span>
          <div>
            <span>
              <strong className="mb-0.5 block text-[13px] text-danger">{t('mouse.leftWarningTitle')}</strong>
              {t('mouse.leftWarningBody')}
            </span>
          </div>
        </div>
      )}

      {/* 页签选择栏 */}
      <div className="grid grid-cols-4 border-b border-driver-line bg-driver-panel p-1.5" role="tablist">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`rounded py-2 text-xs font-bold transition ${
                active
                  ? 'bg-driver-text text-driver-panel shadow-sm'
                  : 'text-driver-muted hover:bg-driver-hover'
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* 搜索框 (仅系统和键盘需要) */}
      {(activeTab === 'system' || activeTab === 'keyboard') && (
        <div className="relative border-b border-driver-line p-3">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-driver-muted" size={15} />
          <input
            aria-label={t('mouse.searchFunction')}
            className="h-9 w-full rounded-md border border-driver-line bg-driver-raised pl-9 pr-3 text-xs text-driver-text outline-none placeholder:text-driver-muted focus:border-warn"
            placeholder={t('mouse.searchFunction')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* 主列表内容区域 */}
      <div className="flex-1 overflow-y-auto bg-driver-bg p-4">
        {/* TAB 1: 系统 */}
        {activeTab === 'system' && (
          <KeyOptionGroups
            groups={systemGroups}
            activeId={activeOptionId}
            onSelect={(option) => void applyMapping(option)}
          />
        )}

        {/* TAB 2: 键盘 */}
        {activeTab === 'keyboard' && (
          <KeyOptionGroups
            groups={keyboardGroups}
            activeId={activeOptionId}
            onSelect={(option) => void applyMapping(option)}
            dense
          />
        )}

        {/* TAB 3: 特殊 (火力键 + 组合键)；保持挂载以免切页签丢失未保存草稿 */}
        <div className={activeTab === 'special' ? 'space-y-4' : 'hidden'}>
          <BurstFireForm selectedButton={selectedButton} />
          <ComboKeyForm selectedButton={selectedButton} active={open && activeTab === 'special'} />
        </div>

        {/* TAB 4: 快捷指令 (宏) */}
        {activeTab === 'macro' && <MacroBindList selectedButton={selectedButton} />}
      </div>
    </div>
  );
}
