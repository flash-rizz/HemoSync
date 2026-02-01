import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

    const submittedReviews = JSON.parse(localStorage.getItem('hemoSyncReviews') || '[]');

    try {
        // CHANGED: Query 'appointments' instead of 'bookings'
        // CHANGED: Query field 'donorId' instead of 'userId'
        const q = query(
            collection(db, "appointments"), 
            where("donorId", "==", userId)
            // Note: If you get an index error, remove the orderBy temporarily
            // orderBy("createdAt", "desc") 
        );

        const querySnapshot = await getDocs(q);
        
        loading.style.display = 'none';

        if (querySnapshot.empty) {
            empty.style.display = 'block';
            if(totalCountEl) totalCountEl.innerText = "0";
            return;
        }

        let totalDonations = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const recordId = doc.id; 
            
            // Handle Date (Field name in appointments is 'eventDate')
            let displayDate = data.eventDate || "Unknown Date";

            // Determine Status
            // 'Booked' -> Upcoming
            // 'Completed' -> Done (Donation Successful)
            let statusDisplay = data.status;
            let badgeClass = 'status-upcoming'; // Default

            if (data.status === 'Completed') {
                statusDisplay = "Success";
                badgeClass = 'status-done';
                totalDonations++;
            } else if (data.status === 'Absent') {
                badgeClass = 'status-cancelled';
            }

            // Create Rating Button Logic
            let actionButton = '';
            if (data.status === 'Completed') {
                if (submittedReviews.includes(recordId)) {
                    actionButton = `<button class="btn-rate disabled" disabled><i class="fa-solid fa-check"></i> Rated</button>`;
                } else {
                    const safeEventName = (data.eventName || "Event").replace(/'/g, "\\'");
                    actionButton = `<button class="btn-rate" onclick="window.openFeedbackModal('${recordId}', '${safeEventName}')"><i class="fa-regular fa-star"></i> Rate</button>`;
                }
            } else {
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
                        <p><i class="fa-solid fa-location-dot"></i> Cyberjaya (See Details)</p>
                        
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

// --- FEEDBACK MODAL LOGIC (Kept the same) ---
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
            star.classList.remove('fa-solid');
            star.classList.add('fa-solid'); // Fix to ensure solid star
            star.style.color = "#FFD700";
        } else {
            star.classList.remove('active');
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
    // Update LocalStorage
    let reviews = JSON.parse(localStorage.getItem('hemoSyncReviews') || '[]');
    reviews.push(currentEventId);
    localStorage.setItem('hemoSyncReviews', JSON.stringify(reviews));

    closeFeedbackModal();
    setTimeout(() => { alert("Thank You for your Feedback!"); location.reload(); }, 300);
};