import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// 2. Generate Real Report on Selection
reportSelect.addEventListener('change', async function() {
    const eventId = this.value;
    if (!eventId) return;

    // Reset UI to 0 before loading
    updateDisplay(0, 0, 0, 0, 0, 0);

    try {
        console.log(`Generating report for Event ID: ${eventId}`);
        
        // QUERY REAL DATA: Get all appointments for this event
        const q = query(collection(db, "appointments"), where("eventId", "==", eventId));
        const querySnapshot = await getDocs(q);

        let presentCount = 0;
        let absentCount = 0;
        
        // Blood counters (Group A+, A- into 'A', etc.)
        let types = { A: 0, B: 0, O: 0, AB: 0 };

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const status = data.status; // 'Booked', 'Completed', 'Absent'
            const bType = (data.donorBloodType || "").toUpperCase(); // e.g., 'A+'

            if (status === 'Completed') {
                presentCount++;
                
                // Categorize Blood Type
                // Logic: "A+" -> "A", "AB-" -> "AB"
                let baseType = bType.replace('+', '').replace('-', '').trim();
                
                if (types[baseType] !== undefined) {
                    types[baseType]++;
                } else {
                    // Fallback/Safety if format is weird
                    if (baseType.includes('AB')) types.AB++;
                    else if (baseType.includes('A')) types.A++;
                    else if (baseType.includes('B')) types.B++;
                    else if (baseType.includes('O')) types.O++;
                }

            } else if (status === 'Absent') {
                absentCount++;
            }
            // 'Booked' means they haven't arrived yet, so we don't count them in stats yet
        });

        // 3. Update the UI with REAL numbers
        updateDisplay(presentCount, absentCount, types.A, types.B, types.O, types.AB);

    } catch (error) {
        console.error("Report Generation Error:", error);
        alert("Failed to load report data.");
    }
});

// Helper: Animate numbers
function updateDisplay(present, absent, a, b, o, ab) {
    animateValue("countPresent", present);
    animateValue("countAbsent", absent);
    animateValue("typeA", a);
    animateValue("typeB", b);
    animateValue("typeO", o);
    animateValue("typeAB", ab);
}

function animateValue(id, end) {
    const obj = document.getElementById(id);
    if(!obj) return;
    
    // If it's 0, just show 0
    if (end === 0) {
        obj.innerHTML = 0;
        return;
    }

    let start = 0;
    let duration = 800;
    let range = end - start;
    let current = start;
    let increment = end > start ? 1 : -1;
    let stepTime = Math.abs(Math.floor(duration / range));
    
    let timer = setInterval(function() {
        current += increment;
        obj.innerHTML = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}
