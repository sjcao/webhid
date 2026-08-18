import { ReactNode } from 'react';

export function PanelHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-driver-line bg-driver-panel px-4 py-3 sm:px-6 sm:py-4">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-black sm:text-lg">{title}</h1>
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-driver-muted sm:text-xs">{subtitle}</p>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
