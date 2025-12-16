// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// TODO: Paste your firebaseConfig here (Same as previous files)
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
  

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 1. Check if User is Logged In
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in, let's get their name
        console.log("Current User ID:", user.uid);
        
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                // Update the HTML element with their real name
                document.getElementById('welcomeName').textContent = "Hi, " + userData.fullname;
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }

    } else {
        // No user is signed in? Kick them back to login page
        window.location.href = "index.html";
    }
});

// 2. Handle Logout
const logoutBtn = document.getElementById('logoutBtn');

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        // Sign-out successful.
        alert("You have logged out.");
        window.location.href = "index.html";
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
});