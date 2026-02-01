import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// Added 'query', 'where', and 'getDocs' to fetch the hospitals list
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// 1. Auth Check & Init
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        // Load the list of hospitals when page loads
        loadHospitals();
    }
});

// Global array to hold our slots before saving
let timeSlots = []; 

// 2. Load Hospital Options for Dropdown
async function loadHospitals() {
    const select = document.getElementById("hospitalSelect");
    select.innerHTML = '<option value="" disabled selected>Select Hospital...</option>';

    try {
        // Find all users who are 'medical' role (Hospital/Clinic)
        const q = query(collection(db, "users"), where("role", "==", "medical"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const opt = document.createElement('option');
            opt.text = "No Hospitals Found";
            select.add(opt);
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const opt = document.createElement('option');
            opt.value = doc.id; // Save the UserID (UID) as value
            opt.text = data.fullname; // Show the Name in dropdown
            select.add(opt);
        });

    } catch (error) {
        console.error("Error loading hospitals:", error);
        alert("Failed to load hospital list.");
    }
}

// 3. Add Slot Logic
const slotTimeInput = document.getElementById('slotTime');
const slotCapInput = document.getElementById('slotCap');
const slotsContainer = document.getElementById('slotsContainer');
const totalCapInput = document.getElementById('totalCapacity');
const noSlotsMsg = document.getElementById('noSlotsMsg');

window.addTimeSlot = function() {
    const timeVal = slotTimeInput.value;
    const capVal = parseInt(slotCapInput.value);

    if (!timeVal || !capVal) {
        alert("Please select time and capacity.");
        return;
    }

    // Add to array
    timeSlots.push({
        time: timeVal,
        capacity: capVal,
        booked: 0
    });

    // Update UI
    renderSlots();
    
    // Sort slots by time so they look nice
    timeSlots.sort((a, b) => a.time.localeCompare(b.time));
};

function renderSlots() {
    slotsContainer.innerHTML = "";
    let total = 0;

    if (timeSlots.length === 0) {
        slotsContainer.appendChild(noSlotsMsg);
    } else {
        timeSlots.forEach((slot, index) => {
            total += slot.capacity;

            const div = document.createElement("div");
            div.className = "slot-tag";
            // Simple format for display
            div.innerHTML = `
                <span>${slot.time} (${slot.capacity})</span>
                <i class="fa-solid fa-xmark" onclick="removeSlot(${index})"></i>
            `;
            slotsContainer.appendChild(div);
        });
    }

    totalCapInput.value = total;
}

window.removeSlot = function(index) {
    timeSlots.splice(index, 1);
    renderSlots();
};

// Utility to make time look nice (e.g., 14:00 -> 02:00 PM)
function formatTime(timeStr) {
    if(!timeStr) return "";
    const [hour, min] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12; 
    return `${h12 < 10 ? '0'+h12 : h12}:${min} ${ampm}`;
}

// 4. Submit Event
// NEW: Get all checked values
const checkedBoxes = document.querySelectorAll('input[name="priorityBlood"]:checked');
let priorityArray = Array.from(checkedBoxes).map(cb => cb.value);

    // If none selected, default to "Any"
if (priorityArray.length === 0) {
    priorityArray = ["Any"];
    }

try {
    await addDoc(collection(db, "events"), {
            venue: venue,
            date: date,
            time: displayTime, 
            timeSlots: timeSlots, 
            totalSlots: totalCap,
            availableSlots: totalCap,
            assignedHospitalId: selectedHospitalId,
            assignedHospitalName: selectedHospitalName,
            
            // CHANGED: Save as an Array
            priorityBlood: priorityArray, 
            
            status: "Published",
            organiserId: auth.currentUser.uid,
            createdAt: new Date()
        });
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
    
    // Get the selected hospital ID and Name
    const hospitalSelect = document.getElementById('hospitalSelect');
    const selectedHospitalId = hospitalSelect.value;
    const selectedHospitalName = hospitalSelect.options[hospitalSelect.selectedIndex].text;

    if (!selectedHospitalId) {
        alert("Please assign a hospital to this event.");
        return;
    }

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
            time: displayTime, 
            
            // Critical Data for Slot Booking
            timeSlots: timeSlots, 
            totalSlots: totalCap,
            availableSlots: totalCap,
            
            // NEW: Link the hospital
            assignedHospitalId: selectedHospitalId,
            assignedHospitalName: selectedHospitalName,
            
            priorityBlood: priority,
            status: "Published",
            organiserId: auth.currentUser.uid,
            createdAt: new Date()
        });

        alert("Event Published Successfully! Assigned to: " + selectedHospitalName);
        window.location.href = "organiser_dashboard.html";

    } catch (error) {
        console.error("Error adding event: ", error);
        alert("Error: " + error.message);
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
    }

});
