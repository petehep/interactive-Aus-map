/**
 * Route Sharing Service
 * Encodes and decodes itinerary data for shareable URLs
 */

import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase'

export interface ShareableRoute {
  title: string
  description: string
  stops: Array<{
    id: string
    name: string
    lat: number
    lon: number
    type?: string
  }>
  createdAt: number
  createdBy?: string
}

/**
 * Encode route data to a compact string for URL sharing
 */
export function encodeRoute(route: ShareableRoute): string {
  try {
    const json = JSON.stringify(route)
    // Use base64 encoding for compact URL-safe representation
    const encoded = btoa(json)
    return encoded
  } catch (error) {
    console.error('Error encoding route:', error)
    throw new Error('Failed to encode route')
  }
}

/**
 * Decode route data from URL parameter
 */
export function decodeRoute(encoded: string): ShareableRoute {
  try {
    const json = atob(encoded)
    const route = JSON.parse(json) as ShareableRoute
    return route
  } catch (error) {
    console.error('Error decoding route:', error)
    throw new Error('Invalid route data')
  }
}

/**
 * Generate a shareable URL for a route
 */
export function generateShareUrl(route: ShareableRoute): string {
  const encoded = encodeRoute(route)
  const baseUrl = window.location.origin + window.location.pathname
  const params = new URLSearchParams()
  params.set('sharedRoute', encoded)
  return `${baseUrl}?${params.toString()}`
}

/**
 * Extract shared route from URL if present
 */
export function getSharedRouteFromUrl(): ShareableRoute | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('sharedRoute')
    
    if (!encoded) return null
    
    const route = decodeRoute(encoded)
    
    // Validate route structure
    if (!route.stops || !Array.isArray(route.stops) || route.stops.length === 0) {
      return null
    }
    
    return route
  } catch (error) {
    console.error('Error extracting shared route from URL:', error)
    return null
  }
}

/**
 * Create a shareable route from current itinerary
 */
export function createShareableRoute(
  itinerary: Array<{ id: string; name: string; lat: number; lon: number; type?: string }>,
  title: string,
  description: string
): ShareableRoute {
  return {
    title,
    description,
    stops: itinerary.map(item => ({
      id: item.id,
      name: item.name,
      lat: item.lat,
      lon: item.lon,
      type: item.type
    })),
    createdAt: Date.now()
  }
}

/**
 * Save a shared route to Firestore for public browsing
 * Returns the document ID
 */
export async function saveSharedRoute(
  route: ShareableRoute,
  userId: string
): Promise<string> {
  try {
    const sharedRoutesRef = collection(db, 'sharedRoutes')
    const docRef = await addDoc(sharedRoutesRef, {
      title: route.title,
      description: route.description,
      itinerary: route.stops,
      createdAt: route.createdAt,
      userId: userId
    })
    return docRef.id
  } catch (error) {
    console.error('Error saving shared route:', error)
    throw new Error('Failed to save shared route')
  }
}

