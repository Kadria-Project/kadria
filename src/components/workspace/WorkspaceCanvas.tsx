import type { ReactNode } from 'react';
import WorkspaceContainer from './layout/WorkspaceContainer';

export default function WorkspaceCanvas({ children }: { children: ReactNode }) {
  return (
    <main className="kadria-workspace-canvas min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f8f7] p-5 xl:p-7">
      <WorkspaceContainer>{children}</WorkspaceContainer>
    </main>
  );
}
