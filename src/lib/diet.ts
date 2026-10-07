import type { Diet, Place } from "./types";
const FOOD = ["restaurant", "cafe", "market"];
export const isFood = (p: Place) => FOOD.includes(p.category);
export const HALAL_LABEL: Record<Place["halal"], string> = {
  halal_verified: "Halal verified", halal_friendly: "Halal-friendly", muslim_friendly: "Muslim-friendly",
  user_reported: "User reported", unverified: "Unverified",
};
/** Dietary compatibility. Unverified food places are never treated as halal. */
export function dietaryOK(p: Place, d: Diet): boolean {
  if (!isFood(p)) return true;
  if (d.muslim) {
    // Cafes serving no alcohol are acceptable for drinks; meals/markets need an explicit halal status.
    if (p.category === "cafe") { if (p.alcohol) return false; }
    else if (p.halal === "unverified") return false;
  }
  if (d.noAlcohol && p.alcohol && p.category !== "market") return false;
  if (d.vegan && p.vegan === "none") return false;
  if (d.vegetarian && p.vegan === "none") return false;
  return true;
}
