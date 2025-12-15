import React, { useState } from 'react'
import type { ItineraryItem } from '../App'
import Attachments from './Attachments'
import type { Attachment } from './MapView'

type Props = {
  items: ItineraryItem[]
  onRemove: (id: string) => void
  onSetStart: (item: ItineraryItem) => void
  onClearStart: () => void
  onUploadAttachment: (placeId: string, file: File) => Promise<void>
  onDeleteAttachment: (placeId: string, attachment: Attachment) => Promise<void>
  onToggleVisited?: (id: string, place?: any) => Promise<void>
  onCenterMap?: (lat: number, lon: number) => void
  startLocation?: { lat: number; lon: number; name?: string }
  visitedPlaces?: Array<{ id: string; visited?: boolean }>
}

export default function Itinerary({ items, onRemove, onSetStart, onClearStart, onUploadAttachment, onDeleteAttachment, onToggleVisited, onCenterMap, startLocation, visitedPlaces = [] }: Props) {
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
        const isVisited = visitedPlaces.some(vp => vp.id === it.id)
        return (
          <li key={it.id} className="itineraryItem" style={{ opacity: isVisited ? 0.6 : 1 }}>
            <div>
              <div 
                style={{ 
                  fontWeight: 600, 
                  textDecoration: isVisited ? 'line-through' : 'none',
                  cursor: onCenterMap ? 'pointer' : 'default',
                  color: onCenterMap ? '#2563eb' : 'inherit'
                }}
                onClick={() => onCenterMap && onCenterMap(it.lat, it.lon)}
                title={onCenterMap ? 'Click to center map on this location' : ''}
              >
                {isStart && '⭐ '}
                {isVisited && '✓ '}
                {it.name}
              </div>
              <small>{it.type} · {it.lat.toFixed(3)}, {it.lon.toFixed(3)}</small>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {isStart ? (
                <button className="button" onClick={onClearStart}>Clear From Start</button>
              ) : !startLocation && (
                <button className="button" onClick={() => onSetStart(it)}>Make Start</button>
              )}
              {onToggleVisited && (
                <button
                  className="button"
                  onClick={async () => {
                    try {
                      await onToggleVisited(it.id, it as any)
                    } catch (error) {
                      console.error('Error toggling visited:', error)
                    }
                  }}
                  title={isVisited ? 'Mark as unvisited' : 'Mark as visited'}
                  style={{ background: isVisited ? '#10b981' : '#6b7280', fontSize: 11, padding: '4px 8px' }}
                >
                  {isVisited ? '✓' : '○'}
                </button>
              )}
              <button className="button" onClick={() => onRemove(it.id)}>Remove From Itinerary</button>
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
