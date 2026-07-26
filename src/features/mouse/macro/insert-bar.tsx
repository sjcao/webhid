import { Keyboard, Mouse } from 'lucide-react';
import { MacroDirection } from '@/stores/macro-store';
import { useI18n } from '@/i18n/use-i18n';
import { formatTemplate } from '../buttons/helpers';
import { INSERT_MOUSE_ITEMS, MOUSE_BUTTON_LABEL_KEYS, MouseButtonKey } from './helpers';

type InsertBarProps = {
  recording: boolean;
  isInsertingKey: boolean;
  menuOpen: boolean;
  onToggleInsertKey: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onInsert: (button: MouseButtonKey, direction: MacroDirection) => void;
};

export function InsertBar({
  recording,
  isInsertingKey,
  menuOpen,
  onToggleInsertKey,
  onToggleMenu,
  onCloseMenu,
  onInsert,
}: InsertBarProps) {
  const { t } = useI18n();

  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-t border-driver-line bg-driver-panel px-6">

      {/* 插入键盘按键 */}
      <button
        type="button"
        disabled={recording}
        onClick={onToggleInsertKey}
        className={`flex h-10 items-center gap-2 rounded-md border px-5 text-xs font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isInsertingKey
            ? 'animate-pulse border-warn bg-warn/5 text-warn'
            : 'border-driver-line bg-driver-panel text-driver-text hover:bg-driver-hover'
        }`}
      >
        <Keyboard size={15} />
        {isInsertingKey ? t('mouse.pressTargetKey') : t('mouse.insertKeyboardKey')}
      </button>

      {/* 插入鼠标按键 (Dropdown 模拟) */}
      <div className="relative">
        <button
          type="button"
          disabled={recording}
          onClick={onToggleMenu}
          className="flex h-10 items-center gap-2 rounded-md border border-driver-line bg-driver-panel px-5 text-xs font-bold text-driver-text shadow-sm hover:bg-driver-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mouse size={15} />
          {t('mouse.insertMouseKey')}
        </button>

        {menuOpen && (
          <>
            {/* 关闭层 */}
            <div className="fixed inset-0 z-40" onClick={onCloseMenu} />

            {/* 下拉菜单菜单项 */}
            <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-44 rounded-md border border-driver-line bg-driver-panel py-1 shadow-lg">
              {INSERT_MOUSE_ITEMS.map((item) => {
                const isDown = item.direction === MacroDirection.Down;
                const displayName = formatTemplate(t(isDown ? 'mouse.mouseDownLabel' : 'mouse.mouseUpLabel'), {
                  button: t(MOUSE_BUTTON_LABEL_KEYS[item.button]),
                });
                return (
                  <button
                    key={`${item.button}-${item.direction}`}
                    type="button"
                    onClick={() => onInsert(item.button, item.direction)}
                    className="flex h-8 w-full items-center px-4 text-left text-xs font-semibold text-driver-text hover:bg-driver-hover"
                  >
                    {isDown ? '↓' : '↑'} {displayName}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
