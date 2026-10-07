import type { Place, RouteOption, Weather, PrayerTimes } from "../types";
export interface LatLng { lat: number; lng: number }
export interface PlaceQuery { q?: string; category?: string; area?: string; city?: string; halal?: boolean; vegan?: boolean; limit?: number }
export interface MapProvider { name: string; geocode(address: string): Promise<(LatLng & { address: string }) | null>; reverse(p: LatLng): Promise<string | null> }
export interface PlaceProvider { name: string; demo: boolean; search(q: PlaceQuery): Promise<Place[]> }
export interface TransitProvider { name: string; demo: boolean; getOptions(from: LatLng, to: LatLng, departMin: number): Promise<RouteOption[]> }
export interface WeatherProvider { name: string; get(p: LatLng, date: string): Promise<Weather | null> }
export interface PrayerProvider { name: string; get(p: LatLng, date: string): Promise<PrayerTimes | null> }
export interface ReservationProvider { name: string; demo: boolean; slots(place: Place, date: string): Promise<{ time: string; available: boolean }[] | null>; book(place: Place, date: string, time: string, party: number, name: string): Promise<{ code: string } | null> }
export interface PriceProvider { name: string; price(placeId: string): Promise<{ min: number; max: number; basis: string } | null> }
