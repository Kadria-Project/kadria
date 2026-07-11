import { NextRequest, NextResponse } from 'next/server'
import { PermissionError } from '@/src/lib/team/access'
import { getSelfProfessionalProfile, updateSelfProfessionalProfile } from '@/src/lib/profile/service'

export async function GET() {
  try {
    const profile = await getSelfProfessionalProfile()
    return NextResponse.json({ success: true, profile })
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'PROFILE_GET_FAILED' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const profile = await updateSelfProfessionalProfile({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      professionalPhone: body.professionalPhone,
      jobTitle: body.jobTitle,
    })
    return NextResponse.json({ success: true, profile })
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'PROFILE_PATCH_FAILED' }, { status: 500 })
  }
}
