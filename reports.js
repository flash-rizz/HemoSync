import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// 1. Auth & Load Events Dropdown
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadOrganiserEvents(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

async function loadOrganiserEvents(uid) {
    reportSelect.innerHTML = '<option value="">Loading...</option>';
    try {
        const q = query(collection(db, "events"), where("organiserId", "==", uid));
        const querySnapshot = await getDocs(q);

        reportSelect.innerHTML = '<option value="" disabled selected>Select an Event</option>';
        
        if(querySnapshot.empty) {
            reportSelect.innerHTML = '<option value="">No events found</option>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const opt = document.createElement("option");
            opt.value = doc.id;
            opt.innerText = `${event.venue} (${event.date})`;
            reportSelect.appendChild(opt);
        });

    } catch (error) {
        console.error("Error loading events:", error);
    }
}

// 2. Generate REAL Report on Selection
reportSelect.addEventListener('change', async function() {
    const eventId = this.value;
    if (!eventId) return;

    // A. Reset UI to 0 immediately (Fixes the "Mock Data" issue)
    updateDisplay(0, 0, 0, 0, 0, 0);

    try {
        console.log(`Generating report for Event ID: ${eventId}`);
        
        // B. QUERY REAL DATA: Get appointments ONLY for this event
        const q = query(collection(db, "appointments"), where("eventId", "==", eventId));
        const querySnapshot = await getDocs(q);

        // If no donors found, the function stops here and UI remains at 0
        if (querySnapshot.empty) {
            console.log("No appointments found. Report is empty.");
            return; 
        }

        let presentCount = 0;
        let absentCount = 0;
        
        // Blood counters
        let types = { A: 0, B: 0, O: 0, AB: 0 };

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const status = data.status; // 'Booked', 'Completed', 'Absent'
            const bType = (data.donorBloodType || "").toUpperCase(); // e.g., 'A+'

            // ONLY count them if they are marked "Completed" (Present)
            if (status === 'Completed') {
                presentCount++;
                
                // Clean Blood Type String (Remove + or -)
                let baseType = bType.replace('+', '').replace('-', '').trim();
                
                // Increment specific type
                if (types[baseType] !== undefined) {
                    types[baseType]++;
                } else {
                    // Fallback for safety
                    if (baseType.includes('AB')) types.AB++;
                    else if (baseType.includes('A')) types.A++;
                    else if (baseType.includes('B')) types.B++;
                    else if (baseType.includes('O')) types.O++;
                }

            } else if (status === 'Absent') {
                absentCount++;
            }
            // If status is 'Booked', they haven't attended yet, so we count nothing.
        });

        // C. Update the UI with the CALCULATED real numbers
        updateDisplay(presentCount, absentCount, types.A, types.B, types.O, types.AB);

    } catch (error) {
        console.error("Report Generation Error:", error);
        alert("Failed to load report data.");
    }
});

// Helper: Update the HTML elements
function updateDisplay(present, absent, a, b, o, ab) {
    // We use a simple helper to safely set text
    safeSetText("countPresent", present);
    safeSetText("countAbsent", absent);
    safeSetText("typeA", a);
    safeSetText("typeB", b);
    safeSetText("typeO", o);
    safeSetText("typeAB", ab);
}

function safeSetText(id, value) {
    const el = document.getElementById(id);
    if(el) el.innerText = value;
}
