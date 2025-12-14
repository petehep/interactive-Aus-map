import React, { useState } from 'react'
import { collection, doc, setDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import type { ItineraryItem } from '../App'

type Props = {
  isOpen: boolean
  onClose: () => void
  itinerary: ItineraryItem[]
}

export default function SaveRouteModal({ isOpen, onClose, itinerary }: Props) {
  const [routeName, setRouteName] = useState('')
  const [saving, setSaving] = useState(false)
  const user = auth.currentUser

  if (!isOpen) return null

  const handleSave = async () => {
    if (!routeName.trim()) {
      alert('Please enter a name for this route')
      return
    }

    if (!user) {
      alert('You must be logged in to save routes')
      return
    }

    setSaving(true)
    try {
      // Create a safe document ID from the route name
      const safeId = routeName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
      const timestamp = Date.now()
      const docId = `${safeId}-${timestamp}`

      const routeRef = doc(db, `users/${user.uid}/itineraries`, docId)
      await setDoc(routeRef, {
        title: routeName.trim(),
        itinerary: itinerary,
        updatedAt: timestamp
      })

      alert(`Route "${routeName}" saved successfully!`)
      setRouteName('')
      onClose()
    } catch (error) {
      console.error('Error saving route:', error)
      alert('Failed to save route')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>💾 Save Route</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <p style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}>
            Save this route to access it later from Browse Routes.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
              Route Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Great Ocean Road Trip"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
              autoFocus
            />
          </div>

          <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 6, fontSize: 13, color: '#0369a1', marginBottom: '16px' }}>
            📍 <strong>{itinerary.length}</strong> stops will be saved
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="button"
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? 'Saving...' : 'Save Route'}
            </button>
            <button
              className="button"
              onClick={onClose}
              style={{ background: '#94a3b8' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
