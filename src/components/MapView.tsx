import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
  visited?: boolean
  visitedAt?: number
  attachments?: Attachment[]
}

export type Attachment = {
  id: string
  name: string
  url: string
  storagePath: string
  type: string // MIME type
  size: number
  uploadedAt: number
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
  showWaterPoints?: boolean
  showSmallTownsOnly?: boolean
  showCampsites?: boolean
  showHikes?: boolean
  show4WDTracks?: boolean
  favorites?: Place[]
  toggleFavorite?: (place: Place) => void
  toggleVisited?: (id: string, place?: Place) => Promise<void>
  itinerary?: { id: string; name: string; lat: number; lon: number }[]
  onMapReady?: (mapInstance: any) => void
  visitedPlaces?: Place[]
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

// Generate Wikipedia search URL for a place
function getWikipediaUrl(placeName: string): string {
  const searchQuery = encodeURIComponent(placeName)
  return `https://en.wikipedia.org/wiki/Special:Search?search=${searchQuery}`
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

function MapReady({ onMapReady }: { onMapReady?: (mapInstance: any) => void }) {
  const map = useMap()
  React.useEffect(() => {
    if (onMapReady) {
      onMapReady(map)
    }
  }, [map, onMapReady])
  return null
}

export default function MapView({ onAddPlace, selectedIds, route, startLocation, selectingStart, onStartSelected, showFuelStations, showDumpPoints, showWaterPoints, showSmallTownsOnly, showCampsites, showHikes, show4WDTracks, favorites = [], toggleFavorite, toggleVisited, itinerary = [], onMapReady, visitedPlaces = [] }: PropsFull) {
  const [places, setPlaces] = useState<Place[]>([])
  const [campsites, setCampsites] = useState<Place[]>([])
  const [paidCampsites, setPaidCampsites] = useState<Place[]>([])
  const [hikes, setHikes] = useState<Place[]>([])
  const [fourWDTracks, setFourWDTracks] = useState<Place[]>([])
  const [fuelStations, setFuelStations] = useState<Place[]>([])
  const [dumpPoints, setDumpPoints] = useState<Place[]>([])
  const [waterPoints, setWaterPoints] = useState<Place[]>([])
  const [currentZoom, setCurrentZoom] = useState<number>(5)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | null>(null)
  const currentBBoxRef = useRef<BBox | null>(null)

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

  // Create brown icon for hiking trails
  const brownIcon = useMemo(() => L.divIcon({
    className: 'custom-brown-marker',
    html: `<div style="
      background: linear-gradient(135deg, #8b4513 0%, #654321 100%);
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    "><span style="transform: rotate(45deg); font-size: 16px;">🥾</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }), [])

  // Create yellow/gold icon for 4WD tracks
  const yellowIcon = useMemo(() => L.divIcon({
    className: 'custom-yellow-marker',
    html: `<div style="
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    "><span style="transform: rotate(45deg); font-size: 16px;">🚙</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }), [])

  // Create cyan icon for water points
  const cyanIcon = useMemo(() => new L.Icon({
    iconRetinaUrl: marker2x,
    iconUrl: marker1x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'cyan-marker'
  }), [])

  // Create blue icon for start location
  const startIcon = useMemo(() => new L.Icon({
    iconRetinaUrl: marker2x,
    iconUrl: marker1x,
    shadowUrl: markerShadow,
    iconSize: [30, 49],
    iconAnchor: [15, 49],
    popupAnchor: [1, -40],
    shadowSize: [41, 41],
    className: 'start-marker'
  }), [])

  const fetchPlaces = async (bbox: BBox, smallTownsFilter: boolean = false) => {
    // Build bbox string for query
    const bboxStr = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`
    const qParts: string[] = []

    // Progressive loading based on zoom level - but always show cities and towns
    if (bbox.zoom < 4) {
      // Show nothing at very far zoom (entire continent view)
      return
    } else if (bbox.zoom < 6) {
      // At far zoom, show only major cities with known large populations
      qParts.push(`node["place"="city"]["population"~"[0-9]{6,}"]${bboxStr};`)
    } else if (bbox.zoom < 8) {
      // Show all cities and larger towns
      qParts.push(`node["place"="city"]${bboxStr};`)
      qParts.push(`node["place"="town"]${bboxStr};`)
      if (smallTownsFilter) {
        qParts.push(`node["place"~"village|hamlet"]${bboxStr};`)
      }
    } else {
      // Zoom 8+: Show cities, towns, villages, and more
      qParts.push(`node["place"~"city|town|village"]${bboxStr};`)
      if (smallTownsFilter) {
        qParts.push(`node["place"~"hamlet|locality"]${bboxStr};`)
      }
      // At zoom 12+, also show attractions
      if (bbox.zoom >= 12) {
        qParts.push(`node["tourism"="attraction"]${bboxStr};`)
        qParts.push(`way["tourism"="attraction"]${bboxStr};`)
        qParts.push(`relation["tourism"="attraction"]${bboxStr};`)
      }
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

  const fetchHikes = async (bbox: BBox) => {
    // Only fetch hikes at closer zoom levels
    if (bbox.zoom < 7) {
      setHikes([])
      return
    }
    
    const bboxStr = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`
    // Query for hiking trails, walking tracks, and trailheads
    const query = `[out:json][timeout:25];
      (
        node["tourism"="information"]["information"="guidepost"]${bboxStr};
        node["information"="trail_blaze_marker"]${bboxStr};
        way["highway"="path"]["foot"="yes"]${bboxStr};
        way["highway"="footway"]["foot"="yes"]${bboxStr};
        way["highway"="track"]["foot"="yes"]${bboxStr};
        relation["route"="hiking"]${bboxStr};
        relation["route"="foot"]${bboxStr};
      );
      out center body;`
    
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
      
      const trails: Place[] = []
      const seen = new Set<string>()
      
      for (const el of data.elements) {
        let lat, lon
        const tags = el.tags || {}
        
        // Get coordinates based on element type
        if (el.type === 'node') {
          lat = el.lat
          lon = el.lon
        } else if (el.center) {
          lat = el.center.lat
          lon = el.center.lon
        } else {
          continue
        }
        
        if (!lat || !lon) continue
        
        // Generate a unique ID
        const id = `${el.type}/${el.id}`
        if (seen.has(id)) continue
        seen.add(id)
        
        // Get name from various tag options
        const name = tags.name || 
                     tags.ref ||
                     tags['tourism:information'] ||
                     tags.description ||
                     (tags.highway === 'path' || tags.highway === 'footway' || tags.highway === 'track' ? 'Walking Track' : '') ||
                     (tags.route === 'hiking' ? 'Hiking Route' : '') ||
                     'Trail'
        
        trails.push({ 
          id, 
          name, 
          type: 'attraction' as const, 
          lat, 
          lon 
        })
      }
      
      // Limit to 100 trails to avoid cluttering the map
      setHikes(trails.slice(0, 100))
      console.log('Hikes fetched:', trails.length, 'trails found, zoom:', bbox.zoom)
    } catch (e) {
      if ((e as any).name === 'AbortError') return
      console.error('Hikes fetch error:', e)
    }
  }

  const fetch4WDTracks = async (bbox: BBox) => {
    // Only fetch 4WD tracks at closer zoom levels
    if (bbox.zoom < 7) {
      setFourWDTracks([])
      return
    }
    
    const bboxStr = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`
    // Query for 4WD tracks, off-road trails, and 4WD parks
    const query = `[out:json][timeout:25];
      (
        way["highway"="track"]["4wd_only"="yes"]${bboxStr};
        way["highway"="track"]["tracktype"="grade4"]${bboxStr};
        way["highway"="track"]["tracktype"="grade5"]${bboxStr};
        way["highway"="track"]["surface"="unpaved"]["motor_vehicle"="yes"]${bboxStr};
        node["tourism"="attraction"]["attraction"="4wd"]${bboxStr};
        node["sport"="4wd"]${bboxStr};
        way["sport"="4wd"]${bboxStr};
      );
      out center body;`
    
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
      
      const tracks: Place[] = []
      const seen = new Set<string>()
      
      for (const el of data.elements) {
        let lat, lon
        const tags = el.tags || {}
        
        // Get coordinates based on element type
        if (el.type === 'node') {
          lat = el.lat
          lon = el.lon
        } else if (el.center) {
          lat = el.center.lat
          lon = el.center.lon
        } else {
          continue
        }
        
        if (!lat || !lon) continue
        
        // Generate a unique ID
        const idStr = `4wd_${el.id}`
        if (seen.has(idStr)) continue
        seen.add(idStr)
        
        // Determine name based on tags
        const name = tags.name || tags.ref || '4WD Track'
        
        tracks.push({
          id: idStr,
          name,
          type: 'attraction',
          lat,
          lon
        })
      }
      
      // Limit to 100 tracks to avoid cluttering the map
      setFourWDTracks(tracks.slice(0, 100))
      console.log('4WD tracks fetched:', tracks.length, 'tracks found, zoom:', bbox.zoom)
    } catch (e) {
      if ((e as any).name === 'AbortError') return
      console.error('4WD tracks fetch error:', e)
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

  // Fetch water points when enabled
  useEffect(() => {
    if (!showWaterPoints || !itinerary?.length) {
      setWaterPoints([])
      return
    }

    const fetchWaterPoints = async () => {
      const radius = 10000 // 10km radius around each stop
      const allWater: Place[] = []
      const seenIds = new Set<string>()

      for (const stop of itinerary) {
        const query = `[out:json][timeout:25];
          (
            node["amenity"="drinking_water"](around:${radius},${stop.lat},${stop.lon});
            node["amenity"="water_point"](around:${radius},${stop.lat},${stop.lon});
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
            const waterId = `water/${id}`
            if (seenIds.has(waterId)) continue
            seenIds.add(waterId)

            const name = tags?.name || 'Water Point'
            allWater.push({ id: waterId, name, type: 'attraction' as const, lat, lon })
          }
        } catch (e) {
          console.error('Water point fetch error:', e)
        }
      }

      setWaterPoints(allWater)
    }

    fetchWaterPoints()
  }, [showWaterPoints, itinerary])

  // Clear hikes when disabled
  useEffect(() => {
    if (!showHikes) {
      setHikes([])
    }
  }, [showHikes])

  const onBBox = useCallback((bbox: BBox) => {
    setCurrentZoom(bbox.zoom)
    currentBBoxRef.current = bbox
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      fetchPlaces(bbox, showSmallTownsOnly)
      fetchCampsites(bbox)
      if (showHikes) {
        console.log('Calling fetchHikes, showHikes is:', showHikes, 'zoom:', bbox.zoom)
        fetchHikes(bbox)
      } else {
        console.log('NOT calling fetchHikes, showHikes is:', showHikes)
      }
      if (show4WDTracks) {
        console.log('Calling fetch4WDTracks, show4WDTracks is:', show4WDTracks, 'zoom:', bbox.zoom)
        fetch4WDTracks(bbox)
      }
    }, 1000)
  }, [showSmallTownsOnly, showHikes, show4WDTracks])

  // Trigger fetchHikes when showHikes changes
  useEffect(() => {
    if (showHikes && currentBBoxRef.current) {
      console.log('useEffect triggering fetchHikes, zoom:', currentBBoxRef.current.zoom)
      fetchHikes(currentBBoxRef.current)
    } else if (!showHikes) {
      setHikes([])
    }
  }, [showHikes])

  // Trigger fetch4WDTracks when show4WDTracks changes
  useEffect(() => {
    if (show4WDTracks && currentBBoxRef.current) {
      console.log('useEffect triggering fetch4WDTracks, zoom:', currentBBoxRef.current.zoom)
      fetch4WDTracks(currentBBoxRef.current)
    } else if (!show4WDTracks) {
      setFourWDTracks([])
    }
  }, [show4WDTracks])

  // Filter places based on small towns toggle
  const filteredPlaces = useMemo(() => {
    if (!showSmallTownsOnly) return places
    
    return places.filter(p => {
      // Keep attractions regardless of population
      if (p.type === 'attraction') return true
      
      // If population data exists, use it (between 500 and 10,000)
      if (p.population !== undefined && !isNaN(p.population)) {
        return p.population >= 500 && p.population <= 10000
      }
      
      // If no population data, still include villages and hamlets
      // (these are typically small), but exclude cities and towns
      // (which might be large but lack population data)
      if (p.type === 'village' || p.type === 'hamlet' || p.type === 'locality') {
        return true
      }
      
      return false
    })
  }, [places, showSmallTownsOnly])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer center={center} zoom={4} minZoom={3} maxZoom={15} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BBoxWatcher onChange={onBBox} />
  <StartSelector selectingStart={selectingStart} onStartSelected={onStartSelected} />
    <CenterOnStart startLocation={startLocation} />
      <MapReady onMapReady={onMapReady} />
      {!showFuelStations && !showDumpPoints && !showWaterPoints && !showHikes && !show4WDTracks && (
        <MarkerClusterGroup chunkedLoading>
          {filteredPlaces.map(p => (
            <Marker key={p.id} position={[p.lat, p.lon]}>
              <Popup>
                <div style={{ width: 160 }}>
                  {(() => {
                    const isVisited = visitedPlaces.some(vp => vp.id === p.id)
                    return (
                      <div style={{ fontWeight: 600, textDecoration: isVisited ? 'line-through' : 'none', opacity: isVisited ? 0.6 : 1 }}>
                        {isVisited ? '\u2713 ' : ''}{p.name}
                      </div>
                    )
                  })()}
                  <div style={{ color: '#475569', marginBottom: 8, fontSize: 11 }}>{p.type} \u00b7 {p.lat.toFixed(3)}, {p.lon.toFixed(3)}</div>
                  <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <a 
                      href={getWikipediaUrl(p.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#2563eb' }}
                    >
                      📖 Wikipedia →
                    </a>
                    <a 
                      href={`https://www.meteoblue.com/en/weather/forecast/week/${p.lat.toFixed(4)}N${p.lon.toFixed(4)}E`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#2563eb' }}
                    >
                      🌤️ Weather forecast →
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', fontSize: 11 }}>
                    <button
                      className="button"
                      onClick={() => onAddPlace(p)}
                      disabled={selectedIds.has(p.id)}
                      style={{ padding: '2px 6px', fontSize: 10 }}
                    >
                      {selectedIds.has(p.id) ? 'Added' : 'Add'}
                    </button>
                    {toggleFavorite && (() => {
                      const isFavorite = favorites.some(f => f.id === p.id)
                      return (
                        <button
                          className="button"
                          onClick={async () => {
                            try {
                              await toggleFavorite(p)
                            } catch (error) {
                              console.error('Error toggling favorite:', error)
                            }
                          }}
                          style={{ background: isFavorite ? '#ec4899' : undefined }}
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {isFavorite ? '❤️' : '🤍'}
                        </button>
                      )
                    })()}
                    {toggleVisited && (() => {
                      const isVisited = visitedPlaces.some(vp => vp.id === p.id)
                      return (
                        <button
                          className="button"
                          onClick={async () => {
                            try {
                              await toggleVisited(p.id, p)
                            } catch (error) {
                              console.error('Error toggling visited:', error)
                            }
                          }}
                          style={{ background: isVisited ? '#10b981' : '#6b7280' }}
                          title={isVisited ? 'Mark as unvisited' : 'Mark as visited'}
                        >
                          {isVisited ? '✓' : '○'}
                        </button>
                      )
                    })()}
                    {onStartSelected && !startLocation && (
                      <button className="button" onClick={() => onStartSelected(p.lat, p.lon, p.name)} style={{ padding: '2px 6px', fontSize: 10 }}>Start</button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}
      {!showFuelStations && !showDumpPoints && !showWaterPoints && showCampsites && !showHikes && !show4WDTracks && (
        <MarkerClusterGroup chunkedLoading>
        {campsites.map(c => (
          <Marker key={c.id} position={[c.lat, c.lon]} icon={purpleIcon}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                {(() => {
                  const isVisited = visitedPlaces.some(vp => vp.id === c.id)
                  return (
                    <div style={{ fontWeight: 600, textDecoration: isVisited ? 'line-through' : 'none', opacity: isVisited ? 0.6 : 1 }}>
                      {isVisited ? '\u2713 ' : ''}\ud83c\udfd5\ufe0f {c.name}
                    </div>
                  )
                })()}
                <div style={{ color: '#475569', marginBottom: 8 }}>
                  Free campsite \u00b7 {c.lat.toFixed(3)}, {c.lon.toFixed(3)}
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="button"
                    onClick={() => onAddPlace(c)}
                    disabled={selectedIds.has(c.id)}
                  >
                    {selectedIds.has(c.id) ? 'Added' : 'Add to itinerary'}
                  </button>
                  {toggleFavorite && (() => {
                    const isFavorite = favorites.some(f => f.id === c.id)
                    return (
                      <button
                        className="button"
                        onClick={async () => { try { await toggleFavorite(c) } catch (error) { console.error("Error toggling favorite:", error) } }}
                        style={{ background: isFavorite ? '#ec4899' : undefined }}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite ? '❤️' : '🤍'}
                      </button>
                    )
                  })()}
                  {toggleVisited && (() => {
                    const isVisited = visitedPlaces.some(vp => vp.id === c.id)
                    return (
                      <button
                        className="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            await toggleVisited(c.id, c)
                          } catch (error) {
                            console.error('Error toggling visited:', error)
                          }
                        }}
                        style={{ background: isVisited ? '#10b981' : '#6b7280' }}
                        title={isVisited ? 'Mark as unvisited' : 'Mark as visited'}
                      >
                        {isVisited ? '✓' : '○'}
                      </button>
                    )
                  })()}
                  {onStartSelected && !startLocation && (
                    <button className="button" onClick={() => onStartSelected(c.lat, c.lon, c.name)}>Set as start</button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      )}
      {!showFuelStations && !showDumpPoints && !showWaterPoints && showCampsites && !showHikes && !show4WDTracks && (
      <MarkerClusterGroup chunkedLoading>
        {paidCampsites.map(c => (
          <Marker key={c.id} position={[c.lat, c.lon]} icon={greenIcon}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                {(() => {
                  const isVisited = visitedPlaces.some(vp => vp.id === c.id)
                  return (
                    <div style={{ fontWeight: 600, textDecoration: isVisited ? 'line-through' : 'none', opacity: isVisited ? 0.6 : 1 }}>
                      {isVisited ? '\u2713 ' : ''}\ud83c\udfd5\ufe0f\ud83d\udcb0 {c.name}
                    </div>
                  )
                })()}
                <div style={{ color: '#475569', marginBottom: 8 }}>
                  Paid campsite \u00b7 {c.lat.toFixed(3)}, {c.lon.toFixed(3)}
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="button"
                    onClick={() => onAddPlace(c)}
                    disabled={selectedIds.has(c.id)}
                  >
                    {selectedIds.has(c.id) ? 'Added' : 'Add to itinerary'}
                  </button>
                  {toggleFavorite && (() => {
                    const isFavorite = favorites.some(f => f.id === c.id)
                    return (
                      <button
                        className="button"
                        onClick={async () => { try { await toggleFavorite(c) } catch (error) { console.error("Error toggling favorite:", error) } }}
                        style={{ background: isFavorite ? '#ec4899' : undefined }}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite ? '❤️' : '🤍'}
                      </button>
                    )
                  })()}
                  {toggleVisited && (() => {
                    const isVisited = visitedPlaces.some(vp => vp.id === c.id)
                    return (
                      <button
                        className="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            await toggleVisited(c.id, c)
                          } catch (error) {
                            console.error('Error toggling visited:', error)
                          }
                        }}
                        style={{ background: isVisited ? '#10b981' : '#6b7280' }}
                        title={isVisited ? 'Mark as unvisited' : 'Mark as visited'}
                      >
                        {isVisited ? '✓' : '○'}
                      </button>
                    )
                  })()}
                  {onStartSelected && !startLocation && (
                    <button className="button" onClick={() => onStartSelected(c.lat, c.lon, c.name)}>Set as start</button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      )}
      {showHikes && (
      <MarkerClusterGroup chunkedLoading>
        {console.log('Rendering hikes:', hikes.length, 'showHikes:', showHikes)}
        {hikes.map(h => (
          <Marker key={h.id} position={[h.lat, h.lon]} icon={brownIcon}>
            <Popup>
              <div style={{ width: 200 }}>
                {(() => {
                  const isVisited = visitedPlaces.some(vp => vp.id === h.id)
                  return (
                    <div style={{ fontWeight: 600, textDecoration: isVisited ? 'line-through' : 'none', opacity: isVisited ? 0.6 : 1 }}>
                      {isVisited ? '✓ ' : ''}🥾 {h.name}
                    </div>
                  )
                })()}
                <div style={{ color: '#475569', marginBottom: 8 }}>
                  Hiking trail · {h.lat.toFixed(3)}, {h.lon.toFixed(3)}
                </div>
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2563eb' }}
                  >
                    View on Google Maps →
                  </a>
                  <a 
                    href={`https://www.meteoblue.com/en/weather/forecast/week/${h.lat.toFixed(4)}N${h.lon.toFixed(4)}E`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2563eb' }}
                  >
                    Weather forecast →
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%' }}>
                  <button
                    className="button"
                    onClick={() => onAddPlace(h)}
                    disabled={selectedIds.has(h.id)}
                  >
                    {selectedIds.has(h.id) ? 'Added' : 'Add to itinerary'}
                  </button>
                  {toggleFavorite && (() => {
                    const isFavorite = favorites.some(f => f.id === h.id)
                    return (
                      <button
                        className="button"
                        onClick={async () => { try { await toggleFavorite(h) } catch (error) { console.error("Error toggling favorite:", error) } }}
                        style={{ background: isFavorite ? '#ec4899' : undefined }}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite ? '❤️' : '🤍'}
                      </button>
                    )
                  })()}
                  {toggleVisited && (() => {
                    const isVisited = visitedPlaces.some(vp => vp.id === h.id)
                    return (
                      <button
                        className="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            await toggleVisited(h.id, h)
                          } catch (error) {
                            console.error('Error toggling visited:', error)
                          }
                        }}
                        style={{ background: isVisited ? '#10b981' : '#6b7280' }}
                        title={isVisited ? 'Mark as unvisited' : 'Mark as visited'}
                      >
                        {isVisited ? '✓' : '○'}
                      </button>
                    )
                  })()}
                  {onStartSelected && !startLocation && (
                    <button className="button" onClick={() => onStartSelected(h.lat, h.lon, h.name)}>Set as start</button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      )}
      {show4WDTracks && (
      <MarkerClusterGroup chunkedLoading>
        {console.log('Rendering 4WD tracks:', fourWDTracks.length, 'show4WDTracks:', show4WDTracks)}
        {fourWDTracks.map(t => (
          <Marker key={t.id} position={[t.lat, t.lon]} icon={yellowIcon}>
            <Popup>
              <div style={{ width: 200 }}>
                {(() => {
                  const isVisited = visitedPlaces.some(vp => vp.id === t.id)
                  return (
                    <div style={{ fontWeight: 600, textDecoration: isVisited ? 'line-through' : 'none', opacity: isVisited ? 0.6 : 1 }}>
                      {isVisited ? '✓ ' : ''}🚙 {t.name}
                    </div>
                  )
                })()}
                <div style={{ color: '#475569', marginBottom: 8 }}>
                  4WD Track · {t.lat.toFixed(3)}, {t.lon.toFixed(3)}
                </div>
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2563eb' }}
                  >
                    View on Google Maps →
                  </a>
                  <a 
                    href={`https://www.meteoblue.com/en/weather/forecast/week/${t.lat.toFixed(4)}N${t.lon.toFixed(4)}E`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2563eb' }}
                  >
                    Weather forecast →
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%' }}>
                  <button
                    className="button"
                    onClick={() => onAddPlace(t)}
                    disabled={selectedIds.has(t.id)}
                  >
                    {selectedIds.has(t.id) ? 'Added' : 'Add to itinerary'}
                  </button>
                  {toggleFavorite && (() => {
                    const isFavorite = favorites.some(f => f.id === t.id)
                    return (
                      <button
                        className="button"
                        onClick={async () => { try { await toggleFavorite(t) } catch (error) { console.error("Error toggling favorite:", error) } }}
                        style={{ background: isFavorite ? '#ec4899' : undefined }}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite ? '❤️' : '🤍'}
                      </button>
                    )
                  })()}
                  {toggleVisited && (() => {
                    const isVisited = visitedPlaces.some(vp => vp.id === t.id)
                    return (
                      <button
                        className="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            await toggleVisited(t.id, t)
                          } catch (error) {
                            console.error('Error toggling visited:', error)
                          }
                        }}
                        style={{ background: isVisited ? '#10b981' : '#6b7280' }}
                        title={isVisited ? 'Mark as unvisited' : 'Mark as visited'}
                      >
                        {isVisited ? '✓' : '○'}
                      </button>
                    )
                  })()}
                  {onStartSelected && !startLocation && (
                    <button className="button" onClick={() => onStartSelected(t.lat, t.lon, t.name)}>Set as start</button>
                  )}
                </div>
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
                  {onStartSelected && !startLocation && (
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
                  {onStartSelected && !startLocation && (
                    <button className="button" style={{ marginLeft: 8 }} onClick={() => onStartSelected(d.lat, d.lon, d.name)}>Set as start</button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}
      {showWaterPoints && (
        <MarkerClusterGroup chunkedLoading>
          {waterPoints.map(w => (
            <Marker key={w.id} position={[w.lat, w.lon]} icon={cyanIcon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 600 }}>💧 {w.name}</div>
                  <div style={{ color: '#475569', marginBottom: 8 }}>
                    Drinking Water · {w.lat.toFixed(3)}, {w.lon.toFixed(3)}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.name + ' water point')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#2563eb' }}
                    >
                      View on Google Maps →
                    </a>
                  </div>
                  <button
                    className="button"
                    onClick={() => onAddPlace(w)}
                    disabled={selectedIds.has(w.id)}
                  >
                    {selectedIds.has(w.id) ? 'Added' : 'Add to itinerary'}
                  </button>
                  {onStartSelected && !startLocation && (
                    <button className="button" style={{ marginLeft: 8 }} onClick={() => onStartSelected(w.lat, w.lon, w.name)}>Set as start</button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}
      {startLocation && (
        <Marker position={[startLocation.lat, startLocation.lon]} icon={startIcon}>
          <Popup>
            <div style={{ minWidth: 140 }}>
              <div style={{ fontWeight: 600 }}>⭐ {startLocation.name || 'Start'}</div>
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
    <div style={{
      position: 'absolute',
      bottom: '24px',
      right: '24px',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '6px 12px',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      fontSize: '13px',
      fontWeight: 600,
      color: '#0f172a',
      zIndex: 1000,
      border: '2px solid #0ea5e9',
      pointerEvents: 'none'
    }}>
      Zoom: {currentZoom}
    </div>
    </div>
  )
}
