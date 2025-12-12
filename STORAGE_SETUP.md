# Firebase Storage Setup for v4.0 - Attachments Feature

## Overview
Version 4.0 adds the ability to attach files (photos, PDFs, booking confirmations, maps) to favorite places. This requires Firebase Storage to be configured.

## Setup Steps

### 1. Enable Firebase Storage in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **interactive-Aus-map**
3. In the left sidebar, click **Build** → **Storage**
4. Click **Get Started**
5. Choose **Start in production mode** (we'll apply custom rules next)
6. Select a location (choose one close to Australia, like `australia-southeast1`)
7. Click **Done**

### 2. Deploy Storage Security Rules

The security rules are defined in `storage.rules` file in the project root.

**Option A: Using Firebase CLI (Recommended)**
```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Storage (if not done already)
firebase init storage

# Deploy the rules
firebase deploy --only storage
```

**Option B: Manually in Firebase Console**
1. Go to Firebase Console → Storage → Rules tab
2. Copy the contents of `storage.rules` file
3. Paste into the rules editor
4. Click **Publish**

### 3. Verify Storage Configuration

Check that your `.env` file has the correct storage bucket:
```
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

This should already be set from your initial Firebase configuration.

### 4. Test the Setup

1. Start the dev server: `npm run dev`
2. Login to the app
3. Add a place to favorites
4. Click **+ Add File** in the attachments section
5. Upload a test file (image or PDF)
6. Verify the file appears in:
   - The app UI
   - Firebase Console → Storage → Files → users/{your-uid}/places/{place-id}/

## Security Rules Explanation

The `storage.rules` file ensures:

✅ **Authentication Required**: Only logged-in users can access storage
✅ **User Isolation**: Users can only access their own files (users/{userId}/...)
✅ **File Size Limit**: Maximum 10MB per file (prevents abuse)
✅ **File Type Validation**: Only allows:
   - Images (image/*)
   - PDFs (application/pdf)
   - Documents (Word, Excel, PowerPoint)
   - Plain text files
   
❌ **Prevents**: Unauthorized access, executable files, oversized files

## Storage Usage & Costs

**Free Tier (Spark Plan):**
- 5 GB stored
- 1 GB/day downloads
- 20,000 uploads/day
- 50,000 downloads/day

**For typical use:**
- ~500-1000 photos at 5-10MB each
- ~2500 PDF documents at 2MB each
- Personal/small group trip planning stays within free tier

**Monitoring Usage:**
Firebase Console → Storage → Usage tab

## File Structure

Files are organized as:
```
users/
  {userId}/
    places/
      {placeId}/
        {timestamp}_{filename}
```

Example:
```
users/abc123/places/place_sydney/1702000000000_booking_confirmation.pdf
```

## Features

- **Upload Files**: Click "+ Add File" button in any favorite place
- **View Images**: Click 👁️ View button for image preview
- **Download**: Click ⬇️ Download button to save locally
- **Delete**: Click 🗑️ button to remove attachment
- **File Info**: See file name, size, and upload date
- **Auto-Cleanup**: Deleting a favorite automatically deletes all its attachments

## Supported File Types

- 🖼️ **Images**: JPG, PNG, GIF, WebP, etc.
- 📄 **PDFs**: Booking confirmations, maps, brochures
- 📝 **Documents**: Word, Excel, PowerPoint
- 📎 **Text**: Plain text files

## Troubleshooting

**Upload fails with "permission denied":**
- Ensure you're logged in
- Check storage rules are deployed correctly
- Verify storage is enabled in Firebase Console

**File too large error:**
- Maximum file size is 10MB
- Compress images before uploading
- Split large documents into smaller files

**Can't see uploaded files:**
- Check Firebase Console → Storage to verify upload
- Clear browser cache and reload
- Check browser console for errors

## Development vs Production

- **Development**: Uses Firebase Storage emulator (optional)
- **Production**: Uses Firebase Cloud Storage
- Both use the same security rules

## Migration Notes

- Existing v3.0 users: No migration needed
- Attachments are optional - old favorites work without them
- Storage bucket is already configured in your Firebase project
- No changes to Firestore data structure (attachments stored as array in Place documents)

## Next Steps After Setup

1. Test uploading different file types
2. Verify security rules work (try accessing another user's files - should fail)
3. Monitor storage usage in Firebase Console
4. Update user manual with attachment instructions
5. Consider adding file compression for images
6. Add progress bars for large uploads (future enhancement)
