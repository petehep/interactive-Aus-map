import { storage } from '../firebase'
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  listAll,
  UploadTask
} from 'firebase/storage'
import type { Attachment } from '../components/MapView'

/**
 * Upload a file to Firebase Storage for a specific place
 * @param userId - The authenticated user's ID
 * @param placeId - The place ID this attachment belongs to
 * @param file - The file to upload
 * @returns Attachment metadata object
 */
export async function uploadAttachment(
  userId: string,
  placeId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<Attachment> {
  // Create unique file path: users/{userId}/places/{placeId}/{timestamp}_{filename}
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storagePath = `users/${userId}/places/${placeId}/${timestamp}_${sanitizedName}`
  
  const storageRef = ref(storage, storagePath)
  
  // Upload file with resumable task to report progress
  const task: UploadTask = uploadBytesResumable(storageRef, file)
  
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', (snapshot) => {
      if (onProgress) {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress(Math.round(percent))
      }
    }, reject, () => resolve())
  })
  
  // Get download URL
  const url = await getDownloadURL(task.snapshot.ref)
  
  // Return attachment metadata
  return {
    id: `${timestamp}_${sanitizedName}`,
    name: file.name,
    url,
    storagePath,
    type: file.type,
    size: file.size,
    uploadedAt: timestamp
  }
}

/**
 * Delete a file from Firebase Storage
 * @param storagePath - The storage path of the file to delete
 */
export async function deleteAttachment(storagePath: string): Promise<void> {
  const storageRef = ref(storage, storagePath)
  await deleteObject(storageRef)
}

/**
 * Delete all attachments for a specific place
 * @param userId - The authenticated user's ID
 * @param placeId - The place ID to delete attachments for
 */
export async function deleteAllAttachments(
  userId: string,
  placeId: string
): Promise<void> {
  const folderRef = ref(storage, `users/${userId}/places/${placeId}`)
  
  try {
    const result = await listAll(folderRef)
    
    // Delete all files in the folder
    await Promise.all(
      result.items.map(itemRef => deleteObject(itemRef))
    )
  } catch (error) {
    // Folder doesn't exist or is already empty
    console.log('No attachments to delete or folder not found')
  }
}

/**
 * Get file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string like "2.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Check if file type is an image
 * @param mimeType - The MIME type of the file
 * @returns True if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Get file icon emoji based on MIME type
 * @param mimeType - The MIME type of the file
 * @returns Emoji representing the file type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦'
  return '📎'
}
