import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Entry } from '../lib/types'
import { EntryDetail } from './EntryDetail'

const ICON: Record<Entry['type'], string> = { text: '📝', photo: '📷', url: '🔗' }

export function MapView({ entries, onChange }: { entries: Entry[]; onChange: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [selected, setSelected] = useState<Entry | null>(null)

  const located = entries.filter((e) => e.lat != null && e.lng != null)

  useEffect(() => {
    if (!ref.current || located.length === 0) return
    const map = L.map(ref.current, { attributionControl: false }).setView(
      [located[0].lat!, located[0].lng!],
      13,
    )
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    const markers: L.Marker[] = located.map((e) => {
      const icon = L.divIcon({
        className: 'map-pin',
        html: `<span>${ICON[e.type]}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      })
      const m = L.marker([e.lat!, e.lng!], { icon }).addTo(map)
      m.on('click', () => setSelected(e))
      return m
    })
    if (markers.length > 1) {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2))
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [located.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Map</h1>
      </header>
      {located.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🗺️</div>
          <p>No places yet.</p>
          <p className="muted">Turn on “Attach my location” when you save a photo or note.</p>
        </div>
      ) : (
        <div ref={ref} className="map" />
      )}
      {selected && (
        <EntryDetail entry={selected} onClose={() => setSelected(null)} onChange={onChange} />
      )}
    </div>
  )
}
