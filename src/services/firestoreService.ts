import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot,
  query,
  Unsubscribe
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Place } from '../components/MapView'
import type { ItineraryItem } from '../App'

/**
 * Sanitizes place IDs for use as Firestore document IDs
 * Firestore doesn't allow slashes in document IDs, but OSM IDs do (e.g., "node/123456")
 * This function replaces slashes with underscores: "node/123456" → "node_123456"
 * @param id - The original place ID from OSM
 * @returns The sanitized ID safe for Firestore
 */
function sanitizeId(id: string): string {
  return id.replace(/\//g, '_')
}

// ============================================================================
// FAVORITES - Cloud-synced places to visit
// ============================================================================

/**
 * Save a place to user's favorites in Firestore
 * @param userId - The current user's ID
 * @param place - The place object to save
 * @throws Firestore errors if write fails
 */
export async function saveFavorite(userId: string, place: Place) {
  const favoriteRef = doc(db, `users/${userId}/favorites`, sanitizeId(place.id))
  await setDoc(favoriteRef, {
    ...place,
    updatedAt: Date.now()
  })
}

/**
 * Remove a place from user's favorites
 * @param userId - The current user's ID
 * @param placeId - The ID of the place to remove
 * @throws Firestore errors if delete fails
 */
export async function deleteFavorite(userId: string, placeId: string) {
  const favoriteRef = doc(db, `users/${userId}/favorites`, sanitizeId(placeId))
  await deleteDoc(favoriteRef)
}

/**
 * Fetch all user's favorites from Firestore (one-time fetch)
 * For real-time updates, use subscribeFavorites() instead
 * @param userId - The current user's ID
 * @returns Promise resolving to array of favorite places
 */
export async function getFavorites(userId: string): Promise<Place[]> {
  const favoritesRef = collection(db, `users/${userId}/favorites`)
  const snapshot = await getDocs(favoritesRef)
  return snapshot.docs.map(doc => doc.data() as Place)
}

/**
 * Subscribe to real-time updates of user's favorites
 * Callback fires immediately with current data, then on every change
 * IMPORTANT: Call the returned unsubscribe function in useEffect cleanup to prevent memory leaks
 * @param userId - The current user's ID
 * @param callback - Function called with updated favorites array
 * @returns Unsubscribe function - call to stop listening
 * @example
 * useEffect(() => {
 *   const unsubscribe = subscribeFavorites(userId, (favorites) => {
 *     setFavorites(favorites)
 *   })
 *   return () => unsubscribe()
 * }, [userId])
 */
export function subscribeFavorites(
  userId: string, 
  callback: (favorites: Place[]) => void
): Unsubscribe {
  const favoritesRef = collection(db, `users/${userId}/favorites`)
  return onSnapshot(favoritesRef, (snapshot) => {
    const favorites = snapshot.docs.map(doc => doc.data() as Place)
    callback(favorites)
  })
}

// ============================================================================
// VISITED PLACES - Track locations you've visited
// ============================================================================

/**
 * Mark a place as visited
 * @param userId - The current user's ID
 * @param place - The place object to mark as visited
 * @throws Firestore errors if write fails
 */
export async function saveVisitedPlace(userId: string, place: Place) {
  const visitedRef = doc(db, `users/${userId}/visited`, sanitizeId(place.id))
  await setDoc(visitedRef, {
    ...place,
    visitedAt: place.visitedAt || Date.now(),
    updatedAt: Date.now()
  })
}

/**
 * Unmark a place as visited
 * @param userId - The current user's ID
 * @param placeId - The ID of the place to unmark
 * @throws Firestore errors if delete fails
 */
export async function deleteVisitedPlace(userId: string, placeId: string) {
  const visitedRef = doc(db, `users/${userId}/visited`, sanitizeId(placeId))
  await deleteDoc(visitedRef)
}

/**
 * Fetch all user's visited places from Firestore (one-time fetch)
 * For real-time updates, use subscribeVisitedPlaces() instead
 * @param userId - The current user's ID
 * @returns Promise resolving to array of visited places
 */
export async function getVisitedPlaces(userId: string): Promise<Place[]> {
  const visitedRef = collection(db, `users/${userId}/visited`)
  const snapshot = await getDocs(visitedRef)
  return snapshot.docs.map(doc => doc.data() as Place)
}

/**
 * Subscribe to real-time updates of user's visited places
 * Callback fires immediately with current data, then on every change
 * IMPORTANT: Call the returned unsubscribe function in useEffect cleanup to prevent memory leaks
 * @param userId - The current user's ID
 * @param callback - Function called with updated visited places array
 * @returns Unsubscribe function - call to stop listening
 */
export function subscribeVisitedPlaces(
  userId: string, 
  callback: (visited: Place[]) => void
): Unsubscribe {
  const visitedRef = collection(db, `users/${userId}/visited`)
  return onSnapshot(visitedRef, (snapshot) => {
    const visited = snapshot.docs.map(doc => doc.data() as Place)
    callback(visited)
  })
}

// ============================================================================
// ITINERARY - Multi-stop trip route
// ============================================================================

/**
 * Save user's trip itinerary (list of stops)
 * @param userId - The current user's ID
 * @param itinerary - Array of stops in the trip
 * @throws Firestore errors if write fails
 */
export async function saveItinerary(userId: string, itinerary: ItineraryItem[]) {
  const itineraryRef = doc(db, `users/${userId}/itineraries`, 'current')
  await setDoc(itineraryRef, {
    items: itinerary,
    updatedAt: Date.now()
  })
}

/**
 * Fetch user's current itinerary (one-time fetch)
 * For real-time updates, use subscribeItinerary() instead
 * @param userId - The current user's ID
 * @returns Promise resolving to array of itinerary items
 */
export async function getItinerary(userId: string): Promise<ItineraryItem[]> {
  const itineraryRef = doc(db, `users/${userId}/itineraries`, 'current')
  const snapshot = await getDoc(itineraryRef)
  if (snapshot.exists()) {
    return snapshot.data().items || []
  }
  return []
}

/**
 * Subscribe to real-time updates of user's itinerary
 * Callback fires immediately with current data, then on every change
 * IMPORTANT: Call the returned unsubscribe function in useEffect cleanup to prevent memory leaks
 * @param userId - The current user's ID
 * @param callback - Function called with updated itinerary array
 * @returns Unsubscribe function - call to stop listening
 */
export function subscribeItinerary(
  userId: string, 
  callback: (itinerary: ItineraryItem[]) => void
): Unsubscribe {
  const itineraryRef = doc(db, `users/${userId}/itineraries`, 'current')
  return onSnapshot(itineraryRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().items || [])
    } else {
      callback([])
    }
  })
}

// ============================================================================
// DATA MIGRATION - Move from localStorage to Firestore
// ============================================================================

/**
 * Migrate user's data from localStorage to Firestore
 * Called automatically on first login. Moves favorites, visited places, and itinerary
 * Safe to call multiple times - only migrates if data exists
 * @param userId - The current user's ID
 * @returns Promise resolving to true if migration succeeded
 */
export async function migrateLocalStorageToFirestore(userId: string) {
  try {
    // Migrate favorites
    const favoritesStr = localStorage.getItem('trip-favorites')
    if (favoritesStr) {
      const favorites: Place[] = JSON.parse(favoritesStr)
      for (const place of favorites) {
        await saveFavorite(userId, place)
      }
      console.log(`Migrated ${favorites.length} favorites to Firestore`)
    }

    // Migrate visited places
    const visitedStr = localStorage.getItem('trip-visited-places')
    if (visitedStr) {
      const visited: Place[] = JSON.parse(visitedStr)
      for (const place of visited) {
        await saveVisitedPlace(userId, place)
      }
      console.log(`Migrated ${visited.length} visited places to Firestore`)
    }

    // Mark migration as complete
    localStorage.setItem('firestore-migrated', 'true')
    
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}

/**
 * Check if user's data has already been migrated to Firestore
 * @returns true if migration is complete, false otherwise
 */
export function isMigrationComplete(): boolean {
  return localStorage.getItem('firestore-migrated') === 'true'
}
