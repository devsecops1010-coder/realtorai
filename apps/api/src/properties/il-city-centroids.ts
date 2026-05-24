/**
 * Lookup of major Israeli cities → approximate centroid (lat/lng).
 *
 * Used as a fallback when a Property row doesn't have its own
 * latitude/longitude geocoded. A point at the city centre is "good
 * enough" for the marketplace map: the property still shows up in the
 * right place; users who want street-level accuracy click through to the
 * detail page.
 *
 * Keys are matched against `property.city` after a Hebrew-trim. Common
 * spelling variants ("תל אביב יפו" → "תל אביב") share the same entry.
 * Coordinates are publicly known city-hall locations (Wikipedia /
 * OpenStreetMap), not licensed map data.
 */
export interface Centroid {
  lat: number;
  lng: number;
}

export const IL_CITY_CENTROIDS: Record<string, Centroid> = {
  'תל אביב': { lat: 32.0853, lng: 34.7818 },
  'תל אביב יפו': { lat: 32.0853, lng: 34.7818 },
  'ירושלים': { lat: 31.7683, lng: 35.2137 },
  'חיפה': { lat: 32.7940, lng: 34.9896 },
  'ראשון לציון': { lat: 31.9710, lng: 34.7894 },
  'פתח תקווה': { lat: 32.0890, lng: 34.8861 },
  'אשדוד': { lat: 31.8044, lng: 34.6553 },
  'נתניה': { lat: 32.3215, lng: 34.8532 },
  'באר שבע': { lat: 31.2520, lng: 34.7915 },
  'חולון': { lat: 32.0114, lng: 34.7722 },
  'בני ברק': { lat: 32.0807, lng: 34.8338 },
  'רמת גן': { lat: 32.0680, lng: 34.8248 },
  'בת ים': { lat: 32.0167, lng: 34.7500 },
  'רחובות': { lat: 31.8928, lng: 34.8113 },
  'הרצליה': { lat: 32.1624, lng: 34.8443 },
  'כפר סבא': { lat: 32.1750, lng: 34.9069 },
  'מודיעין': { lat: 31.8969, lng: 35.0095 },
  'מודיעין מכבים רעות': { lat: 31.8969, lng: 35.0095 },
  'רעננה': { lat: 32.1847, lng: 34.8708 },
  'חדרה': { lat: 32.4339, lng: 34.9197 },
  'לוד': { lat: 31.9522, lng: 34.8881 },
  'רמלה': { lat: 31.9286, lng: 34.8669 },
  'נצרת': { lat: 32.7026, lng: 35.2956 },
  'אילת': { lat: 29.5577, lng: 34.9519 },
  'אשקלון': { lat: 31.6688, lng: 34.5743 },
  'עכו': { lat: 32.9275, lng: 35.0789 },
  'טבריה': { lat: 32.7958, lng: 35.5310 },
  'גבעתיים': { lat: 32.0719, lng: 34.8094 },
  'רמת השרון': { lat: 32.1442, lng: 34.8404 },
  'הוד השרון': { lat: 32.1496, lng: 34.8919 },
  'צפת': { lat: 32.9646, lng: 35.4960 },
  'בית שמש': { lat: 31.7497, lng: 34.9866 },
  'קרית ביאליק': { lat: 32.8267, lng: 35.0867 },
  'יבנה': { lat: 31.8784, lng: 34.7384 },
  'ראש העין': { lat: 32.0837, lng: 34.9550 },
  'יהוד': { lat: 32.0327, lng: 34.8919 },
  'יהוד מונוסון': { lat: 32.0327, lng: 34.8919 },
  'אור יהודה': { lat: 32.0306, lng: 34.8551 },
  'קרית אונו': { lat: 32.0641, lng: 34.8553 },
  'נהריה': { lat: 33.0091, lng: 35.0944 },
  'עפולה': { lat: 32.6075, lng: 35.2895 },
  'אריאל': { lat: 32.1058, lng: 35.1755 },
  'מעלה אדומים': { lat: 31.7733, lng: 35.2978 },
  'דימונה': { lat: 31.0708, lng: 35.0331 },
  'נצרת עילית': { lat: 32.7036, lng: 35.3175 },
  'נוף הגליל': { lat: 32.7036, lng: 35.3175 },
};

/**
 * Look up a city centroid. Trims + tries direct + falls back to checking
 * whether any key is a substring of the input (handles "פתח תקווה הצעירה"
 * etc.). Returns `null` if no match — caller should drop the property
 * from the map in that case.
 */
export function centroidForCity(city: string | null | undefined): Centroid | null {
  if (!city) return null;
  const key = city.trim();
  if (key in IL_CITY_CENTROIDS) return IL_CITY_CENTROIDS[key];
  for (const k of Object.keys(IL_CITY_CENTROIDS)) {
    if (key.includes(k) || k.includes(key)) return IL_CITY_CENTROIDS[k];
  }
  return null;
}

/**
 * Resolve lat/lng for a property — use stored coords if present,
 * otherwise the city centroid. Returns `null` if neither is available
 * (e.g. a city we don't know).
 */
export function resolvePropertyGeo(
  property: { latitude?: number | null; longitude?: number | null; city?: string | null },
): Centroid | null {
  if (
    typeof property.latitude === 'number' &&
    typeof property.longitude === 'number' &&
    Number.isFinite(property.latitude) &&
    Number.isFinite(property.longitude)
  ) {
    return { lat: property.latitude, lng: property.longitude };
  }
  return centroidForCity(property.city);
}
