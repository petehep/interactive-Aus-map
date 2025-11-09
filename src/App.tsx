import React, { useCallback, useMemo, useState } from 'react'
import MapView, { Place } from './components/MapView'
import Itinerary from './components/Itinerary'
import type { LatLngTuple } from 'leaflet'

export type ItineraryItem = Place & { addedAt: number }

type RouteLeg = { distance: number; duration: number }
type RouteResult = {
  coordinates: [number, number][]
  legs: RouteLeg[]
  orderedPlaceIds: string[]
  waypoints: [number, number][]
} | null

export default function App() {
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([])

  const onAddPlace = useCallback((p: Place) => {
    setItinerary((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev
      return [...prev, { ...p, addedAt: Date.now() }]
    })
  }, [])

  const onRemove = useCallback((id: string) => {
    setItinerary((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const [route, setRoute] = useState<RouteResult>(null)
  const [startLocation, setStartLocation] = useState<{ lat: number; lon: number; name?: string }>({ lat: -34.9285, lon: 138.6007, name: 'Adelaide' })
  const [selectingStart, setSelectingStart] = useState(false)

  const updateRoute = useCallback(async () => {
    if (!itinerary.length) return
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
    } catch (e) {
      console.error(e)
      alert('Could not compute route. See console for details.')
    }
  }, [itinerary])

  const summary = useMemo(() => `${itinerary.length} stop${itinerary.length === 1 ? '' : 's'}`,[itinerary.length])

  return (
    <div className="app">
      <header className="header">
        <h1 style={{ fontSize: 18, margin: 0 }}>Australia Trip Scheduler</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div>{summary}</div>
          <button className="button" onClick={updateRoute} disabled={itinerary.length === 0}>Update Route</button>
          <button
            className="button"
            onClick={() => setSelectingStart((s) => !s)}
            style={{ background: selectingStart ? '#f97316' : undefined }}
          >
            {selectingStart ? 'Click map to set start (esc to cancel)' : 'Select start'}
          </button>
        </div>
      </header>
      <main className="main">
        <div className="mapPane">
          <MapView
            onAddPlace={onAddPlace}
            selectedIds={new Set(itinerary.map(i => i.id))}
            route={route}
            startLocation={startLocation}
            selectingStart={selectingStart}
            onStartSelected={(lat, lon, name) => {
              setStartLocation({ lat, lon, name })
              setSelectingStart(false)
            }}
          />
        </div>
        <aside className="sidebar">
          <h2>Itinerary</h2>
          <Itinerary items={itinerary} onRemove={onRemove} />
        </aside>
      </main>
    </div>
  )
}
