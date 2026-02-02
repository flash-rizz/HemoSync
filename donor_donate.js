import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
// ADDED: 'addDoc' to the imports so we can create the appointment
import { getFirestore, collection, getDocs, getDoc, query, where, doc, updateDoc, increment, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDmmZr7FuJV39cK_9WqabqS26doV04USgE",
    authDomain: "hemosync-765c9.firebaseapp.com",
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
let currentUserData = null; // New: Store profile data (Name, Blood Type)

// 1. Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Only load events if we know who the user is (moved logic slightly)
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log("User detected:", user.uid);
        
        // Fetch the user's name and blood type immediately
        await loadUserProfile(user.uid);
        
        // Now load the events
        loadPublishedEvents();
    } else {
        window.location.href = "index.html";
    }
});

// Helper: Get User Profile (Student Logic: simple fetch)
async function loadUserProfile(uid) {
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
            currentUserData = userSnap.data();
            console.log("Profile loaded:", currentUserData.fullname);
        }
    } catch (e) {
        console.error("Error loading profile:", e);
    }
}

// 2. Fetch Events
async function loadPublishedEvents() {
    const container = document.getElementById('eventsContainer');
    const loading = document.getElementById('loadingIndicator');
    
    try {
        const q = query(collection(db, "events"), where("status", "==", "Published"));
        const querySnapshot = await getDocs(q);
        
        loading.style.display = 'none';
        container.innerHTML = '';

        if (querySnapshot.empty) {
            container.innerHTML = `<div style="text-align:center; margin-top:20px; color:#888;">No upcoming blood drives found.</div>`;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let upcomingCount = 0;

        querySnapshot.forEach((docSnap) => {
            const event = docSnap.data();
            const eventDate = new Date(event.date);
            
            // Filter past events
            if (eventDate < today) return; 

            // Pass the entire event object + ID to the renderer
            renderEventCard(docSnap.id, event, container);
            upcomingCount++;
        });

        if (upcomingCount === 0) {
            container.innerHTML = `<div style="text-align:center; margin-top:20px; color:#888;">No upcoming blood drives found.</div>`;
        }

    } catch (error) {
        console.error("Error loading events:", error);
        loading.innerHTML = "Error loading events.";
    }
}

function renderEventCard(id, data, container) {
    const dateObj = new Date(data.date);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
    
    const isFull = data.availableSlots <= 0;
    const btnText = isFull ? 'Full' : 'Book Now';
    const btnClass = isFull ? 'disabled' : '';
    
    // We store the data in a JSON string to pass it to the openSlotModal function
    // Including the ID is crucial for the database update later
    const eventSafeStr = encodeURIComponent(JSON.stringify({ ...data, id: id }));

    const html = `
        <div class="event-card">
            <div class="event-header">
                <div class="event-date">
                    <div>${day}</div>
                    <div>${month}</div>
                </div>
                <div class="event-details" style="flex:1; margin-left: 15px;">
                    <h4>${data.venue}</h4> 
                    <p><i class="fa-solid fa-location-dot"></i> ${data.venue}</p>
                    <p><i class="fa-regular fa-clock"></i> Starts ${data.time}</p>
                    <p style="color: ${data.availableSlots < 5 ? '#e63946' : '#2a9d8f'}; font-size: 12px; margin-top: 5px;">
                        <i class="fa-solid fa-ticket"></i> ${data.availableSlots} total slots left
                    </p>
                </div>
            </div>
            <div class="slots-grid" style="grid-template-columns: 1fr;">
                <button class="time-slot ${btnClass}" onclick="prepareSlotSelection('${eventSafeStr}')" ${isFull ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>
        </div>
    `;
    container.innerHTML += html;
}

// 3. STEP 1: OPEN SLOT MODAL
window.prepareSlotSelection = function(eventString) {
    tempEventData = JSON.parse(decodeURIComponent(eventString));
    
    document.getElementById('slotEventName').innerText = tempEventData.venue;
    const container = document.getElementById('slotListContainer');
    container.innerHTML = ''; 

    if (!tempEventData.timeSlots || tempEventData.timeSlots.length === 0) {
        container.innerHTML = '<p style="grid-column:span 2; text-align:center;">No specific slots defined.</p>';
        return;
    }

    tempEventData.timeSlots.forEach((slot, index) => {
        const booked = slot.booked || 0;
        const remaining = slot.capacity - booked;
        const isSlotFull = remaining <= 0;

        const btn = document.createElement('button');
        btn.className = `time-slot ${isSlotFull ? 'disabled' : ''}`;
        btn.innerHTML = `
            <strong>${formatTime(slot.time)}</strong><br>
            <span style="font-size:10px;">${isSlotFull ? 'Full' : remaining + ' left'}</span>
        `;
        
        if (!isSlotFull) {
            btn.onclick = () => selectSlot(index);
        }

        container.appendChild(btn);
    });

    document.getElementById('slotModal').classList.add('active');
};

// 4. STEP 2: SELECT SLOT -> OPEN CONFIRMATION
window.selectSlot = function(index) {
    selectedSlotIndex = index;
    const slotData = tempEventData.timeSlots[index];

    document.getElementById('slotModal').classList.remove('active');

    document.getElementById('modalEventName').innerText = tempEventData.venue;
    document.getElementById('modalLocation').innerText = tempEventData.venue;
    document.getElementById('modalTime').innerText = formatTime(slotData.time);
    
    document.getElementById('confirmModal').classList.add('active');
};

window.closeSlotModal = function() {
    document.getElementById('slotModal').classList.remove('active');
};

window.closeModal = function() {
    document.getElementById('confirmModal').classList.remove('active');
};

// 5. STEP 3: PROCESS BOOKING (The Logic Fix)
window.processBooking = async function() {
    if (!tempEventData || !currentUser || selectedSlotIndex === null) return;

    // Safety check: ensure we loaded the user profile
    if (!currentUserData) {
        alert("Still loading your profile... please wait a moment.");
        return;
    }

    const btn = document.querySelector('#confirmModal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const eventRef = doc(db, "events", tempEventData.id);

        // A. READ FRESH DATA (Concurrency Safety)
        const freshSnap = await getDoc(eventRef);
        if (!freshSnap.exists()) throw new Error("Event not found");
        
        const freshData = freshSnap.data();
        const slotsArray = freshData.timeSlots;

        if (slotsArray[selectedSlotIndex].booked >= slotsArray[selectedSlotIndex].capacity) {
            alert("Sorry! This slot was just taken by someone else.");
            location.reload();
            return;
        }

        // B. MODIFY ARRAY IN MEMORY
        slotsArray[selectedSlotIndex].booked = (slotsArray[selectedSlotIndex].booked || 0) + 1;

        // C. UPDATE EVENT (Reduce Slots)
        await updateDoc(eventRef, {
            timeSlots: slotsArray,
            availableSlots: increment(-1)
        });

        // D. CREATE APPOINTMENT (This was missing!)
        // The Attendance page looks for documents in the 'appointments' collection
        await addDoc(collection(db, "appointments"), {
            eventId: tempEventData.id,
            eventName: tempEventData.venue,
            eventDate: tempEventData.date,
            
            donorId: currentUser.uid,
            donorName: currentUserData.fullname || "Unknown Donor",
            donorBloodType: currentUserData.bloodType || "Unknown",
            
            // Needed so the specific hospital can verify attendance
            hospitalId: tempEventData.assignedHospitalId || "Unassigned",
            
            slotTime: formatTime(slotsArray[selectedSlotIndex].time),
            status: "Booked", 
            createdAt: new Date()
        });

        // E. SAVE TO LOCAL STORAGE (For the Dashboard Reminder Card)
        const dateObj = new Date(tempEventData.date);
        const bookingData = {
            userId: currentUser.uid,
            eventId: tempEventData.id,
            eventName: tempEventData.venue,
            location: tempEventData.venue,
            time: formatTime(slotsArray[selectedSlotIndex].time),
            day: dateObj.getDate(),
            month: dateObj.toLocaleString('default', { month: 'short' }).toUpperCase()
        };
        
        localStorage.setItem('hemoSyncAppointment', JSON.stringify(bookingData));

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
    return `${h12}:${min} ${ampm}`;
}