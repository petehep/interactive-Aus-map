import React, { useState, useRef } from 'react'
import type { Attachment } from './MapView'
import { 
  formatFileSize, 
  getFileIcon, 
  isImageFile 
} from '../services/storageService'

type Props = {
  attachments: Attachment[]
  onUpload: (file: File) => Promise<void>
  onDelete: (attachment: Attachment) => Promise<void>
  uploading: boolean
}

export default function Attachments({ attachments, onUpload, onDelete, uploading }: Props) {
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setProgress(0)
      await onUpload(file)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setProgress(0)
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Delete ${attachment.name}?`)) return
    
    try {
      await onDelete(attachment)
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete file. Please try again.')
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 8 
      }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
          📎 Attachments ({attachments.length})
        </h4>
        <label style={{ cursor: 'pointer' }}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <span
            className="button"
            style={{
              padding: '4px 8px',
              fontSize: 12,
              opacity: uploading ? 0.6 : 1,
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? `Uploading... ${progress}%` : '+ Add File'}
          </span>
        </label>
      </div>

      {attachments.length === 0 ? (
        <div style={{ 
          padding: 8, 
          color: '#94a3b8', 
          fontSize: 13,
          fontStyle: 'italic'
        }}>
          No attachments yet. Add booking confirmations, maps, or photos.
        </div>
      ) : (
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          {attachments.map((att) => (
            <li
              key={att.id}
              style={{
                padding: 8,
                backgroundColor: '#f8fafc',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span style={{ fontSize: 20 }}>
                {getFileIcon(att.type)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {att.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {formatFileSize(att.size)} · {new Date(att.uploadedAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {isImageFile(att.type) && (
                  <button
                    className="button"
                    onClick={() => setViewingImage(att.url)}
                    style={{ 
                      padding: '4px 8px', 
                      fontSize: 12,
                      backgroundColor: '#3b82f6'
                    }}
                  >
                    👁️ View
                  </button>
                )}
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button"
                  style={{ 
                    padding: '4px 8px', 
                    fontSize: 12,
                    textDecoration: 'none',
                    backgroundColor: '#10b981'
                  }}
                >
                  ⬇️ Download
                </a>
                <button
                  className="button"
                  onClick={() => handleDelete(att)}
                  style={{ 
                    padding: '4px 8px', 
                    fontSize: 12,
                    backgroundColor: '#ef4444'
                  }}
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Image viewer modal */}
      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20,
            cursor: 'pointer'
          }}
        >
          <img
            src={viewingImage}
            alt="Preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: 8
            }}
          />
          <button
            className="button"
            onClick={(e) => {
              e.stopPropagation()
              setViewingImage(null)
            }}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              backgroundColor: '#ef4444',
              padding: '8px 16px'
            }}
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  )
}
