import React, { useState } from 'react'
import type { ItineraryItem } from '../App'
import Attachments from './Attachments'
import type { Attachment } from './MapView'

type Props = {
  items: ItineraryItem[]
  onRemove: (id: string) => void
  onSetStart: (item: ItineraryItem) => void
  onUploadAttachment: (placeId: string, file: File) => Promise<void>
  onDeleteAttachment: (placeId: string, attachment: Attachment) => Promise<void>
  startLocation?: { lat: number; lon: number; name?: string }
}

export default function Itinerary({ items, onRemove, onSetStart, onUploadAttachment, onDeleteAttachment, startLocation }: Props) {
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
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
            <div style={{ marginTop: 8 }}>
              <Attachments
                attachments={it.attachments || []}
                uploading={uploadingFor === it.id}
                onUpload={async (file) => {
                  setUploadingFor(it.id)
                  try {
                    await onUploadAttachment(it.id, file)
                  } finally {
                    setUploadingFor(null)
                  }
                }}
                onDelete={(attachment) => onDeleteAttachment(it.id, attachment)}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
