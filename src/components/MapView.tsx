import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's default icon paths under Vite
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import marker1x from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow,
})

export type Place = {
  id: string
  name: string
  type: 'city' | 'town' | 'village' | 'hamlet' | 'locality' | 'attraction'
  lat: number
  lon: number
}

type Props = {
  onAddPlace: (place: Place) => void
  selectedIds: Set<string>
}

export type Route = {
  coordinates: [number, number][] // [lat, lon]
  legs: { distance: number; duration: number }[]
  orderedPlaceIds: string[]
  waypoints: [number, number][]
}

type PropsWithRoute = Props & { route?: Route | null }

type StartLocation = { lat: number; lon: number; name?: string }

type PropsFull = PropsWithRoute & {
  startLocation?: StartLocation
  selectingStart?: boolean
  onStartSelected?: (lat: number, lon: number, name?: string) => void
}

type BBox = { south: number; west: number; north: number; east: number; zoom: number }

function BBoxWatcher({ onChange }: { onChange: (bbox: BBox) => void }) {
  useMapEvents({
    moveend: (ev) => {
      const m = ev.target
      const b = m.getBounds()
      const z = m.getZoom()
      onChange({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast(), zoom: z })
    },
    load: (ev) => {
      const m = ev.target
      const b = m.getBounds()
      const z = m.getZoom()
      onChange({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast(), zoom: z })
    }
  })
  return null
}

function StartSelector({ selectingStart, onStartSelected }: { selectingStart?: boolean; onStartSelected?: (lat:number, lon:number, name?:string)=>void }){
  useMapEvents({
    click: (ev) => {
      if (selectingStart && onStartSelected) onStartSelected(ev.latlng.lat, ev.latlng.lng)
    }
  })
  return null
}

export default function MapView({ onAddPlace, selectedIds, route, startLocation, selectingStart, onStartSelected }: PropsFull) {
  const [places, setPlaces] = useState<Place[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | null>(null)

  // Australia approx center and zoom
  const center: [number, number] = useMemo(() => [-25.2744, 133.7751], [])

  const fetchPlaces = async (bbox: BBox) => {
    // Build bbox string for query
    const bboxStr = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`
    const qParts: string[] = []

    // Progressive loading based on zoom level
    if (bbox.zoom < 4) {
      // Show nothing at very far zoom
      return
    } else if (bbox.zoom < 6) {
      // At far zoom, show only major cities
      qParts.push(`node["place"="city"]["population"~"[0-9]{6,}"]${bboxStr};`)
    } else if (bbox.zoom < 8) {
      // Show all cities and large towns
      qParts.push(`node["place"="city"]${bboxStr};`)
      qParts.push(`node["place"="town"]["population"~"[0-9]{5,}"]${bboxStr};`)
    } else if (bbox.zoom < 10) {
      // Show cities, towns, and larger villages
      qParts.push(`node["place"~"city|town"]${bboxStr};`)
      qParts.push(`node["place"="village"]["population"~"[0-9]{4,}"]${bboxStr};`)
    } else if (bbox.zoom < 12) {
      // Show all towns and villages
      qParts.push(`node["place"~"city|town|village"]${bboxStr};`)
    } else {
      // At closest zoom, show everything
      qParts.push(`node["place"~"city|town|village|hamlet|suburb|locality"]${bboxStr};`)
      qParts.push(`node["tourism"="attraction"]${bboxStr};`)
      qParts.push(`way["tourism"="attraction"]${bboxStr};`)
      qParts.push(`relation["tourism"="attraction"]${bboxStr};`)
    }

    const query = `[out:json][timeout:25];(
      ${qParts.join('\n      ')}
    );out center;`

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Try a few public Overpass API endpoints in case one is rate-limited or unreachable
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
      ]
      let data: { elements: any[] } | null = null
      let lastErr: any = null
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            body: query,
            headers: { 'Content-Type': 'text/plain' },
            signal: controller.signal,
          })
          if (!res.ok) throw new Error(`Overpass error (${url}): ${res.status}`)
          data = await res.json() as { elements: any[] }
          lastErr = null
          break
        } catch (err) {
          lastErr = err
          // try next endpoint
        }
      }
      if (!data) throw lastErr || new Error('Overpass: no response from endpoints')

      const pts: Place[] = []
      for (const el of data.elements) {
        const tags = el.tags || {}
        const name = tags.name || tags['name:en'] || null
        if (!name) continue
        let lat: number | undefined
        let lon: number | undefined
        if (el.type === 'node') { lat = el.lat; lon = el.lon }
        else if (el.type === 'way' || el.type === 'relation') {
          if (el.center) { lat = el.center.lat; lon = el.center.lon }
        }
        if (lat === undefined || lon === undefined) continue
        let type: Place['type'] = 'locality'
        if (tags.tourism === 'attraction') type = 'attraction'
        else if (tags.place) type = tags.place
        pts.push({ id: `${el.type}/${el.id}`, name, type, lat, lon })
      }
      setPlaces(pts)
    } catch (e) {
      if ((e as any).name === 'AbortError') return
      console.error(e)
    }
  }

  const onBBox = (bbox: BBox) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => fetchPlaces(bbox), 400)
  }

  return (
    <MapContainer center={center} zoom={4} minZoom={3} maxZoom={15} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BBoxWatcher onChange={onBBox} />
  <StartSelector selectingStart={selectingStart} onStartSelected={onStartSelected} />
      <MarkerClusterGroup chunkedLoading>
        {places.map(p => (
          <Marker key={p.id} position={[p.lat, p.lon]}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: '#475569', marginBottom: 8 }}>{p.type} · {p.lat.toFixed(3)}, {p.lon.toFixed(3)}</div>
                <button
                  className="button"
                  onClick={() => onAddPlace(p)}
                  disabled={selectedIds.has(p.id)}
                >
                  {selectedIds.has(p.id) ? 'Added' : 'Add to itinerary'}
                </button>
                {onStartSelected && (
                  <button className="button" style={{ marginLeft: 8 }} onClick={() => onStartSelected(p.lat, p.lon, p.name)}>Set as start</button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      {startLocation && (
        <Marker position={[startLocation.lat, startLocation.lon]}>
          <Popup>
            <div style={{ minWidth: 140 }}>
              <div style={{ fontWeight: 600 }}>{startLocation.name || 'Start'}</div>
              <div style={{ color: '#475569' }}>{startLocation.lat.toFixed(4)}, {startLocation.lon.toFixed(4)}</div>
            </div>
          </Popup>
        </Marker>
      )}
      {route && route.coordinates && (
        <>
          <Polyline positions={route.coordinates} pathOptions={{ color: 'dodgerblue', weight: 4, opacity: 0.85 }} />
          {route.waypoints && route.legs && route.waypoints.map((wp, i) => {
            if (i >= route.waypoints.length - 1) return null
            const next = route.waypoints[i + 1]
            const mid: [number, number] = [(wp[0] + next[0]) / 2, (wp[1] + next[1]) / 2]
            const dur = route.legs[i].duration
            const formatDuration = (s: number) => {
              const mins = Math.round(s / 60)
              if (mins < 60) return `${mins} min`
              const h = Math.floor(mins / 60)
              const m = mins % 60
              return `${h}h ${m}m`
            }
            return (
              <CircleMarker key={`seg-${i}`} center={mid} radius={8} pathOptions={{ color: '#fff', fillColor: 'dodgerblue', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]} permanent>
                  {formatDuration(dur)}
                </Tooltip>
              </CircleMarker>
            )
          })}
        </>
      )}
    </MapContainer>
  )
}
