import type { ReactNode } from 'react';

interface WorkspaceHeaderProps {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}

export default function WorkspaceHeader({ eyebrow, title, actions }: WorkspaceHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-medium text-slate-500">{eyebrow}</p>}
        <h1 className="truncate text-xl font-semibold tracking-tight text-slate-950">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
