import React, { useState } from 'react'
import { createShareableRoute, generateShareUrl } from '../services/routeShareService'

type ItineraryItem = {
  id: string
  name: string
  lat: number
  lon: number
  type?: string
  addedAt?: number
}

type Props = {
  itinerary: ItineraryItem[]
  isOpen: boolean
  onClose: () => void
}

export default function ShareItinerary({ itinerary, isOpen, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleShare = () => {
    if (!title.trim()) {
      alert('Please enter a title for your route')
      return
    }

    try {
      const shareableRoute = createShareableRoute(
        itinerary,
        title.trim(),
        description.trim()
      )
      const url = generateShareUrl(shareableRoute)
      setShareUrl(url)
    } catch (error) {
      console.error('Error generating share URL:', error)
      alert('Failed to generate share link')
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      alert('Failed to copy link')
    }
  }

  const handleReset = () => {
    setTitle('')
    setDescription('')
    setShareUrl('')
  }

  return (
    <div
      className="modalOverlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          maxWidth: 500,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>📤 Share Your Route</h3>
          <button className="button small" onClick={onClose}>Close</button>
        </div>

        {!shareUrl ? (
          <>
            <p style={{ color: '#475569', marginBottom: 16, fontSize: 14 }}>
              Share your itinerary with others. They can load your route and customize it for their own trip.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                Route Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Great Ocean Road Adventure"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleShare()
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                Description (optional)
              </label>
              <textarea
                placeholder="e.g., A scenic 5-day coastal route with stops at iconic landmarks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 6, fontSize: 13, color: '#0369a1' }}>
              📍 <strong>{itinerary.length}</strong> stops will be shared (attachments and personal files are not included)
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button" onClick={handleShare} style={{ flex: 1 }}>
                Generate Share Link
              </button>
              <button className="button" onClick={onClose} style={{ background: '#94a3b8' }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#f0fdf4', borderRadius: 6, fontSize: 13, color: '#16a34a' }}>
              ✓ Share link generated! Copy and share with others.
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                Share Link
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: '#475569',
                    backgroundColor: '#f8fafc'
                  }}
                />
                <button
                  className="button"
                  onClick={handleCopyToClipboard}
                  style={{ whiteSpace: 'nowrap' }}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 6, fontSize: 13, color: '#92400e' }}>
              💡 Share this link via email, messaging, or social media. Recipients can open it to load your route.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button" onClick={handleReset} style={{ flex: 1 }}>
                Create Another Route
              </button>
              <button className="button" onClick={onClose} style={{ background: '#10b981' }}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
