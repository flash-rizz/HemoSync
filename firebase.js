// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Your new Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDmmZr7FuJV39cK_9WqabqS26doV04USgE",
  authDomain: "hemosync-765c9.firebaseapp.com",
  databaseURL: "https://hemosync-765c9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hemosync-765c9",
  storageBucket: "hemosync-765c9.firebasestorage.app",
  messagingSenderId: "749126382362",
  appId: "1:749126382362:web:8852a1e895edbbea3072a3",
  measurementId: "G-JP1Y2S1LN5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exports for other modules
export const db = getFirestore(app);
export const auth = getAuth(app);
