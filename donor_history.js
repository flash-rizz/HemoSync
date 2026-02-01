import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore, collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc, increment 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// Global Variables
let currentRating = 0;
let currentEventId = null;

// --- AUTHENTICATION CHECK ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadHistory(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

// --- MAIN FUNCTION: LOAD HISTORY ---
async function loadHistory(userId) {
    const container = document.getElementById('historyContainer');
    const loading = document.getElementById('loadingIndicator');
    const empty = document.getElementById('emptyState');
    const totalCountEl = document.getElementById('totalDonationCount');

    // Get submitted reviews from local storage
    const submittedReviews = JSON.parse(localStorage.getItem('hemoSyncReviews') || '[]');

    try {
        // Query 'appointments' collection
        const q = query(
            collection(db, "appointments"), 
            where("donorId", "==", userId)
        );

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
            
            // 1. Handle Display Data
            let displayDate = data.eventDate || "Unknown Date";
            let statusDisplay = data.status;
            let badgeClass = 'status-upcoming'; 
            let actionButton = '';

            // 2. Logic for Buttons based on Status
            if (data.status === 'Completed') {
                statusDisplay = "Success";
                badgeClass = 'status-done';
                totalDonations++;

                // Rate Button Logic
                if (submittedReviews.includes(recordId)) {
                    actionButton = `<button class="btn-rate disabled" disabled><i class="fa-solid fa-check"></i> Rated</button>`;
                } else {
                    const safeEventName = (data.eventName || "Event").replace(/'/g, "\\'");
                    actionButton = `<button class="btn-rate" onclick="window.openFeedbackModal('${recordId}', '${safeEventName}')"><i class="fa-regular fa-star"></i> Rate</button>`;
                }

            } else if (data.status === 'Booked') {
                statusDisplay = "Upcoming";
                badgeClass = 'status-upcoming';
                
                // NEW: Cancel Button Logic
                // We pass the Appointment ID, Event ID, and the Slot Time to the function
                actionButton = `
                    <button class="btn-rate" 
                        style="border:1px solid #D32F2F; color:#D32F2F; background:white;"
                        onclick="cancelAppointment('${recordId}', '${data.eventId}', '${data.slotTime}')">
                        Cancel
                    </button>
                `;

            } else if (data.status === 'Absent') {
                badgeClass = 'status-cancelled';
                actionButton = `<span style="font-size:12px; color:#999;">Marked Absent</span>`;
            }

            // 3. Render Card
            const card = document.createElement('div');
            card.className = 'event-card history-card';
            card.innerHTML = `
                <div class="event-header">
                    <div class="event-details" style="flex: 1;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <h4 style="font-size: 0.95rem; margin-bottom: 5px;">${data.eventName || 'Blood Drive'}</h4>
                            <span class="status-badge ${badgeClass}">${statusDisplay}</span>
                        </div>
                        <p><i class="fa-solid fa-location-dot"></i> Cyberjaya (See Details)</p>
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

// --- NEW: CANCEL APPOINTMENT FUNCTION ---
window.cancelAppointment = async function(apptId, eventId, slotTime) {
    if (!confirm("Are you sure you want to cancel this appointment? This action cannot be undone.")) return;

    try {
        const eventRef = doc(db, "events", eventId);
        
        // Step A: Get Event Data to find the slot
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
            const eventData = eventSnap.data();
            let slots = eventData.timeSlots;
            let foundIndex = -1;

            // Find the slot matching the time (e.g., "02:00 PM")
            // Note: slotTime comes from the Appointment doc, slots comes from Event doc
            slots.forEach((s, index) => {
                // Simple format check (assuming formatTime was consistent)
                if (formatTime(s.time) === slotTime || s.time === slotTime) {
                    foundIndex = index;
                }
            });

            if (foundIndex !== -1) {
                // Step B: Refund the slot (Decrease booked count)
                if (slots[foundIndex].booked > 0) {
                    slots[foundIndex].booked -= 1;
                }

                // Step C: Update Event (Increase available slots + Update array)
                await updateDoc(eventRef, {
                    timeSlots: slots,
                    availableSlots: increment(1)
                });
                console.log("Slot refunded to event.");
            }
        }

        // Step D: Delete the Appointment Document
        await deleteDoc(doc(db, "appointments", apptId));

        // Step E: Clean up Dashboard Reminder
        localStorage.removeItem('hemoSyncAppointment');

        alert("Appointment cancelled successfully.");
        location.reload();

    } catch (error) {
        console.error("Cancellation Error:", error);
        alert("Error cancelling: " + error.message);
    }
};

// Helper: Ensure time format matches for comparison
function formatTime(timeStr) {
    if(!timeStr) return "";
    if(timeStr.includes("M")) return timeStr; // Already AM/PM
    
    const [hour, min] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${ampm}`;
}

// --- FEEDBACK MODAL LOGIC (Existing) ---

window.openFeedbackModal = function(id, name) {
    currentEventId = id;
    currentRating = 0;
    document.getElementById('feedbackEventName').innerText = name;
    document.getElementById('feedbackText').value = '';
    updateStars();
    document.getElementById('feedbackModal').classList.add('active');
};

window.closeFeedbackModal = function() {
    document.getElementById('feedbackModal').classList.remove('active');
};

window.selectStar = function(rating) {
    currentRating = rating;
    updateStars();
};

function updateStars() {
    const stars = document.querySelectorAll('.star-rating i');
    const label = document.getElementById('ratingLabel');
    const labels = ["Tap a star", "Poor", "Fair", "Good", "Very Good", "Excellent!"];
    
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-value'));
        if (val <= currentRating) {
            star.classList.add('active');
            star.classList.remove('fa-regular'); // Remove hollow star
            star.classList.add('fa-solid');   // Add solid star
            star.style.color = "#FFD700";
        } else {
            star.classList.remove('active');
            star.classList.remove('fa-solid'); // Remove solid
            star.classList.add('fa-regular');  // Add hollow
            star.style.color = "#ddd";
        }
    });
    if(label) label.innerText = labels[currentRating];
}

window.submitFeedback = function() {
    if (currentRating === 0) {
        alert("Please select a star rating.");
        return;
    }

    let reviews = JSON.parse(localStorage.getItem('hemoSyncReviews') || '[]');
    reviews.push(currentEventId);
    localStorage.setItem('hemoSyncReviews', JSON.stringify(reviews));

    closeFeedbackModal();
    
    setTimeout(() => {
        alert("Thank You for your Feedback!");
        location.reload(); 
    }, 300);
};
