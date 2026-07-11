import { NextRequest, NextResponse } from 'next/server'
import { PermissionError } from '@/src/lib/team/access'
import { getSelfVehicleProfile, upsertSelfVehicleProfile } from '@/src/lib/profile/service'

export async function GET() {
  try {
    const result = await getSelfVehicleProfile()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'VEHICLE_GET_FAILED' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await upsertSelfVehicleProfile({
      vehicleType: body.vehicleType,
      motorization: body.motorization,
      fiscalPower: body.fiscalPower,
      licensePlate: body.licensePlate,
      ownershipType: body.ownershipType,
      isDefault: body.isDefault,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'VEHICLE_PATCH_FAILED'
    const status = message === 'USER_VEHICLE_PROFILES_TABLE_MISSING' ? 503 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
