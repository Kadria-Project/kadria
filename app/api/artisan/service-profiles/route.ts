import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { listServiceProfiles, createServiceProfile } from '@/src/lib/service-profiles'
import { isQualificationFieldArray } from '@/src/lib/qualification-fields'

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === 'string')
}

function isPhotoRequirementArray(v: unknown): v is Array<{ id: string; title: string; description: string; required: boolean; order: number }> {
  return Array.isArray(v) && v.every((item) =>
    item && typeof item === 'object' &&
    typeof (item as { id?: unknown }).id === 'string' &&
    typeof (item as { title?: unknown }).title === 'string' &&
    typeof (item as { description?: unknown }).description === 'string' &&
    typeof (item as { required?: unknown }).required === 'boolean' &&
    typeof (item as { order?: unknown }).order === 'number'
  )
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { rows, tableMissing } = await listServiceProfiles(session.artisanId)

    if (tableMissing) {
      return NextResponse.json({ success: true, profiles: [] })
    }

    return NextResponse.json({ success: true, profiles: rows })
  } catch (error) {
    console.error('[SERVICE PROFILES GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()

    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Le nom de la prestation est requis' }, { status: 400 })
    }

    if (body.detectionKeywords !== undefined && !isStringArray(body.detectionKeywords)) {
      return NextResponse.json({ success: false, error: 'detectionKeywords doit être un tableau de chaînes' }, { status: 400 })
    }
    if (body.qualificationQuestions !== undefined && !isStringArray(body.qualificationQuestions)) {
      return NextResponse.json({ success: false, error: 'qualificationQuestions doit être un tableau de chaînes' }, { status: 400 })
    }
    if (body.requiredInformation !== undefined && !isStringArray(body.requiredInformation)) {
      return NextResponse.json({ success: false, error: 'requiredInformation doit être un tableau de chaînes' }, { status: 400 })
    }
    if (body.relatedServices !== undefined && !isStringArray(body.relatedServices)) {
      return NextResponse.json({ success: false, error: 'relatedServices doit être un tableau de chaînes' }, { status: 400 })
    }
    if (body.recommendedQuoteLines !== undefined && !Array.isArray(body.recommendedQuoteLines)) {
      return NextResponse.json({ success: false, error: 'recommendedQuoteLines doit être un tableau' }, { status: 400 })
    }
    if (body.requiredPhotosList !== undefined && !isPhotoRequirementArray(body.requiredPhotosList)) {
      return NextResponse.json({ success: false, error: 'requiredPhotosList doit être un tableau de { id, title, description, required, order }' }, { status: 400 })
    }
    if (body.qualificationFields !== undefined && !isQualificationFieldArray(body.qualificationFields)) {
      return NextResponse.json({ success: false, error: 'qualificationFields doit être un tableau de champs de qualification valides' }, { status: 400 })
    }

    const requiredPhotosList: Array<{ id: string; title: string; description: string; required: boolean; order: number }> = body.requiredPhotosList ?? []
    const fields: Record<string, unknown> = {
      name: body.name.trim(),
      category: typeof body.category === 'string' ? body.category : null,
      description: typeof body.description === 'string' ? body.description : null,
      is_active: body.isActive !== undefined ? !!body.isActive : true,
      service_catalog_id: typeof body.serviceCatalogId === 'string' && body.serviceCatalogId ? body.serviceCatalogId : null,
      detection_keywords: body.detectionKeywords ?? [],
      qualification_questions: body.qualificationQuestions ?? [],
      qualification_fields: body.qualificationFields ?? [],
      required_information: body.requiredInformation ?? [],
      // Migration douce : required_photos (legacy) reste piloté manuellement
      // si la nouvelle liste est vide ; dès qu'une liste est définie, elle
      // devient la source de vérité et le booléen la reflète.
      required_photos: requiredPhotosList.length > 0 ? requiredPhotosList.some((p) => p.required) : !!body.requiredPhotos,
      required_photos_list: requiredPhotosList,
      recommended_quote_lines: body.recommendedQuoteLines ?? [],
      average_duration_minutes: typeof body.averageDurationMinutes === 'number' ? body.averageDurationMinutes : null,
      default_vat_rate: typeof body.defaultVatRate === 'number' ? body.defaultVatRate : null,
      travel_required: !!body.travelRequired,
      appointment_recommended: !!body.appointmentRecommended,
      emergency_supported: !!body.emergencySupported,
      related_services: body.relatedServices ?? [],
      internal_notes: typeof body.internalNotes === 'string' ? body.internalNotes : null,
    }

    const { row, error, tableMissing } = await createServiceProfile(session.artisanId, fields)

    if (tableMissing) {
      return NextResponse.json({ success: false, error: 'La table service_profiles n\'existe pas encore en base. Exécutez la migration Supabase.' }, { status: 503 })
    }
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: row })
  } catch (error) {
    console.error('[SERVICE PROFILES POST]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
