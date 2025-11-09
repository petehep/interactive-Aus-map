import React from 'react'
import type { ItineraryItem } from '../App'

type Props = {
  items: ItineraryItem[]
  onRemove: (id: string) => void
}

export default function Itinerary({ items, onRemove }: Props) {
  if (!items.length) {
    return (
      <div style={{ padding: 12, color: '#64748b' }}>
        No stops yet. Click places on the map to add them.
      </div>
    )
  }
  return (
    <ul className="itineraryList">
      {items.map((it) => (
        <li key={it.id} className="itineraryItem">
          <div>
            <div style={{ fontWeight: 600 }}>{it.name}</div>
            <small>{it.type} · {it.lat.toFixed(3)}, {it.lon.toFixed(3)}</small>
          </div>
          <button className="button" onClick={() => onRemove(it.id)}>Remove</button>
        </li>
      ))}
    </ul>
  )
}
