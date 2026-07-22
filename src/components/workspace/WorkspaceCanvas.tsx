import { forwardRef, type ReactNode } from 'react';
import WorkspaceContainer from './layout/WorkspaceContainer';

const WorkspaceCanvas = forwardRef<HTMLElement, { children: ReactNode }>(function WorkspaceCanvas({ children }, ref) {
  return (
    <main ref={ref} className="kadria-workspace-canvas min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f8f7] p-5 xl:p-7">
      <WorkspaceContainer>{children}</WorkspaceContainer>
    </main>
  );
});

export default WorkspaceCanvas;
