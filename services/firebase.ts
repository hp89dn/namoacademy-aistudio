
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// @ts-ignore
import { getFirestore } from "firebase/firestore";

// Replace these with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuMYXiKkOYHbgPtHIRWSZC6nObPo0yNE4",
  authDomain: "nam-o-academy.firebaseapp.com",
  projectId: "nam-o-academy",
  storageBucket: "nam-o-academy.firebasestorage.app",
  messagingSenderId: "550354517686",
  appId: "1:550354517686:web:7589e563fc9711a7b67017",
  measurementId: "G-5BRSVS844X"
};

// Initialize Firebase - check if apps already exist to avoid multiple initializations
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Correctly export auth and db using modular functions
export const auth = getAuth(app);
export const db = getFirestore(app);
