import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Extract the Firebase config from src/config/firebase.js automatically
// Wait, I can just use the project files manually or rely on `dotenv`? We aren't in a node env with import maps, but we have `package.json` with "type": "module"?
// Let's check if we can run a simple node script that parses the Firebase config from the env file.
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const querySnapshot = await getDocs(collection(db, "war_availabilities"));
    const docs = querySnapshot.docs.map(doc => doc.data());
    // Find the docs containing Siege marches
    const siegeDocs = docs.filter(d => d.marches && d.marches.some(m => m.type === 'Siege'));
    console.log("Docs with Siege marches:", JSON.stringify(siegeDocs, null, 2));

    // Also print the latest 2 docs generally to see
    console.log("\nLatest 2 declarations entirely:");
    // Sort by updatedAt if available, else just top 2
    const sorted = docs.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    console.log(JSON.stringify(sorted.slice(0, 2), null, 2));
}

run().catch(console.error);
