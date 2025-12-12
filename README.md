# 🚐 Australia Trip Scheduler

An interactive trip planning application for exploring Australia with real-time cloud synchronization across devices.

**Live Demo:** https://petehep.github.io/interactive-Aus-map/  
**Repository:** https://github.com/petehep/interactive-Aus-map

---

## ✨ Features

- 📍 **Interactive Map** - 100,000+ Australian locations with zoom-based filtering
- 🛣️ **Route Planning** - Real-time driving distances and durations
- ❤️ **Cloud Favorites** - Sync across all devices instantly
- ✅ **Visited Tracking** - Remember where you've been
- 🏕️ **Campsite Discovery** - Free and paid campsite locator
- ⛽ **Essential Services** - Fuel, dumps, water points
- ☁️ **Real-time Sync** - Changes appear instantly on all devices
- 🔐 **Secure** - Encrypted cloud storage with Firestore
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- 🌍 **Open Data** - Powered by OpenStreetMap and community

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Firebase account (free tier works)
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/petehep/interactive-Aus-map.git
cd interactive-Aus-map

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase credentials
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:5173/interactive-Aus-map/
```

### Production Build

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

---

## 🔧 Configuration

### Firebase Setup

1. Create a free Firebase project at https://console.firebase.google.com/
2. Enable **Authentication** (Email/Password)
3. Create a **Firestore Database** in production mode
4. Copy your project credentials to `.env` file:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... other credentials
```

5. **Important:** Deploy Firestore Security Rules from `firestore.rules` file

### Security Rules

Deploy the included security rules to protect user data:

1. Go to Firebase Console → Firestore → Rules
2. Copy content from `firestore.rules`
3. Click "Publish"

These rules ensure:
- ✅ Users can only access their own data
- ✅ Authentication required for all operations
- ✅ Real-time synchronization works securely

---

## 📚 Documentation

- **[TECHNICAL_DOCUMENTATION_v3.md](TECHNICAL_DOCUMENTATION_v3.md)** - Complete architecture, APIs, and implementation details
- **[FIRESTORE_SETUP.md](FIRESTORE_SETUP.md)** - Step-by-step Firebase configuration guide
- **[SESSION_SUMMARY_v3.0.md](SESSION_SUMMARY_v3.0.md)** - Development history and features added

---

## 🗂️ Project Structure

```
src/
├── App.tsx                          # Main application component
├── firebase.ts                      # Firebase configuration
├── index.css                        # Global styles
├── main.tsx                         # React entry point
│
├── components/
│   ├── MapView.tsx                 # Interactive Leaflet map
│   ├── Login.tsx                   # Authentication UI
│   ├── Favorites.tsx               # Favorites list
│   ├── Itinerary.tsx               # Trip planning
│   └── VisitedPlaces.tsx           # Visited locations tracker
│
└── services/
    └── firestoreService.ts         # Cloud database operations
```

---

## 🔄 How It Works

### Data Flow

```
User Action → Component → Firestore Service → Cloud Database
     ↓
Real-time Listener → Update State → Re-render UI
```

### Multi-Device Synchronization

1. Log in on multiple devices with same account
2. Add a favorite on Device A
3. Appears instantly on Device B
4. Changes persist in cloud backup

### Features

- **Favorites** - Places you want to visit
- **Visited Places** - Locations you've been to
- **Itinerary** - Current trip route with distances

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Leaflet** - Interactive mapping
- **Vite** - Fast build tooling

### Backend & Database
- **Firebase Auth** - User authentication
- **Firestore** - Real-time cloud database
- **Security Rules** - Data access control

### APIs
- **Overpass API** - OpenStreetMap data
- **OSRM** - Routing calculations
- **Nominatim** - Geocoding

### Hosting
- **GitHub Pages** - Static hosting
- **GitHub Actions** - CI/CD pipeline

---

## 🧪 Testing

Run the comprehensive test suite:

```bash
node test-suite.mjs
```

Tests cover:
- ✅ Project structure and files
- ✅ Firestore integration
- ✅ Authentication system
- ✅ Component implementation
- ✅ Configuration files
- ✅ Security practices
- ✅ Documentation
- ✅ Dependencies

---

## 🐛 Troubleshooting

### Favorites not saving
- Verify you're logged in
- Check browser console for errors
- Ensure Firestore rules are published in Firebase Console

### Map not showing data
- Zoom in closer (places load progressively)
- Check internet connection
- Try refreshing the page

### Can't sign in
- Verify email address is correct
- Check password (6+ characters)
- Ensure Firebase Email/Password auth is enabled

### Data not syncing between devices
- Use same account on both devices
- Both devices need internet connection
- Wait a few seconds for Firestore sync

---

## 📈 Performance

Optimizations implemented:
- **Marker Clustering** - Efficient with large datasets
- **Zoom-based Loading** - Progressive data fetching
- **Real-time Subscriptions** - Only listen when needed
- **Debouncing** - 1000ms for map interactions
- **Error Recovery** - Multiple API endpoints

---

## 🚀 Deployment

The application automatically deploys to GitHub Pages when you push to `main` branch.

**Current Deployment:**
- URL: https://petehep.github.io/interactive-Aus-map/
- Method: GitHub Actions
- Status: Auto-deploy on push

---

## 📝 License

This project uses open-source data and libraries. See individual dependencies for license information.

---

## 🤝 Contributing

Found a bug or have a feature idea? 

1. Create an issue on GitHub
2. Fork the repository
3. Create a feature branch
4. Submit a pull request

---

## 📞 Support

**Issues:** https://github.com/petehep/interactive-Aus-map/issues  
**Discussions:** https://github.com/petehep/interactive-Aus-map/discussions

---

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Leaflet Documentation](https://leafletjs.com)
- [TypeScript Documentation](https://www.typescriptlang.org)

---

## 🗺️ Roadmap

- [ ] Offline map caching
- [ ] Drag-to-reorder itinerary
- [ ] Distance and fuel calculations
- [ ] Photo uploads
- [ ] Trip sharing with other users
- [ ] Advanced filtering options
- [ ] Expense tracking
- [ ] Mobile native app

---

Made with ❤️ for Australian road trips  
*Australia Trip Scheduler - Making journey planning easy.* 🚐✨
