import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Firebase configuration - Only Firestore and Functions are used
const firebaseConfig = {
  apiKey: "AIzaSyBXEPP1_8-xAjkbPlnHyzvxOFv1DSbbCCQ",
  projectId: "san-diego-rescue-mission",
  appId: "1:1045527529932:web:4f1dd61e52c82ee55c7569"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize only the services we use
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;