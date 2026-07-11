import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/auth-utils'
import { getBusinessProfile, upsertBusinessProfile } from '@/src/lib/business-profile'
import { getCurrentTenantContext } from '@/src/lib/tenant-context'
import { PermissionError, requirePermission } from '@/src/lib/team/access'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { row, tableMissing } = await getBusinessProfile(session.artisanId)

    if (tableMissing) {
      return NextResponse.json({ success: true, profile: null })
    }

    return NextResponse.json({ success: true, profile: row })
  } catch (error) {
    console.error('[BUSINESS PROFILE GET]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === 'string')
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    try {
      requirePermission(await getCurrentTenantContext(), 'business_settings.update')
    } catch (permissionError) {
      if (permissionError instanceof PermissionError) {
        return NextResponse.json({ success: false, error: permissionError.message }, { status: permissionError.status })
      }
      throw permissionError
    }

    const body = await request.json()
    const fields: Record<string, unknown> = {}

    // 1. Identité métier
    if (body.primaryTrade !== undefined) fields.primary_trade = body.primaryTrade
    if (body.specialties !== undefined) {
      if (!isStringArray(body.specialties)) {
        return NextResponse.json({ success: false, error: 'specialties doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.specialties = body.specialties
    }
    if (body.excludedServices !== undefined) {
      if (!isStringArray(body.excludedServices)) {
        return NextResponse.json({ success: false, error: 'excludedServices doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.excluded_services = body.excludedServices
    }
    if (body.coveredTrades !== undefined) {
      if (!isStringArray(body.coveredTrades)) {
        return NextResponse.json({ success: false, error: 'coveredTrades doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.covered_trades = body.coveredTrades
    }

    // 2. Zone d'intervention
    if (body.baseCity !== undefined) fields.base_city = body.baseCity
    if (body.interventionRadiusKm !== undefined) fields.intervention_radius_km = body.interventionRadiusKm
    if (body.travelFeeHt !== undefined) fields.travel_fee_ht = body.travelFeeHt
    if (body.travelFeePerKm !== undefined) fields.travel_fee_per_km = body.travelFeePerKm

    // 3. Horaires
    if (body.workingDays !== undefined) {
      if (!isStringArray(body.workingDays)) {
        return NextResponse.json({ success: false, error: 'workingDays doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.working_days = body.workingDays
    }
    if (body.workStartTime !== undefined) fields.work_start_time = body.workStartTime
    if (body.workEndTime !== undefined) fields.work_end_time = body.workEndTime
    if (body.urgentAvailable !== undefined) fields.urgent_available = !!body.urgentAvailable

    // 4. Chiffrage
    if (body.defaultVatRate !== undefined) fields.default_vat_rate = body.defaultVatRate
    if (body.hourlyRateHt !== undefined) fields.hourly_rate_ht = body.hourlyRateHt
    if (body.diagnosticFeeHt !== undefined) fields.diagnostic_fee_ht = body.diagnosticFeeHt
    if (body.defaultMarginPercent !== undefined) fields.default_margin_percent = body.defaultMarginPercent
    if (body.paymentTerms !== undefined) fields.payment_terms = body.paymentTerms

    // 5. Marques / préférences
    if (body.preferredBrands !== undefined) {
      if (!isStringArray(body.preferredBrands)) {
        return NextResponse.json({ success: false, error: 'preferredBrands doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.preferred_brands = body.preferredBrands
    }
    if (body.avoidedBrands !== undefined) {
      if (!isStringArray(body.avoidedBrands)) {
        return NextResponse.json({ success: false, error: 'avoidedBrands doit être un tableau de chaînes' }, { status: 400 })
      }
      fields.avoided_brands = body.avoidedBrands
    }
    if (body.internalNotes !== undefined) fields.internal_notes = body.internalNotes

    const { row, error, tableMissing } = await upsertBusinessProfile(session.artisanId, fields)

    if (tableMissing) {
      return NextResponse.json({ success: false, error: 'La table artisan_business_profile n\'existe pas encore en base. Exécutez la migration Supabase.' }, { status: 503 })
    }
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: row })
  } catch (error) {
    console.error('[BUSINESS PROFILE PATCH]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
