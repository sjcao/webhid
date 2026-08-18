import { Plus, Trash2 } from 'lucide-react';
import type { SavedMacro } from '@/stores/macro-store';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
import { formatTemplate } from '../buttons/helpers';

type MacroSidebarProps = {
  macros: SavedMacro[];
  selectedMacroId: string | null;
  recording: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

export function MacroSidebar({ macros, selectedMacroId, recording, onSelect, onCreate, onDelete }: MacroSidebarProps) {
  const { t } = useI18n();

  return (
    <div className="relative flex h-[168px] w-full shrink-0 flex-col border-b border-driver-line bg-driver-panel p-3 lg:h-full lg:w-[220px] lg:border-b-0 lg:border-r lg:p-4 min-[1200px]:w-[240px]">
      {recording && <div className="absolute inset-0 z-20 bg-driver-panel/75 backdrop-blur-[2px]" aria-hidden="true" />}
      <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-driver-muted lg:mb-3 lg:text-sm">
        {t('mouse.shortcutsLibrary')}
      </h2>

      {/* 新建按钮 */}
      <Button
        variant="black"
        onClick={onCreate}
        className="mb-2 flex h-9 w-full items-center justify-center gap-2 rounded-md text-xs font-bold shadow-sm lg:mb-4 lg:h-10"
      >
        <Plus size={15} />
        {t('mouse.newShortcut')}
      </Button>

      {/* 宏项列表 */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {macros.map((macro) => {
          const active = selectedMacroId === macro.id;
          return (
            <div
              key={macro.id}
              className={`group flex min-h-11 items-center justify-between rounded-md border transition duration-200 ${
                active
                  ? 'border-warn bg-warn/5 text-warn'
                  : 'border-driver-line bg-driver-panel hover:bg-driver-hover'
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warn"
                aria-pressed={active}
                onClick={() => onSelect(macro.id)}
              >
                <span className="block truncate text-xs font-bold">{macro.name}</span>
                <span className="mt-0.5 block text-[9px] font-semibold text-driver-muted">
                  {formatTemplate(t('mouse.macroActionsCount'), { count: macro.actions.length })}
                </span>
              </button>
              <button
                type="button"
                aria-label={`${t('mouse.delete')} ${macro.name}`}
                title={t('mouse.delete')}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(macro.id);
                }}
                className="mr-2 rounded p-1 text-driver-muted opacity-60 transition hover:bg-driver-raised hover:text-danger focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}

        {macros.length === 0 && (
          <div className="py-12 text-center text-xs font-medium leading-relaxed text-driver-muted">
            {t('mouse.emptyShortcutList')}
          </div>
        )}
      </div>
    </div>
  );
}
