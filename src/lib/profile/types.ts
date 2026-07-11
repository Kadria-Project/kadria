export const PERSONAL_VEHICLE_TYPES = [
  'car',
  'utility',
  'motorcycle',
  'bicycle',
  'electric_vehicle',
  'none',
  'other',
] as const

export type PersonalVehicleType = (typeof PERSONAL_VEHICLE_TYPES)[number]

export const PERSONAL_VEHICLE_TYPE_LABELS: Record<PersonalVehicleType, string> = {
  car: 'Voiture',
  utility: 'Utilitaire',
  motorcycle: 'Moto / scooter',
  bicycle: 'Vélo',
  electric_vehicle: 'Véhicule électrique',
  none: 'Aucun véhicule',
  other: 'Autre',
}

export const VEHICLE_OWNERSHIP_TYPES = ['personal', 'company'] as const
export type VehicleOwnershipType = (typeof VEHICLE_OWNERSHIP_TYPES)[number]

export const VEHICLE_OWNERSHIP_LABELS: Record<VehicleOwnershipType, string> = {
  personal: 'Véhicule personnel',
  company: "Véhicule d'entreprise",
}

export interface ProfessionalProfile {
  firstName: string
  lastName: string
  email: string
  professionalPhone: string
  jobTitle: string
}

export interface UserVehicleProfile {
  id: string | null
  vehicleType: PersonalVehicleType | null
  motorization: string
  fiscalPower: number | null
  licensePlate: string
  ownershipType: VehicleOwnershipType | null
  isDefault: boolean
}

export const EMPTY_USER_VEHICLE_PROFILE: UserVehicleProfile = {
  id: null,
  vehicleType: null,
  motorization: '',
  fiscalPower: null,
  licensePlate: '',
  ownershipType: null,
  isDefault: true,
}

export function isPersonalVehicleType(value: unknown): value is PersonalVehicleType {
  return typeof value === 'string' && PERSONAL_VEHICLE_TYPES.includes(value as PersonalVehicleType)
}

export function isVehicleOwnershipType(value: unknown): value is VehicleOwnershipType {
  return typeof value === 'string' && VEHICLE_OWNERSHIP_TYPES.includes(value as VehicleOwnershipType)
}
