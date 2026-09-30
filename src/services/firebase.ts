import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBjRfirLy7Rcstm5yAA36EHzlrIxIgLS04",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gestao-projetos-ea44c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gestao-projetos-ea44c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gestao-projetos-ea44c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "947089271740",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:947089271740:web:97823942e9df0e58cf59b9"
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
