import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
    apiKey: 'AIzaSyCqgqPEipkdQJRNQX7b0f6-BKbHOP7G3W4',
    authDomain: 'kd-97-manager.firebaseapp.com',
    projectId: 'kd-97-manager',
    storageBucket: 'kd-97-manager.firebasestorage.app',
    messagingSenderId: '646732034888',
    appId: '1:646732034888:web:972d95082405a774c3397d',
    measurementId: 'G-7944Y45PM2'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const data = JSON.parse(fs.readFileSync('public/data/players.json'));
    console.log('Writing ' + data.length + ' players to Firestore...');
    await setDoc(doc(db, 'static_data', 'players'), { list: data });
    console.log('Done!');
    process.exit(0);
}

run();