// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2MMH56_72oL0gTJ4fhPU9m0xtMI-O67M",
  authDomain: "focusflow-71a55.firebaseapp.com",
  projectId: "focusflow-71a55",
  storageBucket: "focusflow-71a55.firebasestorage.app",
  messagingSenderId: "979654187250",
  appId: "1:979654187250:web:b747752305909efa41586b",
  measurementId: "G-MLQWTGX9S7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;