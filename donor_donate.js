import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getFirestore, collection, getDocs, getDoc, query, where, doc, updateDoc, increment, addDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

// State variables
let tempEventData = null; 
let selectedSlotIndex = null; 
let currentUser = null;
let currentUserData = null; // We need this for the Name and Blood Type

// 1. Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check Auth and Get User Profile
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // Fetch extra user details (Blood Type, Name)
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if(userSnap.exists()){
                currentUserData = userSnap.data();
            }
        } else {
            window.location.href = "index.html";
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (eventId) {
        loadEventDetails(eventId);
    } else {
        alert("No event selected.");
        window.location.href = "donor_home.html";
    }
});

// 2. Load Event
async function loadEventDetails(eventId) {
    try {
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            tempEventData = { id: docSnap.id, ...docSnap.data() };
            
            // Fill Modal Info
            document.getElementById('modalEventName').innerText = tempEventData.venue;
            document.getElementById('modalLocation').innerText = tempEventData.venue;
            
            // Render Slots
            renderTimeSlots(tempEventData.timeSlots);
            
            // Hide loading
            document.getElementById('loadingIndicator').style.display = 'none';
            document.getElementById('bookingContent').style.display = 'block';
        } else {
            alert("Event not found!");
            window.location.href = "donor_home.html";
        }
    } catch (error) {
        console.error("Error loading event:", error);
    }
}

// 3. Render Slots
function renderTimeSlots(slots) {
    const container = document.getElementById('slotsContainer');
    container.innerHTML = "";

    if(!slots || slots.length === 0) {
        container.innerHTML = "<p>No slots available.</p>";
        return;
    }

    slots.forEach((slot, index) => {
        const btn = document.createElement('button');
        const isFull = slot.booked >= slot.capacity;
        
        btn.className = `time-slot ${isFull ? 'disabled' : ''}`;
        btn.innerHTML = `${formatTime(slot.time)} <br><small>${slot.booked}/${slot.capacity}</small>`;
        btn.disabled = isFull;

        btn.onclick = () => {
            // Remove active class from others
            document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            selectedSlotIndex = index;
            document.getElementById('modalTime').innerText = formatTime(slot.time);
            
            // Open Modal
            document.getElementById('confirmModal').style.display = 'flex';
        };

        container.appendChild(btn);
    });
}

// 4. Confirm Booking
window.closeModal = function() {
    document.getElementById('confirmModal').style.display = 'none';
};

window.processBooking = async function() {
    if (selectedSlotIndex === null) return;

    const btn = document.querySelector('.modal-actions .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const eventRef = doc(db, "events", tempEventData.id);
        
        // A. RE-FETCH to ensure slot isn't taken in the last second
        const freshSnap = await getDoc(eventRef);
        const freshData = freshSnap.data();
        let slotsArray = freshData.timeSlots;

        if (slotsArray[selectedSlotIndex].booked >= slotsArray[selectedSlotIndex].capacity) {
            alert("Sorry, this slot was just filled! Please choose another.");
            closeModal();
            loadEventDetails(tempEventData.id); // Reload
            return;
        }

        // B. MODIFY ARRAY IN MEMORY
        slotsArray[selectedSlotIndex].booked = (slotsArray[selectedSlotIndex].booked || 0) + 1;

        // C. UPDATE EVENT DOC (Decrement available slots)
        await updateDoc(eventRef, {
            timeSlots: slotsArray,
            availableSlots: increment(-1)
        });

        // D. CREATE APPOINTMENT RECORD (This is the "Real Database" part)
        // We save the 'hospitalId' so we know who gets the blood later.
        await addDoc(collection(db, "appointments"), {
            eventId: tempEventData.id,
            eventName: tempEventData.venue,
            eventDate: tempEventData.date,
            donorId: currentUser.uid,
            donorName: currentUserData.fullname || "Unknown Donor",
            donorBloodType: currentUserData.bloodType || "Unknown",
            hospitalId: tempEventData.assignedHospitalId || "Unassigned", // Important for stock update
            status: "Booked", // Initial status
            slotTime: formatTime(slotsArray[selectedSlotIndex].time),
            createdAt: new Date()
        });

        alert("Booking Confirmed!");
        window.location.href = "donor_home.html";

    } catch (error) {
        console.error("Booking failed:", error);
        alert("Booking failed: " + error.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

function formatTime(timeStr) {
    if(!timeStr) return "";
    const [hour, min] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12; 
    return `${h12 < 10 ? '0'+h12 : h12}:${min} ${ampm}`;
}
