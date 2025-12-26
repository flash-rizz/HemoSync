// Import the functions we need from Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// TODO: Paste your firebaseConfig here
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
const auth = getAuth(app);
const db = getFirestore(app);

// Get HTML elements
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMessage');

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop page reload

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    errorMsg.textContent = "Logging in...";

    try {
        // 1. Check Credentials (Authentication)
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Get User Info from Database (Firestore)
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            const role = userData.role; // This will be "donor", "organiser", etc.

            // Success Message
            alert("Login Success!\nUser: " + userData.fullname + "\nRole: " + role);

            // 3. REDIRECT LOGIC (This is the part that was missing)
            if (role === 'donor') {
                window.location.href = "donor_home.html";
            } 
            else if (role === 'organiser') {  
                // <--- This is the new line that fixes your problem
                window.location.href = "organiser_dashboard.html";
            } 
            else if (role === 'medical') {
                alert("Hospital Dashboard coming soon!");
            }
            else if (role === 'admin') {
                window.location.href = "admin_dashboard.html";
            } 
            else {
                alert("Error: Role '" + role + "' is not recognized.");
            }

        } else {
            errorMsg.textContent = "Error: User data not found in database.";
        }

    } catch (error) {
        console.error("Login Error:", error.code);
        
        if(error.code === 'auth/user-not-found') {
            errorMsg.textContent = "Account not found. Please Sign Up.";
        } else if (error.code === 'auth/wrong-password') {
            errorMsg.textContent = "Incorrect password.";
        } else {
            errorMsg.textContent = "Login failed: " + error.message;
        }
    }
});