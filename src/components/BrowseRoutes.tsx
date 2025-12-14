import React, { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import type { ItineraryItem } from '../App'

type SavedRoute = {
  id: string
  itinerary: ItineraryItem[]
  updatedAt: number
  userId: string
  title?: string
  isMine: boolean
}

type SharedRoute = {
  id: string
  itinerary: ItineraryItem[]
  createdAt: number
  userId: string
  title?: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onLoadRoute: (itinerary: ItineraryItem[]) => void
}

export default function BrowseRoutes({ isOpen, onClose, onLoadRoute }: Props) {
  const [myRoutes, setMyRoutes] = useState<SavedRoute[]>([])
  const [sharedRoutes, setSharedRoutes] = useState<SharedRoute[]>([])
  const [loading, setLoading] = useState(false)
  const user = auth.currentUser

  useEffect(() => {
    if (!isOpen) return

    const fetchRoutes = async () => {
      setLoading(true)
      try {
        // Fetch user's saved itineraries
        if (user) {
          const myItinerariesRef = collection(db, `users/${user.uid}/itineraries`)
          const mySnapshot = await getDocs(myItinerariesRef)
          const myFetchedRoutes = mySnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              isMine: true
            } as SavedRoute))
            .filter(route => route.itinerary && route.itinerary.length > 0)
            .sort((a, b) => b.updatedAt - a.updatedAt)
          setMyRoutes(myFetchedRoutes)
        }

        // Fetch shared routes from other users
        const q = query(
          collection(db, 'sharedRoutes'),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
        const snapshot = await getDocs(q)
        const fetchedRoutes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SharedRoute))
        setSharedRoutes(fetchedRoutes)
      } catch (error) {
        console.error('Error fetching routes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoutes()
  }, [isOpen, user])

  const handleLoadRoute = (route: SavedRoute | SharedRoute) => {
    onLoadRoute(route.itinerary)
    onClose()
  }

  const calculateDistance = (itinerary: ItineraryItem[]) => {
    if (itinerary.length < 2) return 0
    let total = 0
    for (let i = 0; i < itinerary.length - 1; i++) {
      const from = itinerary[i]
      const to = itinerary[i + 1]
      const R = 6371 // Earth's radius in km
      const dLat = (to.lat - from.lat) * Math.PI / 180
      const dLon = (to.lon - from.lon) * Math.PI / 180
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      total += R * c
    }
    return Math.round(total)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const renderRouteCard = (route: SavedRoute | SharedRoute, isMine: boolean) => {
    const distance = calculateDistance(route.itinerary)
    const stops = route.itinerary.length
    const firstStop = route.itinerary[0]?.name || 'Unknown'
    const lastStop = route.itinerary[stops - 1]?.name || 'Unknown'
    const timestamp = 'updatedAt' in route ? route.updatedAt : route.createdAt
    
    return (
      <div key={route.id} className="route-card">
        <div className="route-card-header">
          <h3>{route.title || (route.id === 'current' ? 'Current Route' : `${firstStop} → ${lastStop}`)}</h3>
          <span className="route-date">{formatDate(timestamp)}</span>
        </div>
        <div className="route-card-stats">
          <span className="stat">
            <strong>{stops}</strong> stops
          </span>
          <span className="stat">
            <strong>{distance} km</strong> total
          </span>
        </div>
        <div className="route-card-preview">
          {route.itinerary.slice(0, 3).map((item, idx) => (
            <span key={idx} className="preview-stop">
              📍 {item.name}
            </span>
          ))}
          {stops > 3 && <span className="preview-more">+{stops - 3} more</span>}
        </div>
        <button
          className="button route-load-button"
          onClick={() => handleLoadRoute(route)}
        >
          {isMine ? 'Load This Route' : 'Load This Route'}
        </button>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content browse-routes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🗺️ Browse Public Routes</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading routes...</p>
            </div>
          ) : (
            <>
              {/* My Saved Routes Section */}
              {myRoutes.length > 0 && (
                <div className="routes-section">
                  <h3 className="section-heading">📂 My Saved Routes</h3>
                  <div className="routes-list">
                    {myRoutes.map((route) => renderRouteCard(route, true))}
                  </div>
                </div>
              )}

              {/* Shared Routes Section */}
              <div className="routes-section">
                <h3 className="section-heading">🌐 Shared by Others</h3>
                {sharedRoutes.length === 0 ? (
                  <div className="empty-state">
                    <p>No shared routes yet. Be the first to share!</p>
                  </div>
                ) : (
                  <div className="routes-list">
                    {sharedRoutes.map((route) => renderRouteCard(route, false))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
