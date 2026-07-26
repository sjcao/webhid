import { ReactNode } from 'react';

export function PanelHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-driver-line bg-driver-panel px-6 py-4">
      <div>
        <h1 className="text-lg font-black">{title}</h1>
        <p className="mt-1 text-xs text-driver-muted">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}
