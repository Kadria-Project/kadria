// V1: average French fuel/energy prices and consumption defaults.
// No external API is called from the front-end; prices live here as a
// centralized, easily-updatable config (future: admin route or server
// integration with prix-carburants.gouv.fr).

export type VehicleType = 'essence' | 'diesel' | 'electrique' | 'gpl' | 'e85'
export type ChargingType = 'maison' | 'exterieur'

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  electrique: 'Électrique',
  gpl: 'GPL',
  e85: 'E85 (superéthanol)',
}

export const CHARGING_TYPE_LABELS: Record<ChargingType, string> = {
  maison: 'Recharge à la maison',
  exterieur: 'Recharge à l\'extérieur',
}

// Default consumption: L/100km for thermal vehicles, kWh/100km for electric.
export const DEFAULT_CONSUMPTION_PER_100KM: Record<VehicleType, number> = {
  essence: 7,
  diesel: 6,
  e85: 8.5,
  gpl: 9,
  electrique: 17,
}

// Average fuel price (€/L) — V1 placeholder constants, configurable.
export const DEFAULT_FUEL_PRICE_PER_LITER: Record<Exclude<VehicleType, 'electrique'>, number> = {
  essence: 1.85,
  diesel: 1.75,
  e85: 0.99,
  gpl: 0.95,
}

// Average electricity price (€/kWh) by charging type.
export const DEFAULT_ELECTRICITY_PRICE_PER_KWH: Record<ChargingType, number> = {
  maison: 0.2,
  exterieur: 0.39,
}

export interface TravelConfig {
  vehicleType?: VehicleType
  consumptionPer100Km?: number
  chargingType?: ChargingType
  customCostPerKm?: number
  originLat?: number
  originLng?: number
}

export interface TravelCostResult {
  distanceKm: number
  distanceKmAR: number
  cost: number
  energyLabel: string
}

export function getDefaultConsumption(vehicleType: VehicleType): number {
  return DEFAULT_CONSUMPTION_PER_100KM[vehicleType]
}

// Haversine distance (km) — straight-line estimate, not a routed distance.
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

export function calculateTravelCost(
  distanceKm: number,
  travelConfig: TravelConfig
): TravelCostResult | null {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null

  const vehicleType = travelConfig.vehicleType
  if (!vehicleType) return null

  const distanceKmAR = distanceKm * 2

  if (travelConfig.customCostPerKm !== undefined && Number.isFinite(travelConfig.customCostPerKm)) {
    return {
      distanceKm,
      distanceKmAR,
      cost: distanceKmAR * travelConfig.customCostPerKm,
      energyLabel: VEHICLE_TYPE_LABELS[vehicleType],
    }
  }

  const consumption = travelConfig.consumptionPer100Km ?? getDefaultConsumption(vehicleType)
  if (!Number.isFinite(consumption)) return null

  if (vehicleType === 'electrique') {
    const chargingType = travelConfig.chargingType ?? 'maison'
    const pricePerKwh = DEFAULT_ELECTRICITY_PRICE_PER_KWH[chargingType]
    const cost = (distanceKmAR * consumption) / 100 * pricePerKwh
    return { distanceKm, distanceKmAR, cost, energyLabel: VEHICLE_TYPE_LABELS[vehicleType] }
  }

  const fuelPricePerLiter = DEFAULT_FUEL_PRICE_PER_LITER[vehicleType]
  const cost = (distanceKmAR * consumption) / 100 * fuelPricePerLiter
  return { distanceKm, distanceKmAR, cost, energyLabel: VEHICLE_TYPE_LABELS[vehicleType] }
}

// Mission 6 prep: lightweight signals for future scoring integration.
// Not wired into project-scoring.ts yet — exported for later use.
export function classifyTravelCostRisk(cost: number): 'low' | 'medium' | 'high' {
  if (cost < 15) return 'low'
  if (cost < 40) return 'medium'
  return 'high'
}
