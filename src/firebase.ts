import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWdcEBNoobKZoNRQmWlooCJNCBfb_M8-U",
  authDomain: "lapmap-cc281.firebaseapp.com",
  projectId: "lapmap-cc281",
  storageBucket: "lapmap-cc281.firebasestorage.app",
  messagingSenderId: "102969245328",
  appId: "1:102969245328:web:1b3478a17782fc6f792215",
  measurementId: "G-4R5VTXQ9X4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
