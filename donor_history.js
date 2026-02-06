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

    // dummy data delete later (ally)
    const fakeHistory = [
        {
            id: "demo_1",
            eventName: "Mega Blood Drive 2025",
            eventDate: "2025-06-15",
            status: "Completed",
            slotTime: "09:00 AM",
            location: "FCI MMU Cyberjaya"
        },
        {
            id: "demo_2",
            eventName: "Emergency Response Drive",
            eventDate: "2025-01-20",
            status: "Completed",
            slotTime: "02:30 PM",
            location: "MMU Cyberjaya"
        },
        {
            id: "demo_3",
            eventName: "Blood Donation Campaign",
            eventDate: "2025-11-28",
            status: "Completed",
            slotTime: "05:00 PM",
            location: "Tamarind Square"
        }
    ];

    try {
        const q = query(collection(db, "appointments"), where("donorId", "==", userId));
        const querySnapshot = await getDocs(q);
        
        loading.style.display = 'none';
        container.innerHTML = ""; 

        let allRecords = [...fakeHistory]; 
        querySnapshot.forEach((docSnap) => {
            allRecords.push({ id: docSnap.id, ...docSnap.data() });
        });

        allRecords.sort((a, b) => {
            if (a.status === 'Booked' && b.status !== 'Booked') return -1;
            if (a.status !== 'Booked' && b.status === 'Booked') return 1;

            if (a.status === 'Completed' && b.status === 'Completed') {
                const isRatedA = localStorage.getItem(`rated_${a.id}`) || a.rating;
                const isRatedB = localStorage.getItem(`rated_${b.id}`) || b.rating;
                if (!isRatedA && isRatedB) return -1;
                if (isRatedA && !isRatedB) return 1;
            }
            
            return 0;
        });

        allRecords.sort((a, b) => {
            if (a.status === 'Booked' && b.status !== 'Booked') return -1;
            if (a.status !== 'Booked' && b.status === 'Booked') return 1;
            return 0;
        });

        let totalDonations = 0;
        let hasData = false;

        allRecords.forEach(data => {
            hasData = true;
            if (data.status === 'Completed') totalDonations++;
            renderCard(data, container);
        });

        if (!hasData) {
            empty.style.display = 'block';
            if(totalCountEl) totalCountEl.innerText = "0";
        } else {
            empty.style.display = 'none';
            if(totalCountEl) totalCountEl.innerText = totalDonations;
        }

    } catch (error) {
        console.error("Error fetching history: ", error);
        loading.innerHTML = '<p style="color:red">Error loading history.</p>';
    }
}

function renderCard(data, container) {
    let displayDate = data.eventDate || "Unknown Date";
    let statusDisplay = data.status;
    let badgeClass = 'status-upcoming'; 
    let actionButton = '';

    if (data.status === 'Completed') {
        statusDisplay = "Success";
        badgeClass = 'status-done';
        
        const isRated = localStorage.getItem(`rated_${data.id}`) || data.rating;
        
        if(isRated) {
             actionButton = `<span style="color:orange; font-size:12px;"><i class="fa-solid fa-star"></i> Rated</span>`;
        } else {
             actionButton = `
                <button class="btn-rate" 
                    style="border:1px solid #FFD700; background:white; color: #DAA520; font-weight:bold; padding: 5px 10px; border-radius: 8px;"
                    onclick="openFeedbackModal('${data.id}', '${data.eventName}')">
                    <i class="fa-regular fa-star"></i> Rate
                </button>
            `;
        }
    } else if (data.status === 'Booked') {
        statusDisplay = "Upcoming";
        badgeClass = 'status-upcoming';
        actionButton = `
            <button class="btn-rate" 
                style="border:1px solid #D32F2F; color:#D32F2F; background:white; padding: 5px 10px; border-radius: 8px;"
                onclick="cancelAppointment('${data.id}', '${data.eventId}', '${data.slotTime}')">
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
        <div class="event-header" style="background: white; padding: 15px; border-radius: 15px; margin-bottom: 10px; border: 1px solid #eee;">
            <div class="event-details" style="flex: 1;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h4 style="font-size: 0.95rem; margin: 0;">${data.eventName || 'Blood Drive'}</h4>
                    <span class="status-badge ${badgeClass}" style="font-size: 10px; padding: 2px 8px; border-radius: 10px;">${statusDisplay}</span>
                </div>
                <p style="font-size: 12px; color: #666; margin: 5px 0;"><i class="fa-solid fa-location-dot"></i> ${data.location || "Cyberjaya"}</p>
                <p style="font-size: 12px; color: #666;"><i class="fa-regular fa-clock"></i> ${data.slotTime}</p>
                
                <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <p style="font-size: 11px; color: #999; margin:0;">${displayDate}</p>
                    <div id="action_${data.id}">${actionButton}</div>
                </div>
            </div>
        </div>
    `;
    container.appendChild(card);
}

window.openFeedbackModal = function(id, eventName) {
    currentEventId = id;
    currentRating = 0;
    document.getElementById('feedbackEventName').innerText = eventName;
    document.getElementById('feedbackText').value = ""; 
    document.getElementById('ratingLabel').innerText = "Tap a star to rate";
    
    document.querySelectorAll('.star-rating i').forEach(star => {
        star.style.color = "#ccc"; 
    });
    document.getElementById('feedbackModal').classList.add('active');
};

window.closeFeedbackModal = function() {
    document.getElementById('feedbackModal').classList.remove('active');
};

window.selectStar = function(value) {
    currentRating = value;
    document.getElementById('ratingLabel').innerText = `You rated: ${value} Stars`;
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach(star => {
        star.style.color = parseInt(star.getAttribute('data-value')) <= value ? "#FFD700" : "#ccc";
    });
};


window.submitFeedback = async function() {
    if (currentRating === 0) return alert("Please select at least 1 star!");

    const comment = document.getElementById('feedbackText').value;
    const btn = document.querySelector('#feedbackModal .btn-primary');
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        if (!currentEventId.startsWith('demo_')) {
            const appointmentRef = doc(db, "appointments", currentEventId);
            await updateDoc(appointmentRef, {
                rating: currentRating,
                feedbackComment: comment,
                ratedAt: new Date()
            });
        }
        
        localStorage.setItem(`rated_${currentEventId}`, 'true');
        const actionDiv = document.getElementById(`action_${currentEventId}`);
        if(actionDiv) actionDiv.innerHTML = `<span style="color:orange; font-size:12px;"><i class="fa-solid fa-star"></i> Rated</span>`;

        alert("Feedback saved successfully!");
        closeFeedbackModal();
    } catch (error) {
        alert("Error saving feedback: " + error.message);
    } finally {
        btn.innerText = "Submit Review";
        btn.disabled = false;
    }
};


window.cancelAppointment = async function(apptId, eventId, slotTime) {
    if (apptId.startsWith('demo_')) return alert("Demo records cannot be cancelled.");
    if (!confirm("Are you sure you want to cancel?")) return;

    try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
            const slots = eventSnap.data().timeSlots;
            const foundIndex = slots.findIndex(s => s.time === slotTime || formatTime(s.time) === slotTime);

            if (foundIndex !== -1 && slots[foundIndex].booked > 0) {
                slots[foundIndex].booked -= 1;
                await updateDoc(eventRef, { timeSlots: slots, availableSlots: increment(1) });
            }
        }

        await deleteDoc(doc(db, "appointments", apptId));
        localStorage.removeItem('hemoSyncAppointment');
        alert("Appointment cancelled.");
        location.reload();
    } catch (error) {
        console.error("Cancellation Error:", error);
    }
};

function formatTime(timeStr) {
    if(!timeStr || timeStr.includes("M")) return timeStr; 
    const [hour, min] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${min} ${ampm}`;
}