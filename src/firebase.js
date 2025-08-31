import { initializeApp } from 'firebase/app';
// import { getAuth } from 'firebase/auth';  // Not needed - using custom auth
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
// import { getStorage } from 'firebase/storage';  // Not needed - using Cloudinary

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXEPP1_8-xAjkbPlnHyzvxOFv1DSbbCCQ",
  authDomain: "san-diego-rescue-mission.firebaseapp.com",
  projectId: "san-diego-rescue-mission",
  storageBucket: "san-diego-rescue-mission.firebasestorage.app",
  messagingSenderId: "1045527529932",
  appId: "1:1045527529932:web:4f1dd61e52c82ee55c7569",
  measurementId: "G-KGHGB998P8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Functions and get a reference to the service
export const functions = getFunctions(app);

// Firebase Auth and Storage are not used - we use custom auth and Cloudinary
// export const auth = getAuth(app);
// export const storage = getStorage(app);

export default app;