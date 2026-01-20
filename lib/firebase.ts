import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB36bGuZbDhjTrPXedhRER8uaPz5R3oyOQ",
  authDomain: "crclogin.firebaseapp.com",
  projectId: "crclogin",
  storageBucket: "crclogin.firebasestorage.app",
  messagingSenderId: "336656600282",
  appId: "1:336656600282:web:3c3b952f08499f2162e9e3",
};

// Check if Firebase is properly configured
const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Initialize Firebase only if configured (singleton pattern)
if (isFirebaseConfigured) {
  try {
    // Check if app already exists
    if (getApps().length > 0) {
      app = getApp();
      // Use getFirestore for existing apps to avoid re-initialization error
      db = getFirestore(app);
    } else {
      // Initialize new app
      app = initializeApp(firebaseConfig);
      // Use long polling to avoid WebChannel/SID issues in preview environments
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false,
      });
    }
    auth = getAuth(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

export { app, auth, db, storage, isFirebaseConfigured };
