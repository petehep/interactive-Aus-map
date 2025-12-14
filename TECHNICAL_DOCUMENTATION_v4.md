# Australia Trip Scheduler - Technical Documentation v4.1

**Last Updated:** December 14, 2025  
**Version:** 4.1 - File Attachments, Professional UI Styling, Sidebar UI Polish  
**Repository:** https://github.com/petehep/interactive-Aus-map  
**Live URL:** https://petehep.github.io/interactive-Aus-map/

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [What's New in v4.0](#whats-new-in-v40)
3. [Technology Stack](#technology-stack)
4. [Architecture](#architecture)
5. [File Storage & Attachments](#file-storage--attachments)
6. [Cloud Database (Firestore)](#cloud-database-firestore)
7. [Authentication System](#authentication-system)
8. [Data Synchronization](#data-synchronization)
9. [Component Structure](#component-structure)
10. [UI/UX Enhancements](#uiux-enhancements)
11. [Security & Storage Rules](#security--storage-rules)
12. [API Integrations](#api-integrations)
13. [Testing & Quality Assurance](#testing--quality-assurance)
14. [Performance Optimizations](#performance-optimizations)
15. [Deployment](#deployment)
16. [Development Guide](#development-guide)

---

## Project Overview

**Purpose:** Interactive trip planning application for Australia with real-time cloud synchronization, file attachments, and professional UI.

**Key Features:**
- 📍 Interactive map with 100,000+ Australian locations
- 🛣️ Route planning with real-time driving distances
- ❤️ Cloud-synced favorites across all devices
- ✅ Persistent visited places tracking
- 📎 File attachments (photos, PDFs, docs) for favorites & itinerary stops
- 🏕️ Campsite discovery (free & paid)
- ⛽ Essential services (fuel, dumps, water)
- 🌐 Multi-user authentication
- ☁️ Real-time database synchronization
- 💾 Cloud file storage with secure access
- 📱 Fully responsive design
- ✨ Professional 3D beveled button styling

---

## What's New in v4.0

### File Attachments System
**New:** Upload, view, download, and delete files for favorites and itinerary stops.

#### Key Features
1. **Attachment Support**
   - Photos, PDFs, documents, images
   - Unlimited attachments per location
   - Up to 10MB per file
   - Secure cloud storage

2. **User Experience**
   - Real-time upload progress indicator
   - Image preview modal
   - One-click download
   - Easy deletion

3. **Integration Points**
   - **Favorites** - Attach trip notes, photos, reviews
   - **Itinerary Stops** - Attach directions, permits, parking info
   - Auto-create favorite when uploading from itinerary

4. **Storage Management**
   - Files stored in Firebase Storage
   - Per-user directory structure: `users/{uid}/places/{placeId}/`
   - Automatic file type validation
   - 10MB file size limit per upload

### Professional UI Styling
**Enhanced:** All buttons now feature professional 3D beveled design.

#### Button Improvements
1. **Visual Design**
   - Gradient backgrounds (blue for primary, gray for secondary)
   - 3D beveled borders (lighter top/left, darker bottom/right)
   - Inset shadows for embossed effect
   - Smooth transitions and animations

2. **Interactions**
   - Hover lift effect with enhanced shadows
   - Click press-down tactile feedback
   - Disabled state with reduced opacity
   - Focus ring on inputs

3. **Layout**
   - Improved spacing between buttons (6px horizontal, 4px vertical)
   - Consistent padding and sizing
   - Better visual hierarchy

### Sidebar UI Polish (Dec 14, 2025)
- Right sidebar now uses a pinned header (itinerary title + route duration + 3×3 control grid for fuel/dumps/water, save/load/clear, share/logout).
- Sidebar content (Itinerary list + Favorites) scrolls independently; the map pane stays fixed to avoid whole-page scrolling.
- Control grid columns align for consistent layout across all nine buttons.

### "What's New" Modal
**New:** Welcome modal showcasing v4.0 features for new sessions.

Features:
- Summarizes attachment capabilities
- Links to updated User Manual
- Dismissible with close button
- Professional styling

### Documentation Updates
- User Manual updated with attachment instructions
- New STORAGE_SETUP.md for Firebase Storage configuration
- This technical guide (v4.0) with complete architecture

---

## Technology Stack

### Frontend
- **React 18.3.1** - UI framework with hooks
- **TypeScript 5.6.3** - Type-safe development
- **Vite 5.4.8** - Fast build tooling
- **CSS3** - Advanced styling (gradients, shadows, animations)

### Mapping & Geospatial
- **Leaflet 1.9.4** - Interactive maps
- **React-Leaflet 4.2.1** - React wrapper
- **React-Leaflet-Cluster 2.1.0** - Marker clustering
- **Overpass API** - OSM data queries
- **OSRM** - Open routing machine
- **Nominatim** - Geocoding service

### Backend & Database
- **Firebase 10.14.0**
  - Authentication (Email/Password)
  - Firestore (Cloud Firestore database)
  - Cloud Storage (File storage)
  - Real-time listeners
  - Security rules

### Build & Deployment
- **GitHub Pages** - Static site hosting
- **GitHub Actions** - CI/CD pipeline
- **Node.js 22+** - Runtime environment
- **npm** - Package management

---

## Architecture

### High-Level Data Flow
```
User (Browser)
    ↓
React Components (TypeScript)
    ↓
Firebase SDK
    ├─ Authentication → Auth service
    ├─ Firestore → Real-time database
    └─ Storage → File storage
    ↓
Cloud Backend (Managed by Firebase)
```

### Component Hierarchy
```
App.tsx (Main orchestrator)
├─ MapView (Map + place interactions)
├─ Favorites (Favorites sidebar section)
│  └─ Attachments (File management)
├─ Itinerary (Trip stops list)
│  └─ Attachments (File management)
├─ VisitedPlaces (Modal for visited tracking)
└─ Login (Authentication)
```

### Data Model

#### Firestore Collections
```
/users/{uid}/
  /favorites/{placeId}/
    - id: string
    - name: string
    - lat: number
    - lon: number
    - type: string
    - visited: boolean (optional)
    - visitedAt: timestamp (optional)
    - attachments: Attachment[]
    - createdAt: timestamp
    - updatedAt: timestamp

  /itinerary/{itemId}/
    - id: string
    - name: string
    - lat: number
    - lon: number
    - type: string
    - order: number
    - attachments: Attachment[]
    - startLocation: boolean (optional)
    - addedAt: timestamp

  /visitedPlaces/{placeId}/
    - id: string
    - name: string
    - lat: number
    - lon: number
    - visitedAt: timestamp
```

#### Attachment Object
```typescript
interface Attachment {
  id: string              // UUID
  name: string           // Original filename
  url: string            // Public download URL
  storagePath: string    // users/{uid}/places/{placeId}/{filename}
  type: string           // MIME type (image/jpeg, application/pdf, etc.)
  size: number           // File size in bytes
  uploadedAt: timestamp  // Upload timestamp
}
```

---

## File Storage & Attachments

### Firebase Storage Setup

#### Directory Structure
```
gs://bucket/
└─ users/
   └─ {userId}/
      └─ places/
         ├─ place1/
         │  ├─ photo1.jpg
         │  ├─ photo2.jpg
         │  └─ guide.pdf
         └─ place2/
            └─ notes.txt
```

#### File Type Validation
Allowed MIME types:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`
- Archives: `application/zip`
- Text: `text/plain`

Size limits:
- Per file: 10MB maximum
- User quota: Unlimited (subject to Firebase Blaze plan)

### Attachment Workflow

#### Upload Process
1. User selects file from browser
2. File size & type validated client-side
3. Resumable upload starts with progress callback
4. File uploaded to `users/{uid}/places/{placeId}/{filename}`
5. Attachment metadata saved to Firestore
6. Progress indicator updated in real-time
7. Download URL generated automatically

#### Download Process
1. User clicks attachment in UI
2. For images: Open modal preview
3. For all files: Click to download via URL
4. Browser handles download using authenticated URL

#### Delete Process
1. User clicks delete on attachment
2. File deleted from Storage at storagePath
3. Attachment removed from Firestore array
4. UI updates immediately

### Storage Service

```typescript
// src/services/storageService.ts

export async function uploadAttachment(
  userId: string,
  placeId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<Attachment>

export async function deleteAttachment(
  userId: string,
  placeId: string,
  storagePath: string
): Promise<void>

export async function deleteAllAttachments(
  userId: string,
  placeId: string
): Promise<void>

// Utilities
export function isImageFile(mimeType: string): boolean
export function getFileIcon(mimeType: string): string
export function formatFileSize(bytes: number): string
```

---

## Cloud Database (Firestore)

### Database Structure
Real-time document database with automatic synchronization.

#### Collections
- `users/{uid}/favorites` - Favorite places with attachments
- `users/{uid}/itinerary` - Trip itinerary with attachments
- `users/{uid}/visitedPlaces` - Visited location tracking

#### Real-time Updates
Using Firestore `onSnapshot()` listeners for live data sync:
```typescript
const unsubscribe = onSnapshot(
  collection(db, `users/${user.uid}/favorites`),
  (snapshot) => {
    // Update React state immediately
    setFavorites(snapshot.docs.map(doc => doc.data()))
  }
)
```

#### Data Consistency
- Firestore handles conflict resolution
- Last-write-wins strategy
- Offline support with local caching
- Automatic sync when connection restored

---

## Authentication System

### Firebase Authentication
Email/password authentication with real-time user state.

#### Auth Flow
1. User enters email and password
2. Firebase handles signup/signin
3. Auth state listener detects login
4. User UID available for data queries
5. Sign out clears user context

#### Security
- Passwords hashed by Firebase (bcrypt)
- HTTPS enforced
- Session tokens auto-expire
- User isolation via UID in Firestore paths

---

## Data Synchronization

### Real-time Sync Strategy

#### Favorites & Itinerary
```typescript
useEffect(() => {
  if (!user?.uid) return

  const unsubscribe = subscribeToFavorites(user.uid, (updatedFavorites) => {
    setFavorites(updatedFavorites)
  })

  return () => unsubscribe()
}, [user?.uid])
```

#### Attachments
Attachments sync as part of the parent favorite/itinerary item:
- Upload: Firestore document updated → listener fires → React re-renders
- Delete: Document array updated → listener fires → React re-renders

#### Multi-Device Sync
1. User logs in on Device A
2. User creates favorite on Device B
3. Firestore listener on Device A fires
4. Favorite appears on Device A automatically
5. No manual refresh needed

---

## Component Structure

### App.tsx (Main Component)
- Auth state management
- User context setup
- Handlers for all data mutations:
  - `handleAddPlace()` - Add to itinerary
  - `handleUploadAttachment()` - Upload file
  - `handleDeleteAttachment()` - Remove file
  - `toggleFavorite()` - Star/unstar place
  - `toggleVisited()` - Mark as visited
- Modal state (What's New, Visited Places)
- Route planning
- Start location management

### MapView.tsx
- Leaflet map rendering
- Marker clustering
- Favorite toggle buttons
- Map interactions
- Async error handling

### Favorites.tsx
- Favorites list display
- Attachments integration
- Visited toggle
- Remove favorite button
- Center on map action

### Itinerary.tsx
- Ordered stops list
- Set start button (⭐ indicator)
- Attachments per stop
- Remove from trip action
- Drag-to-reorder (future)

### Attachments.tsx
- File upload input
- Progress indicator
- Image preview modal
- Download links
- Delete buttons
- File icons

### Login.tsx
- Email/password form
- Sign in/Sign up toggle
- Error messaging
- Loading state

### VisitedPlaces.tsx
- Modal for visited locations
- Center on map
- Unvisit action
- Close modal

---

## UI/UX Enhancements

### Professional Button Styling

#### Primary Buttons
```css
.button {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  border: 2px solid #0369a1;
  border-top: 2px solid #06b6d4;
  border-left: 2px solid #06b6d4;
  box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              inset 0 -3px 0 rgba(0, 0, 0, 0.15);
  /* 3D beveled effect with gradients */
}

.button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.5), ...
}

.button:active {
  transform: translateY(-1px);
  /* Inset shadow inverts for pressed effect */
}
```

#### Secondary Buttons
```css
.button.small {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  border: 2px solid #334155;
  border-top: 2px solid #94a3b8;
  border-left: 2px solid #94a3b8;
  /* Same 3D effect, gray palette */
}
```

### Input Styling
```css
.startInput {
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease;
}

.startInput:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1), ...
}
```

### Spacing & Layout
- Button margin: 6px right, 4px bottom
- Consistent padding: 8px vertical, 12px horizontal
- Line height and letter spacing for readability
- Responsive adjustments for mobile

---

## Security & Storage Rules

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // User can only access their own data
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

### Storage Security Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      // Authenticated users can only access their own files
      allow read, write: if request.auth.uid == userId;
      
      // File type validation
      allow write: if request.resource.contentType in [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/zip'
      ];
      
      // File size limit: 10MB
      allow write: if request.resource.size <= 10 * 1024 * 1024;
    }
  }
}
```

---

## API Integrations

### Overpass API
Query OSM data for:
- Campsites (free & paid)
- Fuel stations
- RV dump points
- Water filling points

### OSRM (Open Routing Machine)
Calculate routes and distances:
- Multiple waypoint routing
- Duration and distance matrices
- Alternative routes

### Nominatim (Geocoding)
Forward/reverse geocoding:
- Address → coordinates
- Coordinates → address

---

## Testing & Quality Assurance

### Test Suite (93 tests)
Automated tests covering:
- Project structure validation
- Firestore integration
- Authentication system
- Component implementation
- Configuration files
- Security practices
- Documentation
- Git version control
- Package dependencies
- Code quality

### Build Verification
- TypeScript compilation (`tsc -b`)
- Vite production build
- Bundle size monitoring
- No errors or critical warnings

### Manual Testing Checklist
- [ ] Login/signup flow
- [ ] Add favorites
- [ ] Toggle visited
- [ ] Create itinerary
- [ ] Upload attachments
- [ ] Download attachments
- [ ] Delete attachments
- [ ] Route planning
- [ ] Multi-device sync
- [ ] Mobile responsiveness

---

## Performance Optimizations

### Code Splitting
- Lazy-loaded components where possible
- Separate bundles for large libraries

### Caching
- Firestore offline persistence
- Browser local storage for transient data
- Service Worker ready (future enhancement)

### Image Optimization
- Leaflet marker clustering reduces DOM nodes
- Image previews use modal to avoid multiple loads

### Network
- Real-time listeners only for active subscriptions
- Unsubscribe on component unmount
- Batched writes to Firestore

---

## Deployment

### GitHub Pages
Static site hosting via GitHub Actions.

#### Build Process
1. Push to main branch
2. GitHub Actions triggered
3. Install dependencies (`npm install`)
4. Build project (`npm run build`)
5. Generate dist/ folder
6. Deploy to gh-pages branch
7. Live at https://petehep.github.io/interactive-Aus-map/

#### Environment Variables
```bash
# .env file (not committed)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Firebase Configuration
- Blaze plan (pay-as-you-go)
- Free tier included: 1GB Storage, 50k reads, 20k writes daily
- Monitoring and alerts configured

---

## Development Guide

### Local Setup
```bash
# Clone repo
git clone https://github.com/petehep/interactive-Aus-map.git
cd aus-trip-scheduler

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173/interactive-Aus-map/
```

### Build for Production
```bash
npm run build

# Output in dist/ folder
```

### Project Structure
```
aus-trip-scheduler/
├─ src/
│  ├─ components/
│  │  ├─ App.tsx
│  │  ├─ MapView.tsx
│  │  ├─ Favorites.tsx
│  │  ├─ Itinerary.tsx
│  │  ├─ Attachments.tsx
│  │  ├─ VisitedPlaces.tsx
│  │  └─ Login.tsx
│  ├─ services/
│  │  ├─ firestoreService.ts
│  │  └─ storageService.ts
│  ├─ firebase.ts
│  ├─ index.css
│  └─ main.tsx
├─ public/
├─ .github/workflows/
│  └─ deploy.yml
├─ firestore.rules
├─ storage.rules
├─ vite.config.ts
├─ tsconfig.json
└─ package.json
```

### Key Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build locally
node test-suite.mjs  # Run test suite
```

### Debugging
- React DevTools extension recommended
- Firebase emulator available for local testing
- Console logs throughout data flow
- Network tab for API inspection

---

## Version History

### v4.0 (Current)
- File attachments (photos, PDFs, docs)
- Professional 3D button styling
- "What's New" modal
- Updated documentation

### v3.0
- Cloud Firestore integration
- Real-time synchronization
- Multi-device support
- Enhanced security

### v2.0
- Route planning integration
- Multiple service markers
- Advanced filtering

### v1.0
- Basic map and favorites
- Local storage persistence

---

## Support & Contact

**Issues:** GitHub Issues https://github.com/petehep/interactive-Aus-map/issues  
**Discussions:** GitHub Discussions https://github.com/petehep/interactive-Aus-map/discussions

---

*Documentation last updated: December 12, 2025*  
*Maintained by: Peter Hepburn*
