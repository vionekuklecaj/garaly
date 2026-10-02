// Free, keyless, CORS-enabled German postal-code lookup -- no backend
// round-trip needed, so the city can fill in as the host types the zip.
export async function lookupCityForZip(zip: string): Promise<string | null> {
  if (!/^\d{5}$/.test(zip)) return null;
  try {
    const res = await fetch(`https://api.zippopotam.us/de/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0]?.["place name"];
    return typeof place === "string" ? place : null;
  } catch {
    return null;
  }
}
