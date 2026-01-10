import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// 1. Auth Check
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    }
});

// 2. Slot Management Logic
let timeSlots = []; // Array to hold { time: "09:00", capacity: 10 }

const addSlotBtn = document.getElementById('addSlotBtn');
const slotsContainer = document.getElementById('slotsContainer');
const noSlotsMsg = document.getElementById('noSlotsMsg');
const totalCapInput = document.getElementById('totalCapacity');

addSlotBtn.addEventListener('click', () => {
    const timeInput = document.getElementById('newSlotTime');
    const capInput = document.getElementById('newSlotCap');
    
    const time = timeInput.value;
    const cap = parseInt(capInput.value);

    if (!time || !cap || cap <= 0) {
        alert("Please enter a valid time and capacity.");
        return;
    }

    // Check for duplicates
    if (timeSlots.some(slot => slot.time === time)) {
        alert("This time slot already exists!");
        return;
    }

    // Add to array
    timeSlots.push({ time: time, capacity: cap, booked: 0 });
    
    // Sort slots chronologically
    timeSlots.sort((a, b) => a.time.localeCompare(b.time));

    renderSlots();
    
    // Reset inputs
    timeInput.value = '';
    capInput.value = '';
});

function renderSlots() {
    slotsContainer.innerHTML = '';
    let total = 0;

    if (timeSlots.length === 0) {
        slotsContainer.appendChild(noSlotsMsg);
        noSlotsMsg.style.display = 'block';
    } else {
        noSlotsMsg.style.display = 'none';
        
        timeSlots.forEach((slot, index) => {
            total += slot.capacity;

            const chip = document.createElement('div');
            chip.className = 'slot-chip';
            chip.innerHTML = `
                <span>${formatTime(slot.time)}</span> 
                <small style="color:#666;">(${slot.capacity} slots)</small>
                <i class="fa-solid fa-xmark" onclick="removeSlot(${index})"></i>
            `;
            slotsContainer.appendChild(chip);
        });
    }
    
    totalCapInput.value = total;
}

// Helper to format "14:00" to "02:00 PM"
function formatTime(timeStr) {
    const [hour, min] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${ampm}`;
}

// Make removeSlot global so HTML onclick can see it
window.removeSlot = function(index) {
    timeSlots.splice(index, 1);
    renderSlots();
};

// 3. Handle Form Submission
const eventForm = document.getElementById('createEventForm');

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (timeSlots.length === 0) {
        alert("Please add at least one time slot.");
        return;
    }

    const venue = document.getElementById('venue').value;
    const date = document.getElementById('eventDate').value;
    const priority = document.getElementById('priority').value;
    const totalCap = parseInt(totalCapInput.value);

    // Display time is just the earliest slot for list view
    const displayTime = formatTime(timeSlots[0].time);

    const submitBtn = eventForm.querySelector('button[type="submit"]');
    const oldText = submitBtn.textContent;
    submitBtn.textContent = "Publishing...";
    submitBtn.disabled = true;

    try {
        await addDoc(collection(db, "events"), {
            venue: venue,
            date: date,
            time: displayTime, // For summary card display
            
            // Critical Data for Slot Booking
            timeSlots: timeSlots, 
            totalSlots: totalCap,
            availableSlots: totalCap,
            
            priorityBlood: priority,
            status: "Published",
            organiserId: auth.currentUser.uid,
            createdAt: new Date()
        });

        alert("Event Published Successfully with " + timeSlots.length + " time slots.");
        window.location.href = "organiser_dashboard.html";

    } catch (error) {
        console.error("Error adding event: ", error);
        alert("Error: " + error.message);
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
    }
});