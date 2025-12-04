
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCqSnPxDuHd0xCjNYif267SLvQXH8Yunrg",
  authDomain: "ndkha-webrtc.firebaseapp.com",
  databaseURL: "https://ndkha-webrtc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ndkha-webrtc",
  storageBucket: "ndkha-webrtc.firebasestorage.app",
  messagingSenderId: "487730416478",
  appId: "1:487730416478:web:febed5a727e29216c95dcf",
  measurementId: "G-8E237DFCNC"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Authenticate anonymously immediately to ensure DB rules pass
signInAnonymously(auth).catch((error) => {
  console.error("Firebase Auth Error:", error);
});

export { db, auth };
