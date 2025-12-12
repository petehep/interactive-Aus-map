import React, { useMemo } from 'react'

type Place = {
  id: string
  name: string
  type: 'city' | 'town' | 'village' | 'hamlet' | 'locality' | 'attraction'
  lat: number
  lon: number
  population?: number
  visited?: boolean
}

type Props = {
  favorites: Place[]
  onAddToItinerary: (place: Place) => void
  onRemove: (id: string) => void
  onCenterMap: (lat: number, lon: number) => void
  onToggleVisited: (id: string) => void
}

// Australian states/territories with their approximate boundaries
const getAustralianState = (lat: number, lon: number): string => {
  // Rough boundaries for Australian states/territories
  if (lon < 129) {
    return 'WA' // Western Australia
  } else if (lon >= 129 && lon < 138) {
    if (lat < -26) return 'SA' // South Australia
    return 'NT' // Northern Territory
  } else if (lon >= 138 && lon < 141) {
    if (lat < -29) return 'SA' // South Australia
    if (lat < -26) return 'QLD' // Queensland
    return 'NT' // Northern Territory
  } else if (lon >= 141 && lon < 153) {
    if (lat > -29) return 'QLD' // Queensland
    if (lat > -34) return 'NSW' // New South Wales
    if (lat > -39) return 'VIC' // Victoria
    return 'SA' // South Australia
  } else {
    // Eastern states
    if (lat > -29) return 'QLD' // Queensland
    if (lat > -37) return 'NSW' // New South Wales
    if (lat > -39.2) return 'VIC' // Victoria
    if (lat > -43.6) return 'TAS' // Tasmania
    return 'NSW' // Default
  }
}

const stateNames: Record<string, string> = {
  'NSW': 'New South Wales',
  'VIC': 'Victoria',
  'QLD': 'Queensland',
  'SA': 'South Australia',
  'WA': 'Western Australia',
  'TAS': 'Tasmania',
  'NT': 'Northern Territory',
  'ACT': 'Australian Capital Territory'
}

export default function Favorites({ favorites, onAddToItinerary, onRemove, onCenterMap, onToggleVisited }: Props) {
  const groupedByState = useMemo(() => {
    const groups: Record<string, Place[]> = {}
    
    favorites.forEach(place => {
      const state = getAustralianState(place.lat, place.lon)
      if (!groups[state]) groups[state] = []
      groups[state].push(place)
    })
    
    // Sort places within each state by name
    Object.keys(groups).forEach(state => {
      groups[state].sort((a, b) => a.name.localeCompare(b.name))
    })
    
    return groups
  }, [favorites])

  const sortedStates = Object.keys(groupedByState).sort()

  if (favorites.length === 0) {
    return (
      <div style={{ padding: 12, color: '#64748b', fontSize: 14 }}>
        No favorites yet. Click the heart button in any marker popup to add it to your favorites.
      </div>
    )
  }

  return (
    <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
      {sortedStates.map(stateCode => (
        <div key={stateCode} style={{ marginBottom: 16 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: 14, 
            color: '#0f172a', 
            padding: '8px 12px',
            background: '#f1f5f9',
            borderLeft: '3px solid #ec4899'
          }}>
            {stateNames[stateCode] || stateCode} ({groupedByState[stateCode].length})
          </div>
          {groupedByState[stateCode].map(place => (
            <div 
              key={place.id} 
              style={{ 
                padding: '8px 12px', 
                borderBottom: '1px solid #e2e8f0',
                opacity: place.visited ? 0.6 : 1
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <div 
                  style={{ 
                    fontSize: 13, 
                    fontWeight: 500,
                    cursor: 'pointer',
                    color: '#2563eb',
                    textDecoration: place.visited ? 'line-through' : 'none'
                  }}
                  onClick={() => onCenterMap(place.lat, place.lon)}
                  title="Click to center map on this location"
                >
                  {place.visited ? '✓ ' : ''}{place.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {place.type} · {place.lat.toFixed(3)}, {place.lon.toFixed(3)}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <a 
                    href={`https://www.meteoblue.com/en/weather/forecast/week/${place.lat.toFixed(4)}N${place.lon.toFixed(4)}E`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none' }}
                  >
                    ☀️ Weather
                  </a>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none' }}
                  >
                    🗺️ Google Maps
                  </a>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="button small"
                  onClick={() => onAddToItinerary(place)}
                  title="Add to itinerary"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  Add
                </button>
                <button
                  className="button small"
                  onClick={async () => {
                    try {
                      await onToggleVisited(place.id)
                    } catch (error) {
                      console.error('Error toggling visited status:', error)
                    }
                  }}
                  title={place.visited ? 'Mark as unvisited' : 'Mark as visited'}
                  style={{ fontSize: 11, padding: '4px 8px', background: place.visited ? '#10b981' : '#6b7280' }}
                >
                  {place.visited ? '✓' : '○'}
                </button>
                <button
                  className="button small"
                  onClick={() => onRemove(place.id)}
                  title="Remove from favorites"
                  style={{ fontSize: 11, padding: '4px 8px', background: '#ef4444' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
