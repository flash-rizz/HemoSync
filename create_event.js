import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

console.log("Create Event Script: Loaded");

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

let timeSlots = []; 

// 1. FIX: Block Past Dates on Page Load
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('eventDate');
    if(dateInput) {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        // Set the 'min' attribute so users can't click past dates
        dateInput.setAttribute('min', today);
    }
});

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        loadHospitals();
    }
});

async function loadHospitals() {
    const select = document.getElementById("hospitalSelect");
    select.innerHTML = '<option value="" disabled selected>Fetching hospitals...</option>';

    try {
        const q = query(collection(db, "users"), where("role", "==", "medical"));
        const querySnapshot = await getDocs(q);

        select.innerHTML = '<option value="" disabled selected>Select Hospital...</option>';

        if (querySnapshot.empty) {
            const opt = document.createElement('option');
            opt.text = "No Hospitals Found";
            opt.disabled = true;
            select.add(opt);
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const opt = document.createElement('option');
            opt.value = doc.id; 
            opt.text = data.fullname || "Unknown Hospital"; 
            select.add(opt);
        });

    } catch (error) {
        console.error("Error loading hospitals:", error);
        select.innerHTML = '<option value="" disabled>Error loading data</option>';
    }
}

window.addTimeSlot = function() {
    const slotTimeInput = document.getElementById('slotTime');
    const slotCapInput = document.getElementById('slotCap');
    const timeVal = slotTimeInput.value;
    const capVal = parseInt(slotCapInput.value);

    if (!timeVal || !capVal) {
        alert("Please select both time and capacity.");
        return;
    }

    timeSlots.push({ time: timeVal, capacity: capVal, booked: 0 });
    timeSlots.sort((a, b) => a.time.localeCompare(b.time));
    renderSlots();
};

function renderSlots() {
    const slotsContainer = document.getElementById('slotsContainer');
    const noSlotsMsg = document.getElementById('noSlotsMsg');
    const totalCapInput = document.getElementById('totalCapacity');
    
    slotsContainer.innerHTML = "";
    let total = 0;

    if (timeSlots.length === 0) {
        if(noSlotsMsg) slotsContainer.appendChild(noSlotsMsg); // Fixed append logic
    } else {
        timeSlots.forEach((slot, index) => {
            total += slot.capacity;
            const div = document.createElement("div");
            div.className = "slot-tag";
            div.innerHTML = `
                <span>${formatTime(slot.time)} (${slot.capacity})</span>
                <i class="fa-solid fa-xmark" onclick="removeSlot(${index})" style="cursor:pointer; margin-left:5px;"></i>
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

function formatTime(timeStr) {
    if(!timeStr) return "";
    const [hour, min] = timeStr.split(':');
    let h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12; 
    return `${h}:${min} ${ampm}`;
}

// SUBMIT LOGIC
document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 2. FIX: Validate Date Logic (Double Check)
    const dateInputVal = document.getElementById('eventDate').value;
    const selectedDate = new Date(dateInputVal);
    const today = new Date();
    today.setHours(0,0,0,0); // Reset time to midnight to compare dates fairly

    if (selectedDate < today) {
        alert("Error: You cannot create an event in the past.");
        return; // Stop function here
    }

    if (timeSlots.length === 0) {
        alert("Please add at least one time slot.");
        return;
    }

    const venue = document.getElementById('venue').value;
    const totalCap = parseInt(document.getElementById('totalCapacity').value);
    
    // 1. Gather Checkbox Values (Array)
    const checkboxes = document.querySelectorAll('input[name="priority"]:checked');
    let priorityArray = Array.from(checkboxes).map(cb => cb.value);
    if (priorityArray.length === 0) priorityArray = ["Any"];

    // 2. Hospital Info
    const hospitalSelect = document.getElementById('hospitalSelect');
    const selectedHospitalId = hospitalSelect.value;
    if (!selectedHospitalId) {
        alert("Please select a hospital.");
        return;
    }
    const selectedHospitalName = hospitalSelect.options[hospitalSelect.selectedIndex].text;
    const displayTime = formatTime(timeSlots[0].time);

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const oldText = submitBtn.textContent;
    submitBtn.textContent = "Publishing...";
    submitBtn.disabled = true;

    try {
        await addDoc(collection(db, "events"), {
            venue: venue,
            date: dateInputVal,
            time: displayTime, 
            timeSlots: timeSlots, 
            totalSlots: totalCap,
            availableSlots: totalCap,
            assignedHospitalId: selectedHospitalId,
            assignedHospitalName: selectedHospitalName,
            priorityBlood: priorityArray, 
            status: "Published",
            organiserId: auth.currentUser.uid,
            createdAt: new Date()
        });

        alert("Event Published Successfully!");
        window.location.href = "organiser_dashboard.html";

    } catch (error) {
        console.error("Error adding event: ", error);
        alert("Error: " + error.message);
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
    }
});
