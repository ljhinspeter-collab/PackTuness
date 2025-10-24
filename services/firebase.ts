import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// IMPORTANT: Replace the placeholder values below with your actual Firebase project configuration.
// You can find these details in your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyBQlABA2FS6p62uNGzOuR6at1eVEpXDmNU",
  authDomain: "packtune-b04fa.firebaseapp.com",
  projectId: "packtune-b04fa",
  storageBucket: "packtune-b04fa.appspot.com",
  messagingSenderId: "304199734263",
  appId: "1:304199734263:web:c7a67c55f57d184dca14f2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);