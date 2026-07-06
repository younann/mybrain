export interface Coords {
  lat: number
  lng: number
}

/** Current position, or null if unavailable/denied (never rejects). */
export function currentPosition(): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60_000 },
    )
  })
}
