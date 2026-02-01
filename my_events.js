import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore, collection, query, where, getDocs, doc, getDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Config
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

const eventsList = document.getElementById('eventsList');
const loadingMsg = document.getElementById('loadingMessage');

// 1. Check Auth & Load Events
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadMyEvents(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

// 2. Load Events Function
async function loadMyEvents(uid) {
    try {
        const q = query(collection(db, "events"), where("organiserId", "==", uid));
        const querySnapshot = await getDocs(q);

        loadingMsg.style.display = 'none';
        eventsList.innerHTML = '';

        if (querySnapshot.empty) {
            eventsList.innerHTML = '<p style="text-align:center; color:#888;">You haven\'t created any events yet.</p>';
            return;
        }

        let index = 0;
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const eventId = doc.id;

            // Calculate live bookings for the card display
            let totalBooked = 0;
            if (event.timeSlots) {
                event.timeSlots.forEach(slot => {
                    if (slot.booked) totalBooked += slot.booked;
                });
            }

            const eventCard = `
                <div class="event-card" style="animation: fadeInUp 0.5s ease forwards; animation-delay: ${index * 0.1}s;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; color:#333;">${event.venue}</h3>
                            <p style="font-size: 13px; color: #666; margin: 5px 0;">
                                <i class="fa-regular fa-calendar"></i> ${event.date} &nbsp;|&nbsp; 
                                <i class="fa-regular fa-clock"></i> ${event.time}
                            </p>
                            <p style="font-size: 12px; color: #D32F2F; margin-top:5px;">
                                <strong>${event.availableSlots}</strong> slots remaining 
                                (Booked: ${totalBooked})
                            </p>
                        </div>
                        <div style="text-align:right;">
                            <span style="background:#e8f5e9; color:#2e7d32; padding: 4px 8px; border-radius:10px; font-size:10px; font-weight:bold;">
                                ${event.status}
                            </span>
                            <br><br>
                            
                            <button onclick="openEventDetails('${eventId}')" 
                                style="background:none; border:none; color:#1976D2; cursor:pointer; font-size: 14px; text-decoration:underline; margin-right:10px;">
                                View Details
                            </button>

                            <button onclick="cancelEvent('${eventId}', ${totalBooked})" 
                                style="background:none; border:none; color:#D32F2F; cursor:pointer; font-size: 14px; text-decoration:underline;">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;
            eventsList.innerHTML += eventCard;
            index++;
        });

    } catch (error) {
        console.error("Error loading events:", error);
        loadingMsg.innerHTML = `<span style="color:red">Error loading data. Check console.</span>`;
    }
}

// 3. View Details Modal Function (Exposed to Window)
window.openEventDetails = async function(eventId) {
    try {
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return;
        
        const data = docSnap.data();
        
        // Fill Modal Data
        document.getElementById('detailVenue').innerText = data.venue;
        document.getElementById('detailDate').innerText = data.date;
        document.getElementById('detailHospital').innerText = data.assignedHospitalName || "Unassigned";
        
        // Handle Priority Array (Multi-select)
        let priorityText = "Any";
        if (Array.isArray(data.priorityBlood)) {
            priorityText = data.priorityBlood.join(", ");
        } else if (data.priorityBlood) {
            priorityText = data.priorityBlood;
        }
        document.getElementById('detailTypes').innerText = priorityText;

        // Render Slot Breakdown
        const list = document.getElementById('slotDetailsList');
        list.innerHTML = "";
        
        if (data.timeSlots) {
            data.timeSlots.forEach(slot => {
                const booked = slot.booked || 0;
                list.innerHTML += `
                    <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:3px;">
                        <span>${slot.time}</span>
                        <span style="color:${booked > 0 ? '#2e7d32' : '#888'}">
                            ${booked} / ${slot.cap} booked
                        </span>
                    </div>
                `;
            });
        }
        
        // Show Modal
        document.getElementById('detailsModal').style.display = 'flex';

    } catch (e) {
        console.error(e);
        alert("Could not load details.");
    }
};

// 4. Cancel Event Function
window.cancelEvent = async function(eventId, currentBookings) {
    let confirmAction = confirm("Are you sure you want to cancel this event? This cannot be undone.");
    
    if (confirmAction) {
        if (currentBookings > 0) {
            alert("Cannot delete: " + currentBookings + " donors have already booked slots. Please contact Admin.");
            return;
        }

        try {
            await deleteDoc(doc(db, "events", eventId));
            alert("Event has been cancelled.");
            location.reload(); 
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Something went wrong. Check console.");
        }
    }
};
