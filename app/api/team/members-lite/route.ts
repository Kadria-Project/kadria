import { NextResponse } from 'next/server'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { listTeamMembers } from '@/src/lib/team/service'

// Endpoint léger réutilisé par le planning d'équipe et les formulaires de
// rendez-vous (sélecteur de collaborateur / affectation). Renvoie
// uniquement les membres actifs du tenant courant (résolu côté serveur via
// getCurrentTenantContext — jamais un tenantId fourni par le client).
export async function GET() {
  try {
    const tenantContext = await getCurrentTenantContext()
    if (!tenantContext) {
      // Pas de contexte tenant résolu (ex. mode démo / ancien compte non
      // migré) : on renvoie une liste vide plutôt qu'une erreur, pour ne pas
      // casser l'agenda mono-utilisateur / démo qui ne dépend pas de cette
      // route.
      return NextResponse.json({ success: true, members: [], singleUser: true, currentUserId: null })
    }

    const members = await listTeamMembers(tenantContext.tenantId)
    const activeMembers = members.filter((member) => member.status === 'active')

    return NextResponse.json({
      success: true,
      members: activeMembers.map((member) => ({
        userId: member.userId,
        name: [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.email || 'Collaborateur',
        role: member.role,
        isMe: member.userId === tenantContext.userId,
      })),
      singleUser: activeMembers.length <= 1,
      currentUserId: tenantContext.userId,
    })
  } catch (error) {
    console.error('[TEAM MEMBERS LITE]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
