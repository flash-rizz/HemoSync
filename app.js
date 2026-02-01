import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
// NEW: Added 'setPersistence' and 'browserSessionPersistence' to the imports
import { getAuth, signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// YOUR CONFIG
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

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMessage');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. VISUAL FEEDBACK
    errorMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying...';
    errorMsg.style.color = "#666";
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        console.log("Step 1: Setting Persistence...");
        // 2. FIX TAB ISSUE: Isolate this session
        await setPersistence(auth, browserSessionPersistence);

        console.log("Step 2: Authenticating...");
        // 3. LOGIN
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("Step 3: Checking Database for User:", user.uid);
        // 4. CHECK DB
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            
            // 5. SUSPENSION CHECK
            if (userData.status === "Suspended") {
                console.log("User is suspended!");
                await signOut(auth); // Log them out immediately
                
                errorMsg.style.color = "#e74c3c";
                errorMsg.innerHTML = `
                    <div style="animation: shake 0.5s;">
                        <strong><i class="fa-solid fa-ban"></i> Access Denied</strong><br>
                        <span style="font-size: 11px;">Account Suspended: ${userData.suspensionReason || "Violation of terms"}</span>
                    </div>`;
                return;
            }

            // 6. SUCCESS
            const role = userData.role;
            errorMsg.style.color = "green";
            errorMsg.textContent = "Login Success! Redirecting...";
            
            setTimeout(() => {
                if (role === 'donor') window.location.href = "donor_home.html";
                else if (role === 'organiser') window.location.href = "organiser_dashboard.html";
                else if (role === 'medical') alert("Hospital Dashboard coming soon!");
                else if (role === 'admin') window.location.href = "admin_dashboard.html";
                else alert("Unknown Role: " + role);
            }, 800);

        } else {
            console.error("User in Auth but missing in Firestore");
            errorMsg.textContent = "Error: Profile not found.";
            await signOut(auth);
        }

    } catch (error) {
        console.error("FULL ERROR:", error); // Check Console (F12) if this happens
        
        errorMsg.style.color = "red";
        if(error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMsg.textContent = "Invalid email or password.";
        } else if (error.code === 'auth/too-many-requests') {
            errorMsg.textContent = "Too many attempts. Please wait.";
        } else {
            errorMsg.textContent = "Error: " + error.message;
        }
    }
});

// Add the shake animation for the suspension alert
const styleSheet = document.createElement("style");
styleSheet.innerText = `@keyframes shake { 0% { transform: translateX(0); } 25% { transform: translateX(-5px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-5px); } 100% { transform: translateX(0); } }`;
document.head.appendChild(styleSheet);
