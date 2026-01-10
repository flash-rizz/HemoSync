// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Configuration
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

// Global variable to store user data after fetching it
let currentUserData = null;

// 1. Check if User is Logged In & Fetch Data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Current User ID:", user.uid);
        
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Store data globally so we can check eligibility later without re-fetching
                currentUserData = docSnap.data();

                // Update the HTML element with their real name
                const displayName = currentUserData.fullname || "Donor"; 
                document.getElementById('welcomeName').textContent = "Hi, " + displayName;
            } else {
                console.log("No such document!");
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

if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            alert("You have logged out.");
            window.location.href = "index.html";
        }).catch((error) => {
            console.error("Logout Error:", error);
        });
    });
}

// 3. Handle Donor Eligibility (Attached to Window for HTML access)
window.checkDonationEligibility = function() {
    
    // Safety check: Has data loaded yet?
    if (!currentUserData) {
        alert("Still loading your profile data. Please wait a moment...");
        return;
    }

    // A. Check if they have completed their basic profile (Optional, depends on your flow)
    // Assuming 'isProfileComplete' is a boolean field in your Firestore 'users' collection
    if (!currentUserData.isProfileComplete) {
        const confirmProfile = confirm("You must complete your health profile before donating. Go to Profile now?");
        if (confirmProfile) {
            window.location.href = "donor_profile.html";
        }
        return;
    }
    

    // B. Check Eligibility Status
    // Based on your Use Case: "Precondition: Donor has a current 'Eligible' status"
    // Adjust 'eligibilityStatus' to match the exact field name in your Firestore
    if (currentUserData.eligibilityStatus === "Ineligible" || currentUserData.status === "Deferred") {
        alert("You are currently not eligible to donate based on your health records.");
        return;
    }

    // C. Success - Redirect to the Slots Selection Page
    console.log("User is eligible. Redirecting...");
    window.location.href = "donor_donate.html";
};