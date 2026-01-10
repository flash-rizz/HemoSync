import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, query, where, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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
let tempEventData = null; // Stores event details temporarily
let selectedSlotIndex = null; // Stores which time slot user clicked
let currentUser = null;

// 1. Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPublishedEvents();
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = "index.html";
    }
});

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
    
    // Check global capacity
    const isFull = data.availableSlots <= 0;
    const btnText = isFull ? 'Full' : 'Book Now';
    const btnClass = isFull ? 'disabled' : '';
    
    // We store the data in a JSON string to pass it to the openSlotModal function
    // (Simpler than maintaining a global array map for this scale)
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
    // Decode data
    tempEventData = JSON.parse(decodeURIComponent(eventString));
    
    document.getElementById('slotEventName').innerText = tempEventData.venue;
    const container = document.getElementById('slotListContainer');
    container.innerHTML = ''; // Clear previous

    // Loop through the timeSlots array from Firestore
    if (!tempEventData.timeSlots || tempEventData.timeSlots.length === 0) {
        container.innerHTML = '<p style="grid-column:span 2; text-align:center;">No specific slots defined.</p>';
        return;
    }

    tempEventData.timeSlots.forEach((slot, index) => {
        // Calculate remaining for this specific time
        const booked = slot.booked || 0;
        const remaining = slot.capacity - booked;
        const isSlotFull = remaining <= 0;

        // Create button
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

    // Close Slot Modal
    document.getElementById('slotModal').classList.remove('active');

    // Populate Confirmation Modal
    document.getElementById('modalEventName').innerText = tempEventData.venue;
    document.getElementById('modalLocation').innerText = tempEventData.venue;
    
    // Show specific time selected
    document.getElementById('modalTime').innerText = formatTime(slotData.time);
    
    // Open Confirm Modal
    document.getElementById('confirmModal').classList.add('active');
};

window.closeSlotModal = function() {
    document.getElementById('slotModal').classList.remove('active');
};

window.closeModal = function() {
    document.getElementById('confirmModal').classList.remove('active');
};

// 5. STEP 3: PROCESS BOOKING (Update Database)
window.processBooking = async function() {
    if (!tempEventData || !currentUser || selectedSlotIndex === null) return;

    const btn = document.querySelector('#confirmModal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const eventRef = doc(db, "events", tempEventData.id);

        // A. READ FRESH DATA (Concurrency Safety)
        // We must read the doc again to ensure we don't overwrite someone else's booking that happened 1 second ago
        const freshSnap = await getDoc(eventRef);
        if (!freshSnap.exists()) throw new Error("Event not found");
        
        const freshData = freshSnap.data();
        const slotsArray = freshData.timeSlots;

        // Check capacity again
        if (slotsArray[selectedSlotIndex].booked >= slotsArray[selectedSlotIndex].capacity) {
            alert("Sorry! This slot was just taken by someone else.");
            location.reload();
            return;
        }

        // B. MODIFY ARRAY IN MEMORY
        slotsArray[selectedSlotIndex].booked = (slotsArray[selectedSlotIndex].booked || 0) + 1;

        // C. WRITE BACK TO FIRESTORE
        await updateDoc(eventRef, {
            timeSlots: slotsArray, // Update the array
            availableSlots: increment(-1) // Decrement global counter
        });

        // D. SAVE TO LOCAL STORAGE (For Dashboard)
        const dateObj = new Date(tempEventData.date);
        const bookingData = {
            eventId: tempEventData.id,
            eventName: tempEventData.venue,
            location: tempEventData.venue,
            time: formatTime(slotsArray[selectedSlotIndex].time), // Use the specific slot time
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

// Utility: Format "14:00" -> "02:00 PM"
function formatTime(timeStr) {
    if(!timeStr) return "";
    const [hour, min] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${ampm}`;
}