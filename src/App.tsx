import React, { useCallback, useMemo, useState } from 'react'
import MapView, { Place } from './components/MapView'
import Itinerary from './components/Itinerary'

export type ItineraryItem = Place & { addedAt: number }

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

  const summary = useMemo(() => `${itinerary.length} stop${itinerary.length === 1 ? '' : 's'}`,[itinerary.length])

  return (
    <div className="app">
      <header className="header">
        <h1 style={{ fontSize: 18, margin: 0 }}>Australia Trip Scheduler</h1>
        <div>{summary}</div>
      </header>
      <main className="main">
        <div className="mapPane">
          <MapView onAddPlace={onAddPlace} selectedIds={new Set(itinerary.map(i => i.id))} />
        </div>
        <aside className="sidebar">
          <h2>Itinerary</h2>
          <Itinerary items={itinerary} onRemove={onRemove} />
        </aside>
      </main>
    </div>
  )
}
