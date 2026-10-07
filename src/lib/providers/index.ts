import { MockMapProvider, MockPlaceProvider, MockReservationProvider, NoReservationProvider, MockPrayerProvider, MockTransitProvider, MockWeatherProvider, estimateOptions } from "./mock";
import { AladhanProvider, KoreanTransitProvider, NaverMapProvider, NaverPlaceProvider, OpenMeteoProvider } from "./real";
import type { ReservationProvider, MapProvider, PlaceProvider, PrayerProvider, TransitProvider, WeatherProvider } from "./types";

export interface Providers { map: MapProvider; places: PlaceProvider; transit: TransitProvider; weather: WeatherProvider; prayer: PrayerProvider; reservations: ReservationProvider }
/** Provider registry driven by env vars. Swap implementations here only. */
export function getProviders(): Providers {
  const e = process.env;
  return {
    map: e.MAP_PROVIDER === "naver" ? new NaverMapProvider() : new MockMapProvider(),
    places: e.PLACE_PROVIDER === "naver" ? new NaverPlaceProvider() : new MockPlaceProvider(),
    transit: e.TRANSIT_PROVIDER === "korean" ? new KoreanTransitProvider() : new MockTransitProvider(),
    weather: e.WEATHER_PROVIDER === "openmeteo" ? new OpenMeteoProvider() : new MockWeatherProvider(),
    prayer: e.PRAYER_PROVIDER === "aladhan" ? new AladhanProvider() : new MockPrayerProvider(),
    reservations: e.RESERVATION_PROVIDER === "none" ? new NoReservationProvider() : new MockReservationProvider(),
  };
}
export { estimateOptions };
