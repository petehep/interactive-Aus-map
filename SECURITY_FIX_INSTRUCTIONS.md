# SECURITY FIX - ACTION REQUIRED

## ⚠️ Firebase Keys Exposed - Follow These Steps:

### 1. Add Secrets to GitHub (DO THIS FIRST!)

Go to: https://github.com/petehep/interactive-Aus-map/settings/secrets/actions

Click **"New repository secret"** and add each of these:

- Name: `VITE_FIREBASE_API_KEY`
  Value: `AIzaSyDWdcEBNoobKZoNRQmWlooCJNCBfb_M8-U`

- Name: `VITE_FIREBASE_AUTH_DOMAIN`
  Value: `lapmap-cc281.firebaseapp.com`

- Name: `VITE_FIREBASE_PROJECT_ID`
  Value: `lapmap-cc281`

- Name: `VITE_FIREBASE_STORAGE_BUCKET`
  Value: `lapmap-cc281.firebasestorage.app`

- Name: `VITE_FIREBASE_MESSAGING_SENDER_ID`
  Value: `102969245328`

- Name: `VITE_FIREBASE_APP_ID`
  Value: `1:102969245328:web:1b3478a17782fc6f792215`

- Name: `VITE_FIREBASE_MEASUREMENT_ID`
  Value: `G-4R5VTXQ9X4`

### 2. After Adding Secrets, Commit and Push

The code has been updated to use environment variables instead of hardcoded keys.

### 3. Optional but Recommended: Rotate Firebase Keys

Go to Firebase Console: https://console.firebase.google.com/project/lapmap-cc281/settings/general/

Consider regenerating your API keys for extra security (since they were public).

---

**What Changed:**
- ✅ Firebase keys moved to `.env` file (not committed to Git)
- ✅ `src/firebase.ts` now uses environment variables
- ✅ GitHub Actions workflow updated to use secrets
- ✅ `.gitignore` already prevents `.env` from being committed

**Files Modified:**
- `src/firebase.ts` - Uses `import.meta.env.VITE_*` instead of hardcoded values
- `.github/workflows/deploy.yml` - Injects secrets during build
- `.env` - Local environment variables (DO NOT COMMIT THIS!)
