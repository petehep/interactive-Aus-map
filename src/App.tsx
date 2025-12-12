import React, { useCallback, useMemo, useState, useEffect } from 'react'
import MapView, { Place, Attachment } from './components/MapView'
import Itinerary from './components/Itinerary'
import Favorites from './components/Favorites'
import VisitedPlaces from './components/VisitedPlaces'
import Login from './components/Login'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { LatLngTuple } from 'leaflet'
import {
  saveFavorite,
  deleteFavorite,
  subscribeFavorites,
  saveVisitedPlace,
  deleteVisitedPlace,
  subscribeVisitedPlaces,
  saveItinerary,
  subscribeItinerary,
  migrateLocalStorageToFirestore,
  isMigrationComplete
} from './services/firestoreService'
import {
  uploadAttachment,
  deleteAttachment,
  deleteAllAttachments
} from './services/storageService'

export type ItineraryItem = Place & { addedAt: number }

type RouteLeg = { distance: number; duration: number }
type RouteResult = {
  coordinates: [number, number][]
  legs: RouteLeg[]
  orderedPlaceIds: string[]
  waypoints: [number, number][]
} | null

type GeoResult = {
  lat: number
  lon: number
  name: string
  raw: any
}

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([])
  const [route, setRoute] = useState<RouteResult>(null)
  const [startLocation, setStartLocation] = useState<{ lat: number; lon: number; name?: string } | undefined>(undefined)
  const [selectingStart, setSelectingStart] = useState(false)
  const [isRouting, setIsRouting] = useState(false)
  const [startQuery, setStartQuery] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeResults, setGeocodeResults] = useState<GeoResult[] | null>(null)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [showFuelStations, setShowFuelStations] = useState(false)
  const [showDumpPoints, setShowDumpPoints] = useState(false)
  const [showWaterPoints, setShowWaterPoints] = useState(false)
  const [showSmallTownsOnly, setShowSmallTownsOnly] = useState(false)
  const [showCampsites, setShowCampsites] = useState(true)
  const [favorites, setFavorites] = useState<Place[]>([])
  const [visitedPlaces, setVisitedPlaces] = useState<Place[]>([])
  const [showVisitedModal, setShowVisitedModal] = useState(false)
  const [mapRef, setMapRef] = useState<any>(null)

  const onAddPlace = useCallback((p: Place) => {
    setItinerary((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev
      const updated = [...prev, { ...p, addedAt: Date.now() }]
      if (user) {
        saveItinerary(user.uid, updated).catch(console.error)
      }
      return updated
    })
  }, [user])

  const onRemove = useCallback((id: string) => {
    setItinerary((prev) => {
      const updated = prev.filter((x) => x.id !== id)
      if (user) {
        saveItinerary(user.uid, updated).catch(console.error)
      }
      return updated
    })
  }, [user])

  const onSetStart = useCallback((item: ItineraryItem) => {
    setStartLocation({ lat: item.lat, lon: item.lon, name: item.name })
  }, [])

  const toggleFavorite = useCallback(async (place: Place) => {
    if (!user) return
    
    const exists = favorites.some((f) => f.id === place.id)
    if (exists) {
      await deleteFavorite(user.uid, place.id)
    } else {
      await saveFavorite(user.uid, place)
    }
  }, [user, favorites])

  const removeFavorite = useCallback(async (id: string) => {
    if (!user) return
    // Delete all attachments when removing a favorite
    await deleteAllAttachments(user.uid, id)
    await deleteFavorite(user.uid, id)
  }, [user])

  const handleUploadAttachment = useCallback(async (placeId: string, file: File) => {
    if (!user) return

    // Upload file to storage (with no-op progress for now; wire up if needed)
    const attachment = await uploadAttachment(user.uid, placeId, file)

    // Update favorite with new attachment
    let favorite = favorites.find(f => f.id === placeId)
    // If favorite doesn't exist (upload from itinerary), create a minimal favorite to store metadata
    if (!favorite) {
      const itineraryItem = itinerary.find(i => i.id === placeId)
      if (!itineraryItem) return
      favorite = { 
        id: itineraryItem.id,
        name: itineraryItem.name,
        type: itineraryItem.type,
        lat: itineraryItem.lat,
        lon: itineraryItem.lon
      } as Place
    }

    const updatedFavorite = {
      ...favorite,
      attachments: [...(favorite.attachments || []), attachment]
    }

    await saveFavorite(user.uid, updatedFavorite)
  }, [user, favorites])

  const handleDeleteAttachment = useCallback(async (placeId: string, attachment: Attachment) => {
    if (!user) return

    // Delete from storage
    await deleteAttachment(attachment.storagePath)

    // Update favorite to remove attachment
    const favorite = favorites.find(f => f.id === placeId)
    if (!favorite) return

    const updatedFavorite = {
      ...favorite,
      attachments: (favorite.attachments || []).filter(a => a.id !== attachment.id)
    }

    await saveFavorite(user.uid, updatedFavorite)
  }, [user, favorites])

  const toggleVisited = useCallback(async (id: string) => {
    if (!user) return
    
    const favorite = favorites.find(f => f.id === id)
    if (!favorite) return
    
    const isCurrentlyVisited = visitedPlaces.some(p => p.id === id)
    
    if (isCurrentlyVisited) {
      // Unvisit
      await deleteVisitedPlace(user.uid, id)
      // Update favorite - remove visited fields
      const { visited, visitedAt, ...cleanFavorite } = favorite
      await saveFavorite(user.uid, { ...cleanFavorite, visited: false })
    } else {
      // Visit
      const visitedPlace = { ...favorite, visited: true, visitedAt: Date.now() }
      await saveVisitedPlace(user.uid, visitedPlace)
      // Update favorite
      await saveFavorite(user.uid, visitedPlace)
    }
  }, [user, favorites, visitedPlaces])

  // Listen for authentication state changes and set up Firestore subscriptions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
      
      if (currentUser) {
        // Check if we need to migrate localStorage data
        if (!isMigrationComplete()) {
          console.log('Migrating localStorage data to Firestore...')
          await migrateLocalStorageToFirestore(currentUser.uid)
        }
      }
    })
    return () => unsubscribe()
  }, [])

  // Subscribe to Firestore data when user is logged in
  useEffect(() => {
    if (!user) return

    const unsubFavorites = subscribeFavorites(user.uid, (favorites) => {
      setFavorites(favorites)
    })

    const unsubVisited = subscribeVisitedPlaces(user.uid, (visited) => {
      setVisitedPlaces(visited)
    })

    const unsubItinerary = subscribeItinerary(user.uid, (items) => {
      setItinerary(items)
    })

    return () => {
      unsubFavorites()
      unsubVisited()
      unsubItinerary()
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const unvisitPlace = useCallback(async (id: string) => {
    if (!user) return
    
    // Remove from visited places
    await deleteVisitedPlace(user.uid, id)
    
    // Also update in favorites if it exists there
    const favorite = favorites.find(f => f.id === id)
    if (favorite) {
      const { visited, visitedAt, ...cleanFavorite } = favorite
      await saveFavorite(user.uid, { ...cleanFavorite, visited: false })
    }
  }, [user, favorites])

  const centerMap = useCallback((lat: number, lon: number) => {
    if (mapRef) {
      mapRef.setView([lat, lon], 13, { animate: true })
    }
  }, [mapRef])

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const shouldAutoRouteRef = React.useRef(false)

  const updateRoute = useCallback(async () => {
    if (!itinerary.length) return
    if (!startLocation) {
      alert('Please select a start location first (type or pick on the map).')
      return
    }
    setIsRouting(true)
    // Use selected start (default Adelaide)
    const start = startLocation
    // Build coordinates string: start then itinerary points
    const coords = [
      `${start.lon},${start.lat}`,
      ...itinerary.map(i => `${i.lon},${i.lat}`)
    ].join(';')

    const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&overview=full&geometries=geojson`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Routing error: ${res.status}`)
      const data = await res.json()
      if (!data.trips || !data.trips.length) throw new Error('No trip returned')
      const trip = data.trips[0]
      // trip.geometry is GeoJSON LineString with coords [lon, lat]
  const coordinates: [number, number][] = trip.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number])
      const legs: RouteLeg[] = trip.legs.map((l: any) => ({ distance: l.distance, duration: l.duration }))

      // Map OSRM waypoint/trip ordering back to itinerary IDs.
      // data.waypoints is in input order; each waypoint has waypoint_index = position in trip
      const n = data.waypoints.length
      const tripIndexToInputIndex: number[] = new Array(n)
      data.waypoints.forEach((w: any, inputIdx: number) => {
        tripIndexToInputIndex[w.waypoint_index] = inputIdx
      })
      // tripIndexToInputIndex[0] is Adelaide (input index 0); subsequent entries map to itinerary indices +1
      const orderedPlaceIds = tripIndexToInputIndex.slice(1).map((inputIdx: number) => itinerary[inputIdx - 1].id)

      // waypoint coords in trip order (each waypoint.location is [lon, lat])
      const waypoints: [number, number][] = tripIndexToInputIndex.map((inputIdx: number) => {
        const w = data.waypoints[inputIdx]
        return [w.location[1], w.location[0]] as [number, number]
      })

      setRoute({ coordinates, legs, orderedPlaceIds, waypoints })
      
      // Reorder itinerary to match the optimized route
      const reorderedItinerary = orderedPlaceIds.map(id => itinerary.find(item => item.id === id)!).filter(Boolean)
      setItinerary(reorderedItinerary)
    } catch (e) {
      console.error(e)
      alert('Could not compute route. See console for details.')
    } finally {
      setIsRouting(false)
    }
  }, [itinerary, startLocation])

  const clearItinerary = useCallback(() => {
    if (!itinerary.length) return
    // confirm destructive action
    if (!window.confirm('Clear all itinerary stops? This cannot be undone.')) return
    setItinerary([])
    setRoute(null)
    if (user) {
      saveItinerary(user.uid, []).catch(console.error)
    }
  }, [itinerary, user])

  // Auto-compute route after loading itinerary from file
  React.useEffect(() => {
    if (shouldAutoRouteRef.current && itinerary.length > 0 && startLocation) {
      shouldAutoRouteRef.current = false
      updateRoute()
    }
  }, [itinerary, startLocation, updateRoute])

  const exportItinerary = useCallback(async () => {
    const payload = { itinerary, startLocation }
    const jsonString = JSON.stringify(payload, null, 2)
    
    // Try to use File System Access API for save dialog
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `Big Lap .json`,
          types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] }
          }]
        })
        const writable = await handle.createWritable()
        await writable.write(jsonString)
        await writable.close()
        return
      } catch (e) {
        // User cancelled or error - fall through to fallback
        if ((e as Error).name === 'AbortError') return
      }
    }
    
    // Fallback for browsers without File System Access API
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Big Lap .json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [itinerary, startLocation])

  const importItineraryFromFile = useCallback(async (file?: File) => {
    try {
      if (!file) return
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data || !Array.isArray(data.itinerary)) {
        alert('Invalid itinerary file')
        return
      }
      if (!window.confirm('Load itinerary from file? This will replace your current stops.')) return
      // Basic validation and mapping
      const items: ItineraryItem[] = data.itinerary.map((x: any) => ({
        id: x.id,
        name: x.name,
        type: x.type,
        lat: x.lat,
        lon: x.lon,
        addedAt: x.addedAt || Date.now()
      }))
      setItinerary(items)
      if (data.startLocation && data.startLocation.lat && data.startLocation.lon) {
        setStartLocation({ lat: data.startLocation.lat, lon: data.startLocation.lon, name: data.startLocation.name })
      }
      setRoute(null)
      // Set flag to trigger auto-route after state updates
      if (items.length > 0 && data.startLocation) {
        shouldAutoRouteRef.current = true
      }
    } catch (e) {
      console.error('Import error', e)
      alert('Could not import itinerary — invalid file')
    }
  }, [updateRoute])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    importItineraryFromFile(f)
    // reset input
    e.currentTarget.value = ''
  }, [importItineraryFromFile])

  // Export the current route as a GPX track and trigger download
  const exportGPX = useCallback(() => {
    if (!route) return
    const now = new Date().toISOString()
    const header = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="aus-trip-scheduler">\n  <metadata>\n    <time>${now}</time>\n  </metadata>\n  <trk>\n    <name>Planned route</name>\n    <trkseg>\n`
    const pts = route.coordinates.map(([lat, lon]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>\n`).join('')
    const footer = `    </trkseg>\n  </trk>\n</gpx>`
    const gpx = header + pts + footer
    const blob = new Blob([gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `route-${new Date().toISOString().replace(/[:.]/g, '-')}.gpx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [route])

  // Open the route in Google Maps Directions using the waypoints in trip order.
  const openInGoogleMaps = useCallback(() => {
    if (!route) return
    // Google Maps supports a reasonable number of path segments; limit to 25 to be safe
    const maxPoints = 25
    const coords = (route.waypoints || []).slice(0, maxPoints).map(([lat, lon]) => `${lat},${lon}`)
    if (!coords.length) return
    const url = `https://www.google.com/maps/dir/${coords.join('/')}`
    window.open(url, '_blank')
  }, [route])

  const geocodeStart = useCallback(async () => {
    const q = startQuery.trim()
    if (!q) return
    setIsGeocoding(true)
    try {
      const baseUrl = (qq: string) => `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(qq)}&limit=8&countrycodes=au&addressdetails=1`
      const doFetch = async (qq: string) => {
        const res = await fetch(baseUrl(qq), { headers: { 'Accept-Language': 'en' } })
        if (!res.ok) throw new Error(`Geocode ${res.status}`)
        return await res.json()
      }

      const orig = await doFetch(q)

      // If the query already mentions South Australia, no need for separate SA fetch
      let sa: any[] | null = null
      if (!q.toLowerCase().includes('south') && !q.toLowerCase().includes('sa')) {
        try {
          sa = await doFetch(`${q} South Australia`)
        } catch (e) {
          sa = null
        }
      }

      // Merge SA results first (if any), then other original results, dedup by osm_id
      const combined: any[] = []
      const seen = new Set<number>()
      if (sa && sa.length) {
        for (const d of sa) {
          if (!seen.has(d.osm_id)) {
            combined.push(d)
            seen.add(d.osm_id)
          }
        }
      }
      if (orig && orig.length) {
        for (const d of orig) {
          if (!seen.has(d.osm_id)) {
            combined.push(d)
            seen.add(d.osm_id)
          }
        }
      }

      if (!combined.length) {
        alert('No results found for that place')
        return
      }

      setGeocodeResults(combined.map((d: any) => ({ lat: parseFloat(d.lat), lon: parseFloat(d.lon), name: d.display_name, raw: d })))
      // don't clear the query yet — let user pick
    } catch (e) {
      console.error('Geocode error', e)
      alert('Could not find location. Check console for details.')
    } finally {
      setIsGeocoding(false)
    }
  }, [startQuery])

  const pickGeocode = useCallback((r: any) => {
    setStartLocation({ lat: r.lat, lon: r.lon, name: r.name })
    setStartQuery('')
    setGeocodeResults(null)
    setSelectingStart(false)
    
    // Add start location to itinerary
    const startPlace: ItineraryItem = {
      id: `start-${r.lat}-${r.lon}`,
      name: r.name || 'Start location',
      type: 'locality',
      lat: r.lat,
      lon: r.lon,
      addedAt: Date.now()
    }
    setItinerary((prev) => {
      // Don't add if already in itinerary
      if (prev.some((x) => x.id === startPlace.id)) return prev
      return [startPlace, ...prev]
    })
  }, [])

  const clearStart = useCallback(() => {
    setStartLocation(undefined)
    setStartQuery('')
    setGeocodeResults(null)
    setRoute(null)
  }, [])

  const summary = useMemo(() => `${itinerary.length} stop${itinerary.length === 1 ? '' : 's'}`,[itinerary.length])

  // Show dev URL when in dev mode to help local testing
  const devUrl = typeof window !== 'undefined' && (import.meta as any).env?.DEV ? window.location.origin : null

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        color: 'white',
        fontSize: 18
      }}>
        Loading...
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!user) {
    return <Login onLoginSuccess={() => {}} />
  }

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Australia Trip Scheduler
              <span style={{
                fontSize: 12,
                padding: '2px 6px',
                borderRadius: 999,
                background: '#e2e8f0',
                color: '#0f172a',
                border: '1px solid #cbd5e1'
              }} title="Version">
                v4.0
              </span>
            </h1>
            {summary}
            <div style={{ fontSize: 12, color: '#475569' }}>
              Start: {startLocation ? (startLocation.name ?? `${startLocation.lat.toFixed(3)}, ${startLocation.lon.toFixed(3)}`) : 'None'}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              User: {user.email}
            </div>
            {devUrl && (
              <div className="devUrl" style={{ fontSize: 12, color: '#0f172a', marginTop: 6 }}>
                Dev: <a href={devUrl} target="_blank" rel="noreferrer">{devUrl}</a>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a 
              className="button small" 
              href="/interactive-Aus-map/user-manual.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Open the latest User Manual"
            >
              📘 User Manual
            </a>
            <button 
              className="button small"
              title="See what's new in v4.0"
              onClick={() => setShowWhatsNew(true)}
            >
              ✨ What's New
            </button>
          </div>
        </div>

          <div style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="startInput"
              placeholder="Type start place (e.g. Adelaide)"
              value={startQuery}
              onChange={(e) => setStartQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') geocodeStart() }}
              disabled={isGeocoding}
              aria-label="Start place input"
            />
            <button className="button" onClick={geocodeStart} disabled={isGeocoding || !startQuery.trim()}>
              {isGeocoding ? 'Searching…' : 'Set Start'}
            </button>
            {startLocation && (
              <button className="button small" onClick={clearStart} title="Clear start location">
                Clear start
              </button>
            )}
            <button 
              className="button small" 
              onClick={() => setShowSmallTownsOnly(!showSmallTownsOnly)} 
              title="Show only towns with population under 10,000"
              style={{ backgroundColor: showSmallTownsOnly ? '#f59e0b' : undefined }}
            >
              {showSmallTownsOnly ? 'All Towns' : 'Small Towns'}
            </button>
            <button 
              className="button small" 
              onClick={() => setShowCampsites(!showCampsites)} 
              title="Show/hide campsite markers"
              style={{ backgroundColor: showCampsites ? '#10b981' : '#ef4444' }}
            >
              {showCampsites ? 'Hide Camps' : 'Show Camps'}
            </button>
            <div style={{ position: 'relative' }}>
              {geocodeResults && (
                <div className="geocodePickOverlay">
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 6 }}>
                    <button className="button small" onClick={() => setGeocodeResults(null)}>Cancel</button>
                  </div>
                  {geocodeResults.map((r: any, i: number) => (
                    <button key={i} className="geocodeItem" onClick={() => pickGeocode(r)}>
                      <div style={{ fontSize: 13 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{r.lat.toFixed(4)}, {r.lon.toFixed(4)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button className="button" onClick={updateRoute} disabled={isRouting || itinerary.length === 0}>
            {isRouting ? 'Routing…' : 'Update Route'}
          </button>
          {isRouting && <span className="spinner" aria-hidden="true" />}
          <button className="button" onClick={exportGPX} disabled={!route} title="Download route as GPX">
            Export GPX
          </button>
          <button className="button" onClick={openInGoogleMaps} disabled={!route} title="Open route in Google Maps">
            Open in Google Maps
          </button>
          <button
            className="button"
            onClick={() => setSelectingStart((s) => !s)}
            style={{ background: selectingStart ? '#f97316' : undefined }}
          >
            {selectingStart ? 'Click map to set start (esc to cancel)' : 'Select start'}
          </button>
      </header>
      <main className="main">
        <div className="mapPane">
          <MapView
            onAddPlace={onAddPlace}
            selectedIds={new Set(itinerary.map(i => i.id))}
            route={route}
            startLocation={startLocation}
            selectingStart={selectingStart}
            showFuelStations={showFuelStations}
            showDumpPoints={showDumpPoints}
            showWaterPoints={showWaterPoints}
            showSmallTownsOnly={showSmallTownsOnly}
            showCampsites={showCampsites}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            itinerary={itinerary}
            onMapReady={setMapRef}
            visitedPlaces={visitedPlaces}
            onStartSelected={(lat: number, lon: number, name?: string) => {
              console.log('Start selected:', lat, lon, name)
              setStartLocation({ lat, lon, name })
              setSelectingStart(false)
              
              // Add start location to itinerary as well
              const startPlace: ItineraryItem = {
                id: `start-${lat}-${lon}`,
                name: name || 'Start location',
                type: 'locality',
                lat,
                lon,
                addedAt: Date.now()
              }
              setItinerary((prev) => {
                // Don't add if already in itinerary
                if (prev.some((x) => x.id === startPlace.id)) return prev
                return [startPlace, ...prev]
              })
            }}
          />
        </div>
        <aside className="sidebar">
          <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Itinerary</span>
            {route && route.legs && route.legs.length > 0 && (
              <span style={{ fontSize: 14, fontWeight: 'normal', color: '#475569' }}>
                {(() => {
                  const totalSeconds = route.legs.reduce((sum, leg) => sum + leg.duration, 0)
                  const totalHours = totalSeconds / 3600
                  
                  if (totalHours >= 24) {
                    const days = Math.floor(totalHours / 24)
                    const hours = Math.floor(totalHours % 24)
                    const minutes = Math.round((totalSeconds % 3600) / 60)
                    return days > 0 && hours > 0 
                      ? `${days}d ${hours}h ${minutes}m`
                      : days > 0 
                        ? `${days}d ${minutes}m`
                        : `${hours}h ${minutes}m`
                  }
                  
                  const hours = Math.floor(totalHours)
                  const minutes = Math.round((totalSeconds % 3600) / 60)
                  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
                })()}
              </span>
            )}
          </h2>
          <div style={{ padding: 8, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className="button" 
              onClick={() => setShowFuelStations(!showFuelStations)} 
              title="Show fuel stations near itinerary stops"
              style={{ backgroundColor: showFuelStations ? '#10b981' : undefined }}
            >
              {showFuelStations ? 'Hide Fuel' : 'Show Fuel'}
            </button>
            <button 
              className="button" 
              onClick={() => setShowDumpPoints(!showDumpPoints)} 
              title="Show RV dump points near itinerary stops"
              style={{ backgroundColor: showDumpPoints ? '#8b5cf6' : undefined }}
            >
              {showDumpPoints ? 'Hide Dumps' : 'Show Dumps'}
            </button>
            <button 
              className="button" 
              onClick={() => setShowWaterPoints(!showWaterPoints)} 
              title="Show drinking water filling points near itinerary stops"
              style={{ backgroundColor: showWaterPoints ? '#8b5cf6' : undefined }}
            >
              {showWaterPoints ? 'Hide Water' : 'Show Water'}
            </button>
            <button className="button" onClick={exportItinerary} disabled={itinerary.length === 0} title="Download itinerary as JSON">Save itinerary</button>
            <button className="button" onClick={() => fileInputRef.current?.click()} title="Load itinerary from JSON file">Load itinerary</button>
            <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onFileChange} />
            <button className="button" onClick={clearItinerary} disabled={itinerary.length === 0} title="Remove all stops from itinerary">Clear itinerary</button>
            <button 
              className="button" 
              onClick={() => setShowVisitedModal(true)} 
              title="View all places you've visited"
              style={{ backgroundColor: visitedPlaces.length > 0 ? '#10b981' : undefined }}
            >
              📍 Show Visits ({visitedPlaces.length})
            </button>
            <button 
              className="button" 
              onClick={handleLogout}
              title="Sign out"
              style={{ backgroundColor: '#ef4444' }}
            >
              Logout
            </button>
          </div>
          <Itinerary 
            items={itinerary} 
            onRemove={onRemove} 
            onSetStart={onSetStart} 
            startLocation={startLocation}
            onUploadAttachment={handleUploadAttachment}
            onDeleteAttachment={handleDeleteAttachment}
          />
          <div style={{ marginTop: 24 }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>❤️ Favorites ({favorites.length})</h2>
            <Favorites 
              favorites={favorites} 
              onAddToItinerary={onAddPlace} 
              onRemove={removeFavorite}
              onCenterMap={centerMap}
              onToggleVisited={toggleVisited}
              onUploadAttachment={handleUploadAttachment}
              onDeleteAttachment={handleDeleteAttachment}
            />
          </div>
        </aside>
      </main>
      {showVisitedModal && (
        <VisitedPlaces
          visitedPlaces={visitedPlaces}
          onCenterMap={(lat, lon) => {
            centerMap(lat, lon)
            setShowVisitedModal(false)
          }}
          onUnvisit={unvisitPlace}
          onClose={() => setShowVisitedModal(false)}
        />
      )}
      {showWhatsNew && (
        <div
          className="modalOverlay"
          onClick={() => setShowWhatsNew(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 8, padding: 16, maxWidth: 520, width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>What's New in v4.0</h3>
              <button className="button small" onClick={() => setShowWhatsNew(false)}>Close</button>
            </div>
            <ul style={{ marginTop: 12 }}>
              <li>📎 Attachments for Favorites: upload/view/download/delete photos, PDFs, and docs.</li>
              <li>📎 Attachments for Itinerary stops with the same controls.</li>
              <li>⏱️ Upload progress indicator for a smoother experience.</li>
              <li>🔒 Secure Firebase Storage rules (10MB per file, allowed types only).</li>
              <li>📘 New "User Manual" button that opens the latest manual.</li>
              <li>⭐ Visible version badge in the header.</li>
            </ul>
            <div style={{ marginTop: 12 }}>
              <a href="/interactive-Aus-map/user-manual.html" target="_blank" rel="noopener noreferrer" className="button">Read the Manual</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
