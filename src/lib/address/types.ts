export type AddressSuggestion = {
  id: string
  label: string
  name?: string
  postcode?: string
  city?: string
  cityCode?: string
  latitude?: number
  longitude?: number
  score?: number
}
