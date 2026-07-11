import 'server-only'

import { getCurrentTenantContext, tableExists } from '@/src/lib/tenant-context'
import { PermissionError, requirePermission } from '@/src/lib/team/access'
import { getSupabaseAdmin } from '@/src/lib/supabase/server'
import {
  EMPTY_USER_VEHICLE_PROFILE,
  isPersonalVehicleType,
  isVehicleOwnershipType,
  type ProfessionalProfile,
  type UserVehicleProfile,
} from '@/src/lib/profile/types'

const USERS_TABLE = 'Users'
const USER_VEHICLE_PROFILES_TABLE = 'user_vehicle_profiles'

function toText(value: unknown) {
  return value === null || value === undefined ? '' : String(value)
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function requireSelfPermission(permission: 'profile.update_self' | 'vehicle.read_self' | 'vehicle.update_self') {
  const tenantContext = await getCurrentTenantContext()
  if (!tenantContext) {
    throw new PermissionError('UNAUTHENTICATED')
  }
  requirePermission(tenantContext, permission)
  return tenantContext
}

export async function getSelfProfessionalProfile(): Promise<ProfessionalProfile> {
  const tenantContext = await requireSelfPermission('profile.update_self')
  const supabase = getSupabaseAdmin()

  const [{ data: user, error: userError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase
      .from(USERS_TABLE)
      .select('first_name,last_name,email,professional_phone')
      .eq('id', tenantContext.userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('tenant_members')
      .select('job_title')
      .eq('tenant_id', tenantContext.tenantId)
      .eq('user_id', tenantContext.userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ])

  if (userError) throw new Error(userError.message)
  if (membershipError) throw new Error(membershipError.message)

  return {
    firstName: toText(user?.first_name || tenantContext.user.firstName),
    lastName: toText(user?.last_name || tenantContext.user.lastName),
    email: toText(user?.email || tenantContext.user.email),
    professionalPhone: toText(user?.professional_phone),
    jobTitle: toText(membership?.job_title),
  }
}

export async function updateSelfProfessionalProfile(input: Partial<ProfessionalProfile>) {
  const tenantContext = await requireSelfPermission('profile.update_self')
  const supabase = getSupabaseAdmin()

  const userPatch: Record<string, unknown> = {}
  if (input.firstName !== undefined) userPatch.first_name = toText(input.firstName).trim()
  if (input.lastName !== undefined) userPatch.last_name = toText(input.lastName).trim()
  if (input.email !== undefined) userPatch.email = toText(input.email).trim().toLowerCase()
  if (input.professionalPhone !== undefined) userPatch.professional_phone = toText(input.professionalPhone).trim()

  if (Object.keys(userPatch).length > 0) {
    const { error } = await supabase
      .from(USERS_TABLE)
      .update(userPatch)
      .eq('id', tenantContext.userId)

    if (error) throw new Error(error.message)
  }

  if (input.jobTitle !== undefined) {
    const { error } = await supabase
      .from('tenant_members')
      .update({ job_title: toText(input.jobTitle).trim() || null })
      .eq('tenant_id', tenantContext.tenantId)
      .eq('user_id', tenantContext.userId)
      .eq('status', 'active')

    if (error) throw new Error(error.message)
  }

  return getSelfProfessionalProfile()
}

export async function getSelfVehicleProfile(): Promise<{ available: boolean; profile: UserVehicleProfile }> {
  const tenantContext = await requireSelfPermission('vehicle.read_self')
  if (!(await tableExists(USER_VEHICLE_PROFILES_TABLE))) {
    return { available: false, profile: EMPTY_USER_VEHICLE_PROFILE }
  }

  const { data, error } = await getSupabaseAdmin()
    .from(USER_VEHICLE_PROFILES_TABLE)
    .select('id,vehicle_type,motorization,fiscal_power,license_plate,ownership_type,is_default')
    .eq('tenant_id', tenantContext.tenantId)
    .eq('user_id', tenantContext.userId)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    return { available: true, profile: EMPTY_USER_VEHICLE_PROFILE }
  }

  return {
    available: true,
    profile: {
      id: toText(data.id) || null,
      vehicleType: isPersonalVehicleType(data.vehicle_type) ? data.vehicle_type : null,
      motorization: toText(data.motorization),
      fiscalPower: toNullableNumber(data.fiscal_power),
      licensePlate: toText(data.license_plate),
      ownershipType: isVehicleOwnershipType(data.ownership_type) ? data.ownership_type : null,
      isDefault: data.is_default !== false,
    },
  }
}

export async function upsertSelfVehicleProfile(input: Partial<UserVehicleProfile>) {
  const tenantContext = await requireSelfPermission('vehicle.update_self')
  if (!(await tableExists(USER_VEHICLE_PROFILES_TABLE))) {
    throw new Error('USER_VEHICLE_PROFILES_TABLE_MISSING')
  }

  const payload = {
    tenant_id: tenantContext.tenantId,
    user_id: tenantContext.userId,
    vehicle_type: isPersonalVehicleType(input.vehicleType) ? input.vehicleType : null,
    motorization: toText(input.motorization).trim() || null,
    fiscal_power: toNullableNumber(input.fiscalPower),
    license_plate: toText(input.licensePlate).trim().toUpperCase() || null,
    ownership_type: isVehicleOwnershipType(input.ownershipType) ? input.ownershipType : null,
    is_default: input.isDefault !== false,
  }

  const { error } = await getSupabaseAdmin()
    .from(USER_VEHICLE_PROFILES_TABLE)
    .upsert(payload, { onConflict: 'tenant_id,user_id' })

  if (error) throw new Error(error.message)
  return getSelfVehicleProfile()
}
