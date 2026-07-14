import type { ReactNode } from 'react';

interface WorkspaceContainerProps {
  children: ReactNode;
  className?: string;
}

export default function WorkspaceContainer({ children, className = '' }: WorkspaceContainerProps) {
  return <div className={`mx-auto w-full max-w-[1680px] ${className}`}>{children}</div>;
}
