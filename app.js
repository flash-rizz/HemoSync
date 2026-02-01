// Import the functions we need from Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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

    // Visual feedback while loading
    errorMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying credentials...';
    errorMsg.style.color = "#666";

    try {
        // 1. Check Credentials (Authentication)
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Get User Info from Database (Firestore)
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            
            // ---------------------------------------------------------
            // SUSPENSION CHECK LOGIC
            // ---------------------------------------------------------
            if (userData.status === "Suspended") {
                // IMPORTANT: Sign out immediately so they don't stay logged in
                await signOut(auth);

                // Show detailed error message with animation
                errorMsg.style.color = "#e74c3c"; // Red color
                errorMsg.innerHTML = `
                    <div style="animation: shake 0.5s;">
                        <strong><i class="fa-solid fa-ban"></i> Access Denied</strong><br>
                        <span style="font-size: 11px;">Your account has been suspended.</span><br>
                        <span style="font-size: 11px; color: #555; background: #ffe6e6; padding: 2px 5px; border-radius: 4px;">
                            Reason: ${userData.suspensionReason || "Violation of terms"}
                        </span>
                    </div>
                `;
                return; // STOP EXECUTION HERE (Do not redirect)
            }
            // ---------------------------------------------------------

            const role = userData.role; 

            // Success Message
            errorMsg.style.color = "green";
            errorMsg.textContent = "Login successful! Redirecting...";

            // 3. REDIRECT LOGIC 
            setTimeout(() => {
                if (role === 'donor') {
                    window.location.href = "donor_home.html";
                } 
                else if (role === 'organiser') {  
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
            }, 800); // Small delay for UX

        } else {
            errorMsg.textContent = "Error: User data not found in database.";
            await signOut(auth); // Sign out if data is corrupt/missing
        }

    } catch (error) {
        console.error("Login Error:", error.code);
        
        errorMsg.style.color = "red";
        if(error.code === 'auth/user-not-found') {
            errorMsg.textContent = "Account not found. Please Sign Up.";
        } else if (error.code === 'auth/wrong-password') {
            errorMsg.textContent = "Incorrect password.";
        } else if (error.code === 'auth/too-many-requests') {
             errorMsg.textContent = "Too many failed attempts. Try again later.";
        } else {
            errorMsg.textContent = "Login failed: " + error.message;
        }
    }
});

// Add shake animation style dynamically
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}`;

document.head.appendChild(styleSheet);
