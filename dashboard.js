import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// 1. Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                document.getElementById('welcomeName').textContent = "Hi, " + (currentUserData.fullname || "Donor");
                
                // Check Appointment (Secured with UserID)
                checkAppointment(user.uid);
                
                // Check Alerts (Robust Logic)
                checkNotifications(currentUserData.bloodType);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// 2. Check Appointment
function checkAppointment(currentUid) {
    const card = document.getElementById('appointmentCard');
    const noCard = document.getElementById('noAppointmentCard');
    
    // Parse stored data
    const appointment = JSON.parse(localStorage.getItem('hemoSyncAppointment'));

    // LOGIC: Check if appointment exists AND belongs to the current user
    if (appointment && appointment.userId === currentUid) {
        if(card) {
            card.style.display = 'block';
            // Safe rendering with fallbacks
            document.getElementById('reminderTitle').textContent = appointment.eventName || "Blood Donation";
            document.getElementById('reminderLocation').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${appointment.location || "Location TBD"}`;
            document.getElementById('reminderTime').textContent = appointment.time || "--:--";
            document.getElementById('reminderDay').textContent = appointment.day || "--";
            document.getElementById('reminderMonth').textContent = appointment.month || "--";
        }
        if(noCard) noCard.style.display = 'none';
    } else {
        // Mismatch or no appointment -> Show Empty State
        if(card) card.style.display = 'none';
        if(noCard) noCard.style.display = 'block';
        
        // Cleanup: If there was data but it belonged to someone else, remove it
        if (appointment && appointment.userId !== currentUid) {
            localStorage.removeItem('hemoSyncAppointment');
        }
    }
}

// 3. Check Notifications (Robust & Crash-Proof)
async function checkNotifications(userBloodType) {
    if (!userBloodType) return;

    try {
        const eventsRef = collection(db, "events");
        // Get the 10 most recent events to check for alerts
        const q = query(eventsRef, orderBy("createdAt", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        
        const readEvents = JSON.parse(localStorage.getItem('hemoReadEvents') || "[]");
        let hasUnread = false;
        let newestUnreadEvent = null;
        const now = new Date();

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            
            // --- ROBUST MATCHING (Matches donor_notifications.js) ---
            // 1. Force strings and uppercase (prevents crashes on bad data)
            const pBlood = String(event.priorityBlood || "").trim().toUpperCase();
            const uBlood = String(userBloodType || "").trim().toUpperCase();

            // 2. Status Check
            if (event.status !== "Published") return;

            // 3. Exact Match Check
            if (pBlood !== uBlood) return; 

            // 4. Ignore Ancient Events (> 7 Days Old)
            if (event.createdAt) {
                const createdDate = event.createdAt.toDate();
                const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
                if (diffDays > 7) return; 
            }

            // 5. ALERT TRIGGER
            // If we found a valid match that is NOT in the "read" list
            if (!readEvents.includes(doc.id)) {
                hasUnread = true;
                if (!newestUnreadEvent) newestUnreadEvent = { id: doc.id, ...event };
            }
        });

        // --- UPDATE UI ---
        const badge = document.getElementById('notifBadge');
        if (badge) badge.style.display = hasUnread ? 'block' : 'none';

        // Trigger Toast Popup
        if (newestUnreadEvent) {
            const lastToastId = localStorage.getItem('hemoLastToastId');
            
            // Only popup if we haven't shown it for this specific Event ID yet
            if (lastToastId !== newestUnreadEvent.id) {
                const toast = document.getElementById('alertToast');
                if (toast) {
                    toast.querySelector('h4').textContent = "Urgent Match!";
                    toast.querySelector('p').textContent = `Immediate need for Type ${userBloodType} donors!`;
                    
                    toast.classList.add('show');
                    // Show for 8 seconds
                    setTimeout(() => toast.classList.remove('show'), 8000);
                    
                    // Mark as "Toast Shown" so it doesn't pop up again on refresh
                    localStorage.setItem('hemoLastToastId', newestUnreadEvent.id);
                }
            }
        }

    } catch (error) {
        console.error("Error checking alerts:", error);
    }
}

// 4. Global Helper: Eligibility Check
window.checkDonationEligibility = function() {
    if (!currentUserData) return alert("Loading profile...");
    
    if (!currentUserData.isProfileComplete) {
        if(confirm("Please complete your eligibility check first. Go to profile?")) {
            window.location.href = "donor_profile.html";
        }
        return;
    }
    
    if (currentUserData.eligibilityStatus === "Ineligible" || currentUserData.status === "Deferred") {
        alert("You are currently not eligible to donate based on your health records.");
        return;
    }

    if (currentUserData.lastDonationDate) {
        let lastDate = currentUserData.lastDonationDate.toDate ? currentUserData.lastDonationDate.toDate() : new Date(currentUserData.lastDonationDate);
        const today = new Date();
        const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 56) {
            alert(`Recovery Period Active. Please wait ${56 - diffDays} more days.`);
            return;
        }
    }

    if (localStorage.getItem('hemoSyncAppointment')) {
        alert("You already have a booking! Please visit History.");
        return;
    }
    
    window.location.href = "donor_donate.html";
};

// 5. Global Helper: Profile Modal
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

// 6. Logout (Clears Data)
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            // Remove user-specific data
            localStorage.removeItem('hemoSyncAppointment');
            localStorage.removeItem('hemoReadEvents');
            localStorage.removeItem('hemoLastToastId');
            
            window.location.href = "index.html";
        });
    });
}