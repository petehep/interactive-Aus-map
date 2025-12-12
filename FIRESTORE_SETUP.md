# Firestore Database Migration - Setup Instructions

## 🎉 Your app now uses cloud database!

### What Changed:
- ✅ Favorites are now synced to Firestore
- ✅ Visited places are now synced to Firestore
- ✅ Itineraries are now synced to Firestore
- ✅ Automatic migration from localStorage
- ✅ Real-time syncing across all your devices
- ✅ Data is backed up in the cloud

### Setup Required (One-Time):

#### 1. Deploy Firestore Security Rules

Go to Firebase Console:
https://console.firebase.google.com/project/lapmap-cc281/firestore

1. Click on **"Firestore Database"** in the left menu
2. If you see "Get Started", click it to create the database
   - Choose "Start in production mode"
   - Select a location (e.g., "australia-southeast1" for Australia)
3. Once created, click on **"Rules"** tab
4. Replace the existing rules with the content from `firestore.rules` file
5. Click **"Publish"**

The rules ensure that:
- Users can only access their own data
- All data is private and secure
- Only authenticated users can read/write

#### 2. How the Migration Works

When you first log in after this update:
1. The app checks if you have localStorage data
2. If yes, it automatically copies all your data to Firestore
3. After migration, the app uses Firestore for all operations
4. Your data is now accessible from any device!

#### 3. Testing

1. Log in to the app
2. Check the browser console - you should see migration messages
3. Add a favorite, refresh the page - it should still be there
4. Try logging in from a different device/browser - your data will be there!

### Data Structure in Firestore

```
users/
  {userId}/
    favorites/
      {placeId}/
        - id, name, type, lat, lon, population
        - visited, visitedAt
        - updatedAt
    
    visited/
      {placeId}/
        - id, name, type, lat, lon
        - visitedAt
        - updatedAt
    
    itineraries/
      current/
        - items[]
        - updatedAt
```

### Features:

**Real-time Syncing:**
- Changes appear instantly across all devices
- No manual refresh needed
- Always up-to-date

**Data Persistence:**
- Never lose your data again
- Survives browser cache clears
- Backed up in the cloud

**Multi-Device:**
- Access from phone, tablet, computer
- Same account, same data everywhere
- Seamless experience

### Troubleshooting

**Q: My data isn't syncing**
- Check that you deployed the Firestore rules
- Make sure Firestore database is created in Firebase Console
- Check browser console for error messages

**Q: I lost my data**
- The first login migrates your localStorage data
- If you cleared localStorage before logging in, the migration won't find anything
- Old data should still be in Firestore if you've logged in before

**Q: Can I still use the app offline?**
- You need internet to load the map and sync data
- Firestore has offline caching built-in (automatic)

### Next Steps

Once Firestore is set up, you can:
- Delete the old localStorage data (the app will keep using Firestore)
- Log in from multiple devices
- Never worry about losing your trip data again!

---

*Last Updated: December 12, 2025*
