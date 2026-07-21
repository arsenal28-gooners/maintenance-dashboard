import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  // PASTE CONFIG DARI STEP 4 DI SINI
    apiKey: "AIzaSyBLsTI9jRyn2D9vJlAMK2uJKFJKCHzI9Go",
    authDomain: "maintenance-dashboard-12220.firebaseapp.com",
    databaseURL: "https://maintenance-dashboard-12220-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "maintenance-dashboard-12220",
    storageBucket: "maintenance-dashboard-12220.firebasestorage.app",
    messagingSenderId: "485503196988",
    appId: "1:485503196988:web:a222070589c77a2d750839",
    measurementId: "G-4DHXE85TN1"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);

// Auto login anonymous
signInAnonymously(auth).catch((error) => {
  console.log("Error signing in:", error);
});