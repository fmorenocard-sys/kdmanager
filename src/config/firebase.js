import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

// TODO: User needs to provide these values in .env or replacing these placeholders
// Ideally these should be process.env.VITE_FIREBASE_API_KEY etc.
// For now, we will use placeholders and ask user to fill them.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { connectAuthEmulator } from "firebase/auth";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Initialize Analytics
export const auth = getAuth(app);
export const db = getFirestore(app, "kdmanagerdb");
export const functions = getFunctions(app);

// Use emulator for local dev if environment variable is set
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    console.log("Using Firebase Emulators");
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, '127.0.0.1', 8082);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
} else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Legacy local dev without full emulators (just functions)
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider(); // Added GitHub as alternative
