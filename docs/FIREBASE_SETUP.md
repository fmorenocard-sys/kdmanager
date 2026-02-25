# Firebase Setup Guide

Follow these steps to enable Google Authentication for Kingdom Manager.

## 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name it `KD 97 Manager` (or similar).
4. Disable Google Analytics (optional, not needed properly right now).
5. Click **"Create Project"**.

## 2. Register Your App
1. On the project overview page, click the **Web icon (`</>`)**.
2. App nickname: `KD Manager`.
3. Checks "Also set up **Firebase Hosting**" -> NO (we use GitHub Pages).
4. Click **"Register app"**.
5. **Copy the `firebaseConfig` object** shown on the screen (you will need the values inside it).

## 3. Enable Authentication
1. On the left sidebar, click **Build > Authentication**.
2. Click **"Get started"**.
3. Select **"Google"** from the Sign-in method list.
4. Click **"Enable"**.
5. Select a support email.
6. Click **"Save"**.

## 4. Configure Environment Variables
1. In your project root, create a file named `.env` (copy from `.env.example`).
2. Fill in the values from the `firebaseConfig` object you copied in Step 2:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## 5. Important: Authorized Domains
Since you are deploying to GitHub Pages, you must tell Firebase it's safe.
1. Go to **Authentication > Settings > Authorized domains**.
2. Click **"Add domain"**.
3. Add your GitHub Pages domain: `fmorenocard-sys.github.io`.
