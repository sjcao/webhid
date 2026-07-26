import { Check } from 'lucide-react';
import { KeyOption } from '@/protocol/mouse';
import { useI18n } from '@/i18n/use-i18n';
import { pickLabel, type KeyOptionGroup } from './helpers';

type KeyOptionGroupsProps = {
  groups: KeyOptionGroup[];
  activeId: string | null;
  onSelect: (option: KeyOption) => void;
  dense?: boolean;
};

export function KeyOptionGroups({ groups, activeId, onSelect, dense = false }: KeyOptionGroupsProps) {
  const { t, locale } = useI18n();

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.titleKey} className="rounded-lg border border-driver-line bg-driver-panel p-3 shadow-sm">
          <div className="mb-2 text-xs font-black text-driver-muted">{t(group.titleKey)}</div>
          <div className={dense ? 'grid grid-cols-2 gap-1.5' : 'grid gap-1'}>
            {group.options.map((option) => {
              const active = option.id === activeId;
              return (
                <button
                  key={option.id}
                  className={
                    dense
                      ? `flex h-8 items-center justify-between rounded px-2.5 text-xs font-semibold transition border ${
                          active
                            ? 'border-warn bg-warn/5 text-warn'
                            : 'border-driver-line text-driver-text hover:bg-driver-hover'
                        }`
                      : `flex h-9 w-full items-center justify-between rounded px-3 text-left text-xs font-semibold transition ${
                          active
                            ? 'bg-warn/10 text-warn'
                            : 'text-driver-text hover:bg-driver-hover'
                        }`
                  }
                  onClick={() => onSelect(option)}
                >
                  <span className={dense ? 'truncate' : undefined}>{pickLabel(option, locale)}</span>
                  {active && <Check size={dense ? 12 : 14} className={dense ? 'shrink-0' : undefined} />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <div className="py-8 text-center text-xs text-driver-muted">{t('mouse.noMatches')}</div>
      )}
    </div>
  );
}
