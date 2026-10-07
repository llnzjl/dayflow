import type { Place } from "./types";

/**
 * Returns a reliable Google Maps search URL for any venue in South Korea.
 * Strips out demo labels and fictional district tags, prioritizing Korean names
 * and clean road addresses so Google Maps directly resolves the actual place.
 */
export function getGoogleMapsUrl(place: Pick<Place, "name" | "nameKo" | "address">, cityContext?: string): string {
  const cleanAddr = (place.address || "")
    .replace(/\s*\([^)]*demo[^)]*\)/gi, "")
    .replace(/\s*\(meeting location\)/gi, "")
    .replace(/\s*\(farewell\)/gi, "")
    .replace(/\s*\(배웅\)/gi, "")
    .replace(/\s*\(만남의 장소\)/gi, "")
    .trim();

  // If Korean name exists, search "nameKo + clean address / city"
  // e.g. "풀문 수암골 청주" or "Maru Coffee Lab Seongsu"
  let query = "";
  if (place.nameKo && place.nameKo !== place.name) {
    const addrFirst = cleanAddr ? cleanAddr.split(",")[0].trim() : "";
    query = `${place.nameKo} ${addrFirst || cityContext || ""}`.trim();
  } else {
    const addrFirst = cleanAddr ? cleanAddr.split(",")[0].trim() : "";
    query = `${place.name} ${addrFirst || cityContext || ""}`.trim();
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || place.name)}`;
}

/**
 * Returns a Naver Map navigation / search URL for South Korea.
 * In South Korea, Naver Map provides accurate turn-by-turn routing and place info.
 */
export function getNaverMapUrl(place: Pick<Place, "name" | "nameKo" | "address">): string {
  const q = place.nameKo || place.name;
  return `https://map.naver.com/p/search/${encodeURIComponent(q)}`;
}

