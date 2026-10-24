// client/src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const rawAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'bytexl-a1581';
const normalizedAuthDomain = (!rawAuthDomain || rawAuthDomain.includes(':')) 
  ? `${projectId}.firebaseapp.com` 
  : rawAuthDomain;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: normalizedAuthDomain,
  projectId: projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase (Singleton pattern to safely handle HMR re-evaluations)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Export Auth services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Force Google to show the account picker every time
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
