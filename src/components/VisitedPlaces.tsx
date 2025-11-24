import React, { useMemo } from 'react'

type Place = {
  id: string
  name: string
  type: 'city' | 'town' | 'village' | 'hamlet' | 'locality' | 'attraction'
  lat: number
  lon: number
  population?: number
  visitedAt?: number // timestamp when visited
}

type Props = {
  visitedPlaces: Place[]
  onCenterMap: (lat: number, lon: number) => void
  onUnvisit: (id: string) => void
  onClose: () => void
}

function getAustralianState(lat: number, lon: number): string {
  // Rough state boundaries for Australia
  if (lat > -29 && lon > 153) return 'QLD' // Far north QLD
  if (lat > -29 && lon > 149 && lon <= 153) return 'QLD'
  if (lat > -29 && lon <= 149) return 'NT'
  if (lat <= -29 && lat > -37 && lon > 141 && lon <= 153.5) return 'NSW'
  if (lat <= -37 && lon > 141 && lon <= 150) return 'VIC'
  if (lat <= -26 && lat > -29 && lon > 138 && lon <= 141) return 'SA'
  if (lat <= -29 && lat > -37 && lon <= 141) return 'SA'
  if (lat <= -37) return 'TAS'
  if (lon <= 129) return 'WA'
  if (lat > -26 && lon > 129 && lon <= 138) return 'NT'
  if (lat <= -26 && lat > -29 && lon > 138 && lon <= 141) return 'SA'
  if (lat > -35 && lon > 149) return 'ACT'
  return 'Other'
}

const stateNames: Record<string, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  SA: 'South Australia',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  NT: 'Northern Territory',
  ACT: 'Australian Capital Territory',
  Other: 'Other'
}

export default function VisitedPlaces({ visitedPlaces, onCenterMap, onUnvisit, onClose }: Props) {
  const groupedByState = useMemo(() => {
    const groups: Record<string, Place[]> = {}
    
    visitedPlaces.forEach(place => {
      const state = getAustralianState(place.lat, place.lon)
      if (!groups[state]) groups[state] = []
      groups[state].push(place)
    })
    
    // Sort places within each state alphabetically
    Object.keys(groups).forEach(state => {
      groups[state].sort((a, b) => a.name.localeCompare(b.name))
    })
    
    return groups
  }, [visitedPlaces])

  const stateCodes = Object.keys(groupedByState).sort()

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        maxWidth: 600,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            📍 Visited Places ({visitedPlaces.length})
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1
            }}
            title="Close"
          >
            ×
          </button>
        </div>

        {visitedPlaces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
            <p>No places visited yet!</p>
            <p style={{ fontSize: 14 }}>Mark favorites as visited to track your journey.</p>
          </div>
        ) : (
          <div>
            {stateCodes.map(stateCode => (
              <div key={stateCode} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#475569',
                  padding: '8px 12px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: 4,
                  marginBottom: 4
                }}>
                  {stateNames[stateCode] || stateCode} ({groupedByState[stateCode].length})
                </div>
                {groupedByState[stateCode].map(place => (
                  <div
                    key={place.id}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          color: '#2563eb'
                        }}
                        onClick={() => onCenterMap(place.lat, place.lon)}
                        title="Click to center map on this location"
                      >
                        ✓ {place.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {place.type} · {place.lat.toFixed(3)}, {place.lon.toFixed(3)}
                        {place.visitedAt && (
                          <span> · Visited {new Date(place.visitedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="button small"
                      onClick={() => onUnvisit(place.id)}
                      title="Mark as not visited"
                      style={{ fontSize: 11, padding: '4px 8px', background: '#ef4444' }}
                    >
                      Unvisit
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
