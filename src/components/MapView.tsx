import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
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
  population?: number
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
  showFuelStations?: boolean
  showDumpPoints?: boolean
  showSmallTownsOnly?: boolean
  showCampsites?: boolean
  itinerary?: { id: string; name: string; lat: number; lon: number }[]
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

function CenterOnStart({ startLocation }: { startLocation?: StartLocation }){
  const map = useMap()
  React.useEffect(() => {
    if (!startLocation) return
    try {
      const currentZoom = map.getZoom()
      const targetZoom = Math.max(currentZoom, 12)
      map.flyTo([startLocation.lat, startLocation.lon], targetZoom, { duration: 0.8 })
    } catch (e) {
      // ignore
    }
  }, [startLocation])
  return null
}

export default function MapView({ onAddPlace, selectedIds, route, startLocation, selectingStart, onStartSelected, showFuelStations, showDumpPoints, showSmallTownsOnly, showCampsites, itinerary }: PropsFull) {
  const [places, setPlaces] = useState<Place[]>([])
  const [campsites, setCampsites] = useState<Place[]>([])
  const [paidCampsites, setPaidCampsites] = useState<Place[]>([])
  const [fuelStations, setFuelStations] = useState<Place[]>([])
  const [dumpPoints, setDumpPoints] = useState<Place[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | null>(null)

  // Australia approx center and zoom
  const center: [number, number] = useMemo(() => [-25.2744, 133.7751], [])

  // Create green icon for paid campsites (will add $$ via CSS)
  const greenIcon = useMemo(() => new L.Icon({
    iconRetinaUrl: marker2x,
    iconUrl: marker1x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'green-marker'
  }), [])

  // Create purple icon for free campsites
  const purpleIcon = useMemo(() => new L.Icon({
    iconRetinaUrl: marker2x,
    iconUrl: marker1x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'purple-marker'
  }), [])

  // Create orange icon for fuel stations
  const orangeIcon = useMemo(() => new L.Icon({
    iconRetinaUrl: marker2x,
    iconUrl: marker1x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'orange-marker'
  }), [])

  // Create blue icon for dump points
  const blueIcon = useMemo(() => new L.Icon({
    iconRetinaUrl: marker2x,
    iconUrl: marker1x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'blue-marker'
  }), [])

  const fetchPlaces = async (bbox: BBox, smallTownsFilter: boolean = false) => {
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
      // Show all cities and towns
      qParts.push(`node["place"="city"]${bboxStr};`)
      qParts.push(`node["place"="town"]${bboxStr};`)
      // If small towns filter active, also fetch villages/hamlets
      if (smallTownsFilter) {
        qParts.push(`node["place"~"village|hamlet"]${bboxStr};`)
      }
    } else if (bbox.zoom < 10) {
      // Show cities, towns, and villages
      qParts.push(`node["place"~"city|town|village"]${bboxStr};`)
      // If small towns filter active, also fetch hamlets
      if (smallTownsFilter) {
        qParts.push(`node["place"="hamlet"]${bboxStr};`)
      }
    } else if (bbox.zoom < 12) {
      // Show all towns and villages
      qParts.push(`node["place"~"city|town|village"]${bboxStr};`)
      // If small towns filter active, also fetch hamlets
      if (smallTownsFilter) {
        qParts.push(`node["place"="hamlet"]${bboxStr};`)
      }
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

    console.log('Fetching places with query:', query)

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
        
        // Parse population if available
        const population = tags.population ? parseInt(tags.population, 10) : undefined
        
        pts.push({ id: `${el.type}/${el.id}`, name, type, lat, lon, population })
      }
      console.log(`Fetched ${pts.length} places:`, pts.slice(0, 10))
      setPlaces(pts)
    } catch (e) {
      if ((e as any).name === 'AbortError') return
      console.error(e)
    }
  }

  const fetchCampsites = async (bbox: BBox) => {
    // Only fetch campsites at closer zoom levels
    if (bbox.zoom < 8) {
      setCampsites([])
      setPaidCampsites([])
      return
    }
    
    const bboxStr = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`
    // Query for both free and paid campsites
    const query = `[out:json][timeout:25];
      (
        node["tourism"="camp_site"]${bboxStr};
        node["tourism"="caravan_site"]${bboxStr};
      );
      out body;`
    
    const controller = new AbortController()
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = controller
    
    try {
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
      ]
      let data: { elements: any[] } | null = null
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            body: query,
            headers: { 'Content-Type': 'text/plain' },
            signal: controller.signal,
          })
          if (!res.ok) throw new Error(`Overpass error: ${res.status}`)
          data = await res.json() as { elements: any[] }
          break
        } catch (err) {
          if ((err as any).name === 'AbortError') return
          continue
        }
      }
      
      if (!data) return
      
      const freeSites: Place[] = []
      const paidSites: Place[] = []
      
      for (const el of data.elements) {
        if (el.type !== 'node') continue
        const { lat, lon, tags } = el
        if (!lat || !lon || !tags) continue
        const name = tags.name || tags['alt_name'] || 'Campsite'
        const isFree = tags.fee === 'no'
        
        // Store as "node/123456" format for OSM URLs
        const site = { id: `node/${el.id}`, name, type: 'attraction' as const, lat, lon }
        
        if (isFree) {
          freeSites.push(site)
        } else {
          paidSites.push(site)
        }
      }
      
      setCampsites(freeSites)
      setPaidCampsites(paidSites)
    } catch (e) {
      if ((e as any).name === 'AbortError') return
      console.error('Campsite fetch error:', e)
    }
  }

  // Fetch fuel stations near itinerary stops
  useEffect(() => {
    if (!showFuelStations || !itinerary || itinerary.length === 0) {
      setFuelStations([])
      return
    }

    const fetchFuelStations = async () => {
      const radius = 10000 // 10km radius around each stop
      const allStations: Place[] = []
      const seenIds = new Set<string>()

      for (const stop of itinerary) {
        const query = `[out:json][timeout:25];
          (
            node["amenity"="fuel"](around:${radius},${stop.lat},${stop.lon});
          );
          out body;`

        try {
          const endpoints = [
            'https://overpass-api.de/api/interpreter',
            'https://lz4.overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter'
          ]

          let data: { elements: any[] } | null = null
          for (const url of endpoints) {
            try {
              const res = await fetch(url, {
                method: 'POST',
                body: query,
                headers: { 'Content-Type': 'text/plain' },
              })
              if (!res.ok) continue
              data = await res.json() as { elements: any[] }
              break
            } catch (err) {
              continue
            }
          }

          if (!data) continue

          for (const el of data.elements) {
            if (el.type !== 'node') continue
            const { lat, lon, tags, id } = el
            if (!lat || !lon) continue
            const stationId = `fuel/${id}`
            if (seenIds.has(stationId)) continue
            seenIds.add(stationId)

            const name = tags?.name || tags?.brand || 'Fuel Station'
            allStations.push({ id: stationId, name, type: 'attraction' as const, lat, lon })
          }
        } catch (e) {
          console.error('Fuel station fetch error:', e)
        }
      }

      setFuelStations(allStations)
    }

    fetchFuelStations()
  }, [showFuelStations, itinerary])

  // Fetch RV dump points near itinerary stops
  useEffect(() => {
    if (!showDumpPoints || !itinerary || itinerary.length === 0) {
      setDumpPoints([])
      return
    }

    const fetchDumpPoints = async () => {
      const radius = 10000 // 10km radius around each stop
      const allDumps: Place[] = []
      const seenIds = new Set<string>()

      for (const stop of itinerary) {
        const query = `[out:json][timeout:25];
          (
            node["amenity"="sanitary_dump_station"](around:${radius},${stop.lat},${stop.lon});
          );
          out body;`

        try {
          const endpoints = [
            'https://overpass-api.de/api/interpreter',
            'https://lz4.overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter'
          ]

          let data: { elements: any[] } | null = null
          for (const url of endpoints) {
            try {
              const res = await fetch(url, {
                method: 'POST',
                body: query,
                headers: { 'Content-Type': 'text/plain' },
              })
              if (!res.ok) continue
              data = await res.json() as { elements: any[] }
              break
            } catch (err) {
              continue
            }
          }

          if (!data) continue

          for (const el of data.elements) {
            if (el.type !== 'node') continue
            const { lat, lon, tags, id } = el
            if (!lat || !lon) continue
            const dumpId = `dump/${id}`
            if (seenIds.has(dumpId)) continue
            seenIds.add(dumpId)

            const name = tags?.name || 'RV Dump Point'
            allDumps.push({ id: dumpId, name, type: 'attraction' as const, lat, lon })
          }
        } catch (e) {
          console.error('Dump point fetch error:', e)
        }
      }

      setDumpPoints(allDumps)
    }

    fetchDumpPoints()
  }, [showDumpPoints, itinerary])

  const onBBox = (bbox: BBox) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      fetchPlaces(bbox, showSmallTownsOnly)
      fetchCampsites(bbox)
    }, 1000)
  }

  // Filter places based on small towns toggle
  const filteredPlaces = useMemo(() => {
    if (!showSmallTownsOnly) return places
    
    return places.filter(p => {
      // Keep attractions regardless of population
      if (p.type === 'attraction') return true
      
      // If population data exists, use it
      if (p.population !== undefined && !isNaN(p.population)) {
        return p.population <= 10000
      }
      
      // If no population data, use type-based filtering
      // Include: villages, hamlets, localities (typically small)
      // Include: towns (many small towns don't have population data)
      // Exclude: cities (typically large)
      if (p.type === 'village' || p.type === 'hamlet' || p.type === 'locality' || p.type === 'town') {
        return true
      }
      
      return false
    })
  }, [places, showSmallTownsOnly])

  return (
    <MapContainer center={center} zoom={4} minZoom={3} maxZoom={15} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BBoxWatcher onChange={onBBox} />
  <StartSelector selectingStart={selectingStart} onStartSelected={onStartSelected} />
    <CenterOnStart startLocation={startLocation} />
      {!showFuelStations && !showDumpPoints && (
        <MarkerClusterGroup chunkedLoading>
          {filteredPlaces.map(p => (
            <Marker key={p.id} position={[p.lat, p.lon]}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: '#475569', marginBottom: 8 }}>{p.type} · {p.lat.toFixed(3)}, {p.lon.toFixed(3)}</div>
                  <div style={{ marginBottom: 8 }}>
                    <a 
                      href={`https://www.meteoblue.com/en/weather/forecast/week/${p.lat.toFixed(4)}N${p.lon.toFixed(4)}E`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#2563eb' }}
                    >
                      Weather forecast →
                    </a>
                  </div>
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
      )}
      {!showFuelStations && !showDumpPoints && showCampsites && (
        <MarkerClusterGroup chunkedLoading>
        {campsites.map(c => (
          <Marker key={c.id} position={[c.lat, c.lon]} icon={purpleIcon}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>🏕️ {c.name}</div>
                <div style={{ color: '#475569', marginBottom: 8 }}>
                  Free campsite · {c.lat.toFixed(3)}, {c.lon.toFixed(3)}
                </div>
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + ' campsite')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2563eb' }}
                  >
                    View on Google Maps →
                  </a>
                  <a 
                    href={`https://www.meteoblue.com/en/weather/forecast/week/${c.lat.toFixed(4)}N${c.lon.toFixed(4)}E`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2563eb' }}
                  >
                    Weather forecast →
                  </a>
                </div>
                <button
                  className="button"
                  onClick={() => onAddPlace(c)}
                  disabled={selectedIds.has(c.id)}
                >
                  {selectedIds.has(c.id) ? 'Added' : 'Add to itinerary'}
                </button>
                {onStartSelected && (
                  <button className="button" style={{ marginLeft: 8 }} onClick={() => onStartSelected(c.lat, c.lon, c.name)}>Set as start</button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      )}
      {!showFuelStations && !showDumpPoints && showCampsites && (
      <MarkerClusterGroup chunkedLoading>
        {paidCampsites.map(c => (
          <Marker key={c.id} position={[c.lat, c.lon]} icon={greenIcon}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>🏕️💰 {c.name}</div>
                <div style={{ color: '#475569', marginBottom: 8 }}>
                  Paid campsite · {c.lat.toFixed(3)}, {c.lon.toFixed(3)}
                </div>
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + ' campsite')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2563eb' }}
                  >
                    View on Google Maps →
                  </a>
                  <a 
                    href={`https://www.meteoblue.com/en/weather/forecast/week/${c.lat.toFixed(4)}N${c.lon.toFixed(4)}E`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2563eb' }}
                  >
                    Weather forecast →
                  </a>
                </div>
                <button
                  className="button"
                  onClick={() => onAddPlace(c)}
                  disabled={selectedIds.has(c.id)}
                >
                  {selectedIds.has(c.id) ? 'Added' : 'Add to itinerary'}
                </button>
                {onStartSelected && (
                  <button className="button" style={{ marginLeft: 8 }} onClick={() => onStartSelected(c.lat, c.lon, c.name)}>Set as start</button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      )}
      {showFuelStations && (
        <MarkerClusterGroup chunkedLoading>
          {fuelStations.map(f => (
            <Marker key={f.id} position={[f.lat, f.lon]} icon={orangeIcon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 600 }}>⛽ {f.name}</div>
                  <div style={{ color: '#475569', marginBottom: 8 }}>
                    Fuel station · {f.lat.toFixed(3)}, {f.lon.toFixed(3)}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name + ' fuel station')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#2563eb' }}
                    >
                      View on Google Maps →
                    </a>
                  </div>
                  <button
                    className="button"
                    onClick={() => onAddPlace(f)}
                    disabled={selectedIds.has(f.id)}
                  >
                    {selectedIds.has(f.id) ? 'Added' : 'Add to itinerary'}
                  </button>
                  {onStartSelected && (
                    <button className="button" style={{ marginLeft: 8 }} onClick={() => onStartSelected(f.lat, f.lon, f.name)}>Set as start</button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}
      {showDumpPoints && (
        <MarkerClusterGroup chunkedLoading>
          {dumpPoints.map(d => (
            <Marker key={d.id} position={[d.lat, d.lon]} icon={blueIcon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 600 }}>🚽 {d.name}</div>
                  <div style={{ color: '#475569', marginBottom: 8 }}>
                    RV Dump Point · {d.lat.toFixed(3)}, {d.lon.toFixed(3)}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.name + ' dump station')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#2563eb' }}
                    >
                      View on Google Maps →
                    </a>
                  </div>
                  <button
                    className="button"
                    onClick={() => onAddPlace(d)}
                    disabled={selectedIds.has(d.id)}
                  >
                    {selectedIds.has(d.id) ? 'Added' : 'Add to itinerary'}
                  </button>
                  {onStartSelected && (
                    <button className="button" style={{ marginLeft: 8 }} onClick={() => onStartSelected(d.lat, d.lon, d.name)}>Set as start</button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}
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
