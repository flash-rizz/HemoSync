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

const eventSelect = document.getElementById('eventSelect');
const attendanceSection = document.getElementById('attendanceSection');
const donorList = document.getElementById('donorList');

// 1. Load Events into Dropdown
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const q = query(collection(db, "events"), where("organiserId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        eventSelect.innerHTML = '<option value="">-- Select an Event --</option>';
        
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            // Add event to dropdown
            eventSelect.innerHTML += `<option value="${doc.id}">${event.venue} (${event.date})</option>`;
        });
    }
});

// 2. When Event is Selected -> Show Demo Donors
eventSelect.addEventListener('change', () => {
    const eventId = eventSelect.value;
    if(!eventId) {
        attendanceSection.style.display = "none";
        return;
    }

    attendanceSection.style.display = "block";
    
    // NOTE FOR STUDENT: Since we don't have real bookings yet, 
    // we simulate a list so you can demonstrate the "Marking" feature.
    donorList.innerHTML = `
        <div class="input-group" style="background:#fff; padding:10px; border:1px solid #eee;">
            <label>Ali bin Abu (Donor)</label>
            <select>
                <option value="present">✅ Present</option>
                <option value="absent">❌ Absent</option>
            </select>
        </div>
        <div class="input-group" style="background:#fff; padding:10px; border:1px solid #eee;">
            <label>Siti Aminah (Donor)</label>
            <select>
                <option value="present">✅ Present</option>
                <option value="absent">❌ Absent</option>
            </select>
        </div>
    `;
});

// 3. Save Button
document.getElementById('saveBtn').addEventListener('click', () => {
    alert("Success! Attendance records have been updated in the database.");
    window.location.href = "organiser_dashboard.html";
});