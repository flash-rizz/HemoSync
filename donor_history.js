import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

let currentRating = 0;
let currentEventId = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadHistory(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

async function loadHistory(userId) {
    const container = document.getElementById('historyContainer');
    const loading = document.getElementById('loadingIndicator');
    const empty = document.getElementById('emptyState');
    const totalCountEl = document.getElementById('totalDonationCount');

    try {
        const q = query(collection(db, "appointments"), where("donorId", "==", userId));
        const querySnapshot = await getDocs(q);
        
        loading.style.display = 'none';

        if (querySnapshot.empty) {
            empty.style.display = 'block';
            if(totalCountEl) totalCountEl.innerText = "0";
            return;
        }

        let totalDonations = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const recordId = docSnap.id; 
            
            let displayDate = data.eventDate || "Unknown Date";
            let statusDisplay = data.status;
            let badgeClass = 'status-upcoming'; 
            let actionButton = '';

            if (data.status === 'Completed') {
                statusDisplay = "Success";
                badgeClass = 'status-done';
                totalDonations++;
                actionButton = `<span style="color:green; font-size:12px;">Thank you!</span>`;
            } else if (data.status === 'Booked') {
                statusDisplay = "Upcoming";
                badgeClass = 'status-upcoming';
                // CANCEL BUTTON PASSED CORRECT DATA
                actionButton = `
                    <button class="btn-rate" 
                        style="border:1px solid #D32F2F; color:#D32F2F; background:white;"
                        onclick="cancelAppointment('${recordId}', '${data.eventId}', '${data.slotTime}')">
                        Cancel
                    </button>
                `;
            } else {
                badgeClass = 'status-cancelled';
                actionButton = `<span style="font-size:12px; color:#999;">${data.status}</span>`;
            }

            const card = document.createElement('div');
            card.className = 'event-card history-card';
            card.innerHTML = `
                <div class="event-header">
                    <div class="event-details" style="flex: 1;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <h4 style="font-size: 0.95rem; margin-bottom: 5px;">${data.eventName || 'Blood Drive'}</h4>
                            <span class="status-badge ${badgeClass}">${statusDisplay}</span>
                        </div>
                        <p><i class="fa-solid fa-location-dot"></i> Cyberjaya</p>
                        <p style="font-size: 13px; color: #555; margin-top:5px;"><i class="fa-regular fa-clock"></i> ${data.slotTime}</p>
                        
                        <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <p style="font-size: 0.75rem; color: #999; margin:0;">${displayDate}</p>
                            ${actionButton}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        if(totalCountEl) totalCountEl.innerText = totalDonations;

    } catch (error) {
        console.error("Error fetching history: ", error);
        loading.innerHTML = '<p style="color:red">Error loading history.</p>';
    }
}

// === CANCELLATION LOGIC ===
window.cancelAppointment = async function(apptId, eventId, slotTime) {
    if (!confirm("Are you sure you want to cancel? This will remove your booking.")) return;

    try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
            const eventData = eventSnap.data();
            let slots = eventData.timeSlots;
            let foundIndex = -1;

            // Find the slot to refund
            slots.forEach((s, index) => {
                // Match the time string (e.g. "02:00 PM")
                if (formatTime(s.time) === slotTime || s.time === slotTime) {
                    foundIndex = index;
                }
            });

            if (foundIndex !== -1) {
                if (slots[foundIndex].booked > 0) {
                    slots[foundIndex].booked -= 1;
                }
                // Update Event: Refund Slot
                await updateDoc(eventRef, {
                    timeSlots: slots,
                    availableSlots: increment(1)
                });
            }
        }

        // Delete Appointment -> Removes from Attendance
        await deleteDoc(doc(db, "appointments", apptId));
        localStorage.removeItem('hemoSyncAppointment');

        alert("Appointment cancelled.");
        location.reload();

    } catch (error) {
        console.error("Cancellation Error:", error);
        alert("Error cancelling: " + error.message);
    }
};

function formatTime(timeStr) {
    if(!timeStr) return "";
    if(timeStr.includes("M")) return timeStr; 
    const [hour, min] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${ampm}`;
}