import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// YOUR API KEYS
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

const reportSelect = document.getElementById('reportSelect');

// Data Holders
let allEventsData = []; // Stores all real data from DB

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadEvents(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

// 1. Load All Events from Database
async function loadEvents(uid) {
    const q = query(collection(db, "events"), where("organiserId", "==", uid));
    const querySnapshot = await getDocs(q);

    reportSelect.innerHTML = '<option value="all">Summary of All Events</option>';
    allEventsData = [];

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Save data to our local array so we don't have to query DB again
        allEventsData.push({
            id: doc.id,
            venue: data.venue,
            date: data.date,
            slots: parseInt(data.totalSlots || 0)
        });

        // Add to dropdown
        reportSelect.innerHTML += `<option value="${doc.id}">${data.venue} (${data.date})</option>`;
    });

    // Run the report for "All" immediately
    generateReport('all');
}

// 2. Listen for Selection Change
reportSelect.addEventListener('change', () => {
    const selectedId = reportSelect.value;
    generateReport(selectedId);
});

// 3. The Logic Engine
function generateReport(eventId) {
    let totalSlots = 0;
    
    // A. Determine the Scope (Specific Event vs All)
    if (eventId === 'all') {
        // Sum up slots from ALL events
        allEventsData.forEach(event => {
            totalSlots += event.slots;
        });
    } else {
        // Find the specific event
        const event = allEventsData.find(e => e.id === eventId);
        if (event) totalSlots = event.slots;
    }

    // B. Calculate Metrics (Simulation Logic)
    // NOTE: Since we haven't built the Hospital module to input real verified blood types,
    // we calculate "Projections" based on the Total Slots to show the UI works.
    
    // Assume 80% attendance rate
    const present = Math.floor(totalSlots * 0.8); 
    const absent = totalSlots - present;

    // Standard Blood Type Distribution (approximate global stats)
    // O: 38%, A: 34%, B: 20%, AB: 8% of those PRESENT
    const typeO = Math.floor(present * 0.38);
    const typeA = Math.floor(present * 0.34);
    const typeB = Math.floor(present * 0.20);
    const typeAB = present - (typeO + typeA + typeB); // The remainder

    // C. Update UI
    updateDisplay(present, absent, typeA, typeB, typeO, typeAB);
}

function updateDisplay(present, absent, a, b, o, ab) {
    // Attendance
    animateValue("countPresent", present);
    animateValue("countAbsent", absent);

    // Blood Types
    animateValue("typeA", a);
    animateValue("typeB", b);
    animateValue("typeO", o);
    animateValue("typeAB", ab);
}

// Helper: Simple count-up animation for effect
function animateValue(id, value) {
    const obj = document.getElementById(id);
    obj.textContent = value;
}
