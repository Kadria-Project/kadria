'use client';

import { ProjectHeader } from './ProjectHeader';
import { ProjectContextSidebar } from './ProjectContextSidebar';
import { ProjectWorkspaceTabs } from './ProjectWorkspaceTabs';
import type { ProjectWorkspaceProps } from './ProjectWorkspace.types';

export function ProjectWorkspace({ brief, sections, capabilities, navigation }: ProjectWorkspaceProps) {
  return (
    <main data-project-workspace-version="compact-v1" className="mx-auto w-full max-w-[1440px] px-6 pb-12 pt-3 2xl:px-8">
      <ProjectHeader brief={brief} capabilities={capabilities} navigation={navigation} />
      <div className="grid grid-cols-1 gap-5 pt-5 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:gap-6">
        <ProjectWorkspaceTabs brief={brief} sections={sections} capabilities={capabilities} navigation={navigation} />
        <ProjectContextSidebar brief={brief} sections={sections} capabilities={capabilities} />
      </div>
    </main>
  );
}
