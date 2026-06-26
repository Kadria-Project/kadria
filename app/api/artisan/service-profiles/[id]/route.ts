import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getServiceProfile, updateServiceProfile, deleteOrDeactivateServiceProfile } from '@/src/lib/service-profiles'

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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const { row, error, tableMissing } = await getServiceProfile(session.artisanId, id)

    if (tableMissing) {
      return NextResponse.json({ success: true, profile: null })
    }
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ success: false, error: 'Prestation introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile: row })
  } catch (error) {
    console.error('[SERVICE PROFILE GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const fields: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ success: false, error: 'Le nom de la prestation est requis' }, { status: 400 })
      }
      fields.name = body.name.trim()
    }
    if (body.category !== undefined) fields.category = body.category
    if (body.description !== undefined) fields.description = body.description
    if (body.isActive !== undefined) fields.is_active = !!body.isActive
    if (body.serviceCatalogId !== undefined) fields.service_catalog_id = body.serviceCatalogId || null

    if (body.detectionKeywords !== undefined) {
      if (!isStringArray(body.detectionKeywords)) {
        return NextResponse.json({ success: false, error: 'detectionKeywords doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.detection_keywords = body.detectionKeywords
    }
    if (body.qualificationQuestions !== undefined) {
      if (!isStringArray(body.qualificationQuestions)) {
        return NextResponse.json({ success: false, error: 'qualificationQuestions doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.qualification_questions = body.qualificationQuestions
    }
    if (body.requiredInformation !== undefined) {
      if (!isStringArray(body.requiredInformation)) {
        return NextResponse.json({ success: false, error: 'requiredInformation doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.required_information = body.requiredInformation
    }
    if (body.requiredPhotosList !== undefined) {
      if (!isPhotoRequirementArray(body.requiredPhotosList)) {
        return NextResponse.json({ success: false, error: 'requiredPhotosList doit être un tableau de { id, title, description, required, order }' }, { status: 400 })
      }
      fields.required_photos_list = body.requiredPhotosList
      // Migration douce : dès qu'une liste est fournie, elle pilote le
      // booléen legacy ; sinon le booléen reste indépendant.
      fields.required_photos = body.requiredPhotosList.length > 0
        ? body.requiredPhotosList.some((p: { required: boolean }) => p.required)
        : (body.requiredPhotos !== undefined ? !!body.requiredPhotos : false)
    } else if (body.requiredPhotos !== undefined) {
      fields.required_photos = !!body.requiredPhotos
    }

    if (body.recommendedQuoteLines !== undefined) {
      if (!Array.isArray(body.recommendedQuoteLines)) {
        return NextResponse.json({ success: false, error: 'recommendedQuoteLines doit être un tableau' }, { status: 400 })
      }
      fields.recommended_quote_lines = body.recommendedQuoteLines
    }
    if (body.averageDurationMinutes !== undefined) fields.average_duration_minutes = body.averageDurationMinutes
    if (body.defaultVatRate !== undefined) fields.default_vat_rate = body.defaultVatRate
    if (body.travelRequired !== undefined) fields.travel_required = !!body.travelRequired
    if (body.appointmentRecommended !== undefined) fields.appointment_recommended = !!body.appointmentRecommended
    if (body.emergencySupported !== undefined) fields.emergency_supported = !!body.emergencySupported

    if (body.relatedServices !== undefined) {
      if (!isStringArray(body.relatedServices)) {
        return NextResponse.json({ success: false, error: 'relatedServices doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.related_services = body.relatedServices
    }
    if (body.internalNotes !== undefined) fields.internal_notes = body.internalNotes

    const { row, error, tableMissing } = await updateServiceProfile(session.artisanId, id, fields)

    if (tableMissing) {
      return NextResponse.json({ success: false, error: 'La table service_profiles n\'existe pas encore en base. Exécutez la migration Supabase.' }, { status: 503 })
    }
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ success: false, error: 'Prestation introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile: row })
  } catch (error) {
    console.error('[SERVICE PROFILE PATCH]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const { deleted, row, error, tableMissing } = await deleteOrDeactivateServiceProfile(session.artisanId, id)

    if (tableMissing) {
      return NextResponse.json({ success: false, error: 'La table service_profiles n\'existe pas encore en base. Exécutez la migration Supabase.' }, { status: 503 })
    }
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted, profile: row })
  } catch (error) {
    console.error('[SERVICE PROFILE DELETE]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
