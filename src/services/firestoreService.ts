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

// Sanitize IDs - Firestore document IDs can't contain slashes
// Replace slashes with underscores
function sanitizeId(id: string): string {
  return id.replace(/\//g, '_')
}

// Favorites
export async function saveFavorite(userId: string, place: Place) {
  const favoriteRef = doc(db, `users/${userId}/favorites`, sanitizeId(place.id))
  await setDoc(favoriteRef, {
    ...place,
    updatedAt: Date.now()
  })
}

export async function deleteFavorite(userId: string, placeId: string) {
  const favoriteRef = doc(db, `users/${userId}/favorites`, sanitizeId(placeId))
  await deleteDoc(favoriteRef)
}

export async function getFavorites(userId: string): Promise<Place[]> {
  const favoritesRef = collection(db, `users/${userId}/favorites`)
  const snapshot = await getDocs(favoritesRef)
  return snapshot.docs.map(doc => doc.data() as Place)
}

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

// Visited Places
export async function saveVisitedPlace(userId: string, place: Place) {
  const visitedRef = doc(db, `users/${userId}/visited`, sanitizeId(place.id))
  await setDoc(visitedRef, {
    ...place,
    visitedAt: place.visitedAt || Date.now(),
    updatedAt: Date.now()
  })
}

export async function deleteVisitedPlace(userId: string, placeId: string) {
  const visitedRef = doc(db, `users/${userId}/visited`, sanitizeId(placeId))
  await deleteDoc(visitedRef)
}

export async function getVisitedPlaces(userId: string): Promise<Place[]> {
  const visitedRef = collection(db, `users/${userId}/visited`)
  const snapshot = await getDocs(visitedRef)
  return snapshot.docs.map(doc => doc.data() as Place)
}

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

// Itinerary
export async function saveItinerary(userId: string, itinerary: ItineraryItem[]) {
  const itineraryRef = doc(db, `users/${userId}/itineraries`, 'current')
  await setDoc(itineraryRef, {
    items: itinerary,
    updatedAt: Date.now()
  })
}

export async function getItinerary(userId: string): Promise<ItineraryItem[]> {
  const itineraryRef = doc(db, `users/${userId}/itineraries`, 'current')
  const snapshot = await getDoc(itineraryRef)
  if (snapshot.exists()) {
    return snapshot.data().items || []
  }
  return []
}

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

// Migration helper - moves localStorage data to Firestore
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

export function isMigrationComplete(): boolean {
  return localStorage.getItem('firestore-migrated') === 'true'
}
