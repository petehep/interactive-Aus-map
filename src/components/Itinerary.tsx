import React from 'react'
import type { ItineraryItem } from '../App'

type Props = {
  items: ItineraryItem[]
  onRemove: (id: string) => void
  onSetStart: (item: ItineraryItem) => void
  startLocation?: { lat: number; lon: number; name?: string }
}

export default function Itinerary({ items, onRemove, onSetStart, startLocation }: Props) {
  if (!items.length) {
    return (
      <div style={{ padding: 12, color: '#64748b' }}>
        No stops yet. Click places on the map to add them.
      </div>
    )
  }
  return (
    <ul className="itineraryList">
      {items.map((it) => {
        const isStart = startLocation && 
          startLocation.lat === it.lat && 
          startLocation.lon === it.lon
        return (
          <li key={it.id} className="itineraryItem">
            <div>
              <div style={{ fontWeight: 600 }}>
                {isStart && '⭐ '}
                {it.name}
              </div>
              <small>{it.type} · {it.lat.toFixed(3)}, {it.lon.toFixed(3)}</small>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="button" onClick={() => onSetStart(it)}>Make Start</button>
              <button className="button" onClick={() => onRemove(it.id)}>Remove</button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
