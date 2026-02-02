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

let currentUserData = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAppointment();
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                document.getElementById('welcomeName').textContent = "Hi, " + (currentUserData.fullname || "Donor");
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// UI Logic: Show Active Card OR Show Empty Card
function checkAppointment() {
    const card = document.getElementById('appointmentCard');
    const noCard = document.getElementById('noAppointmentCard');
    const appointment = JSON.parse(localStorage.getItem('hemoSyncAppointment'));

    if (appointment) {
        if(card) {
            card.style.display = 'block';
            document.getElementById('reminderTitle').textContent = appointment.eventName;
            document.getElementById('reminderLocation').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${appointment.location}`;
            document.getElementById('reminderTime').textContent = appointment.time;
            document.getElementById('reminderDay').textContent = appointment.day;
            document.getElementById('reminderMonth').textContent = appointment.month;
        }
        if(noCard) noCard.style.display = 'none';
    } else {
        if(card) card.style.display = 'none';
        if(noCard) noCard.style.display = 'block'; // Using block here as flex is inside the CSS class
    }
}

// Global Functions
window.checkDonationEligibility = function() {
    if (!currentUserData) return alert("Loading profile...");
    
    // 1. Profile Check
    if (!currentUserData.isProfileComplete) {
        if(confirm("Please complete your eligibility check first. Go to profile?")) {
            window.location.href = "donor_profile.html";
        }
        return;
    }
    
    // 2. Health Status Check
    if (currentUserData.eligibilityStatus === "Ineligible" || currentUserData.status === "Deferred") {
        alert("You are currently not eligible to donate based on your health records.");
        return;
    }

    // 3. Existing Booking Check
    if (localStorage.getItem('hemoSyncAppointment')) {
        alert("You already have a booking! Please visit History if you need to manage it.");
        return;
    }
    
    window.location.href = "donor_donate.html";
};

// Profile Card Functions
window.openProfileCard = function() {
    if (!currentUserData) {
        alert("Profile data is still loading...");
        return;
    }
    document.getElementById('cardName').innerText = currentUserData.fullname || "Donor";
    document.getElementById('cardPhone').innerText = currentUserData.phone || "No phone linked";
    document.getElementById('cardAddress').innerText = currentUserData.address || "No address set";
    document.getElementById('cardBlood').innerText = currentUserData.bloodType || "Unknown";

    document.getElementById('profileCardModal').classList.add('active');
};

window.closeProfileCard = function() {
    document.getElementById('profileCardModal').classList.remove('active');
};

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}