import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { createProjectNotification } from '@/src/lib/notifications'
import { createProjectWithCanonicalClient } from '@/src/lib/clients/project-client-dual-write'
import { projectIntakeSchema, projectIntakeToProjectInput } from '@/src/lib/projects/intake-contract'
import { projectResponsibilityColumnExists, resolveDefaultProjectResponsible } from '@/src/lib/project-responsibility'
import { toSupabaseProjectInsert } from '@/src/lib/supabase/mapping'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import { attachTenantIdToPayload, getCurrentTenantContext } from '@/src/lib/tenant-context'
import { TABLES } from '@/src/lib/airtable'
import { canCreateProject, recordProjectCreatedUsage } from '@/src/lib/usage/quotas'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.artisanId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

  const parsed = projectIntakeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Informations du dossier invalides.', issues: parsed.error.flatten().fieldErrors }, { status: 400 })

  const tenant = await getCurrentTenantContext()
  if (!tenant || tenant.legacyArtisanId !== session.artisanId) return NextResponse.json({ success: false, error: 'Tenant requis pour créer un dossier.' }, { status: 403 })

  const quota = await canCreateProject(session.artisanId)
  if (!quota.success) return NextResponse.json({ success: false, error: 'Vérification quota impossible.' }, { status: 503 })
  if (!quota.allowed) return NextResponse.json({ success: false, error: 'Quota projets mensuel atteint.', code: 'PROJECT_QUOTA_EXCEEDED' }, { status: 403 })

  try {
    const input = parsed.data
    const supportsResponsibleUser = await projectResponsibilityColumnExists()
    const assignment = supportsResponsibleUser
      ? await resolveDefaultProjectResponsible(tenant.tenantId, tenant.membership.status === 'active' ? tenant.userId : null)
      : null
    const payload = await attachTenantIdToPayload(TABLES.projects, {
      ...toSupabaseProjectInsert({ ...projectIntakeToProjectInput(input, session.artisanId), tenantId: tenant.tenantId }),
      ...(assignment ? { responsible_user_id: assignment.userId, responsible_assigned_at: new Date().toISOString(), responsible_assigned_by: tenant.userId } : {}),
    }, { tenantId: tenant.tenantId, artisanId: session.artisanId })

    const creation = await createProjectWithCanonicalClient({
      tenantId: tenant.tenantId,
      artisanId: session.artisanId,
      requestId: randomUUID(),
      source: input.source,
      projectPayload: payload,
      existingClientId: input.existingClientId || null,
      client: {
        firstName: input.clientFirstName,
        lastName: input.clientName,
        email: input.clientEmail,
        phone: input.clientPhone,
        addressLine1: input.siteAddress,
        city: input.city,
        postalCode: input.postalCode,
        acquisitionSource: input.source,
        createdFrom: 'project_intake',
      },
    })
    if (!creation.idempotent) {
      await recordProjectCreatedUsage({ artisanId: session.artisanId, projectId: creation.projectId, source: input.source })
      const activity = await getSupabaseAdmin().from(TABLES.activity).insert({ project_id: creation.projectId, action: 'PROJECT_CREATED', description: 'Dossier créé depuis Quick Create.', created_at: new Date().toISOString() })
      if (activity.error) console.error('[PROJECT_INTAKE][ACTIVITY_FAILED]', { tenantId: tenant.tenantId, code: activity.error.code || null })
      await createProjectNotification({ id: creation.projectId, artisanId: session.artisanId }, 'new_project', { title: 'Nouveau dossier', message: 'Un dossier vient d’être créé.', priority: 'high' })
    }
    return NextResponse.json({ success: true, projectId: creation.projectId, route: `/dashboard-v2/projet/${creation.projectId}`, clientId: creation.clientId })
  } catch (error) {
    console.error('[PROJECT_INTAKE][CREATE_FAILED]', { tenantId: tenant.tenantId, message: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ success: false, error: 'Impossible de créer le dossier.' }, { status: 500 })
  }
}
