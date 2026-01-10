// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Config
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

// Global variable to store user data
let currentUserData = null;

// 1. Run on Load: Check User & Check Appointments
document.addEventListener('DOMContentLoaded', () => {
    checkAppointment();
});

// 2. Auth State Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                
                // Set Name on Dashboard Header
                const displayName = currentUserData.fullname || "Donor"; 
                document.getElementById('welcomeName').textContent = "Hi, " + displayName;
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// 3. LOGOUT Function
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            alert("You have logged out.");
            window.location.href = "index.html";
        });
    });
}

// 4. DONATION ELIGIBILITY (Global)
window.checkDonationEligibility = function() {
    if (!currentUserData) {
        alert("Loading profile data... please wait.");
        return;
    }
    
    // Check if user is marked as Ineligible or Deferred in Firestore
    if (currentUserData.eligibilityStatus === "Ineligible" || currentUserData.status === "Deferred") {
        alert("You are currently not eligible to donate based on your health records.");
        return;
    }

    // Check if they already have an appointment booked (Local Storage check)
    if (localStorage.getItem('hemoSyncAppointment')) {
        alert("You already have an upcoming appointment! Please cancel it before booking a new one.");
        return;
    }

    // Success - Go to Booking Page
    window.location.href = "donor_donate.html";
};

// 5. APPOINTMENT REMINDER LOGIC
function checkAppointment() {
    const card = document.getElementById('appointmentCard');
    const statusCard = document.querySelector('.status-card');
    
    // Get data from LocalStorage
    const appointment = JSON.parse(localStorage.getItem('hemoSyncAppointment'));

    if (appointment) {
        // Show Reminder Card
        if(card) {
            card.style.display = 'block';
            
            // Populate Data
            document.getElementById('reminderTitle').textContent = appointment.eventName;
            document.getElementById('reminderLocation').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${appointment.location}`;
            document.getElementById('reminderTime').textContent = appointment.time;
            document.getElementById('reminderDay').textContent = appointment.day;
            document.getElementById('reminderMonth').textContent = appointment.month;
        }
        
        // Hide "Ready to Donate" toggle (optional cleanup)
        if(statusCard) statusCard.style.display = 'none';

    } else {
        // No appointment
        if(card) card.style.display = 'none';
        if(statusCard) statusCard.style.display = 'flex';
    }
}

// 6. CANCEL APPOINTMENT (Global)
window.cancelAppointment = function() {
    if(confirm("Are you sure you want to cancel this appointment?")) {
        localStorage.removeItem('hemoSyncAppointment');
        location.reload(); 
    }
};

// 7. PROFILE CONTACT CARD FUNCTIONS (Global)
window.openProfileCard = function() {
    // Check if data is loaded
    if (!currentUserData) {
        alert("Profile data is still loading...");
        return;
    }

    // Populate Data into the Modal
    document.getElementById('cardName').innerText = currentUserData.fullname || "Donor";
    document.getElementById('cardPhone').innerText = currentUserData.phone || "No phone linked";
    document.getElementById('cardAddress').innerText = currentUserData.address || "No address set";
    document.getElementById('cardBlood').innerText = currentUserData.bloodType || "Unknown";

    // Show Modal
    document.getElementById('profileCardModal').classList.add('active');
};

window.closeProfileCard = function() {
    document.getElementById('profileCardModal').classList.remove('active');
};