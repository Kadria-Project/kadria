'use client';

import { ProjectHeader } from './ProjectHeader';
import { ProjectActionCenter } from './ProjectActionCenter';
import { ProjectProgressTimeline } from './ProjectProgressTimeline';
import { ProjectContextSidebar } from './ProjectContextSidebar';
import { ProjectWorkspaceTabs } from './ProjectWorkspaceTabs';
import type { ProjectWorkspaceProps } from './ProjectWorkspace.types';

export function ProjectWorkspace(props: ProjectWorkspaceProps) {
  return (
    <main data-project-workspace-version="v2" className="mx-auto w-full max-w-[1440px] px-6 pb-12 pt-3 2xl:px-8">
      <ProjectHeader {...props} />
      {props.decisionSlot || <ProjectActionCenter {...props} />}
      <ProjectProgressTimeline lifecycle={props.lifecycle} latestDevis={props.latestDevis} appointment={props.appointment} />
      <div className="grid grid-cols-1 gap-5 pt-5 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:gap-6">
        <ProjectWorkspaceTabs {...props} />
        <ProjectContextSidebar {...props} />
      </div>
    </main>
  );
}
