'use client'

import AuthGuard from '@/src/components/AuthGuard'
import ProjectWorkspaceRoute from './ProjectWorkspaceRoute'

export default function ProjectDetailPage() {
  return <AuthGuard><ProjectWorkspaceRoute /></AuthGuard>
}
