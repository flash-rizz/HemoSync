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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global Variables
let currentRating = 0;
let currentEventId = null;
let currentUser = null;

// --- AUTHENTICATION CHECK ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Load history only after we confirm who the user is
        loadHistory(user.uid);
    } else {
        // Redirect if not logged in (matches donor_profile.js behavior)
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
        // 1. Create Query: Get bookings for this user, sorted by date (newest first)
        // Ensure you have created the composite index in Firestore if the console warns you
        const q = query(
            collection(db, "bookings"), 
            where("userId", "==", userId),
            orderBy("bookingDate", "desc")
        );

        // 2. Fetch Data
        const querySnapshot = await getDocs(q);
        
        loading.style.display = 'none';

        // 3. Handle Empty State
        if (querySnapshot.empty) {
            empty.style.display = 'block';
            if(totalCountEl) totalCountEl.innerText = "0";
            return;
        }

        let totalDonations = 0;

        // 4. Render Cards
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const recordId = doc.id; 
            
            // Handle Timestamp conversion
            let dateObj = new Date();
            if (data.bookingDate && data.bookingDate.toDate) {
                dateObj = data.bookingDate.toDate();
            } else if (data.bookingDate) {
                dateObj = new Date(data.bookingDate);
            }

            const day = dateObj.getDate();
            const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
            const fullDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            // Count completed donations
            if (data.status === 'Done') totalDonations++;

            const card = document.createElement('div');
            card.className = 'event-card history-card';

            let badgeClass = '';
            let actionButton = '';

            // Handle Status UI
            if (data.status === 'Done') {
                badgeClass = 'status-done';
                if (submittedReviews.includes(recordId)) {
                    actionButton = `<button class="btn-rate disabled" disabled><i class="fa-solid fa-check"></i> Rated</button>`;
                } else {
                    // Escape quotes for safe HTML injection
                    const safeEventName = (data.eventName || "Event").replace(/'/g, "\\'");
                    actionButton = `<button class="btn-rate" onclick="window.openFeedbackModal('${recordId}', '${safeEventName}')"><i class="fa-regular fa-star"></i> Rate</button>`;
                }
            } else if (data.status === 'Upcoming') {
                badgeClass = 'status-upcoming';
                actionButton = `<button class="btn-rate" style="background:none; color:#555; border:1px solid #ddd; cursor:default;">Upcoming</button>`;
            } else if (data.status === 'Cancelled') {
                badgeClass = 'status-cancelled';
                actionButton = `<button class="btn-rate" style="background:none; color:#999; border:none;">Cancelled</button>`;
            }

            card.innerHTML = `
                <div class="event-header">
                    <div class="event-date" style="margin-right: 15px;">
                        <div>${day}</div>
                        <div>${month}</div>
                    </div>
                    <div class="event-details" style="flex: 1;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <h4 style="font-size: 0.95rem; margin-bottom: 5px;">${data.eventName || 'Unnamed Event'}</h4>
                            <span class="status-badge ${badgeClass}">${data.status}</span>
                        </div>
                        <p><i class="fa-solid fa-location-dot"></i> ${data.location || 'Unknown Location'}</p>
                        
                        <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <p style="font-size: 0.75rem; color: #999; margin:0;">${fullDate}</p>
                            ${actionButton}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Update Total Donations Count
        if(totalCountEl) totalCountEl.innerText = totalDonations;

    } catch (error) {
        console.error("Error fetching history: ", error);
        loading.innerHTML = '<p style="color:red">Error loading data. See console for details.</p>';
        
        // Hint for the developer if index is missing
        if(error.message.includes("requires an index")) {
            console.warn("FIREBASE ALERT: You need to create a Composite Index in Firestore for 'bookings' collection. Fields: userId (Ascending) + bookingDate (Descending).");
        }
    }
}

// --- FEEDBACK MODAL LOGIC ---

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
            star.classList.remove('fa-regular');
            star.classList.add('fa-solid');
        } else {
            star.classList.remove('active');
            star.classList.remove('fa-solid');
            star.classList.add('fa-regular');
        }
    });
    if(label) label.innerText = labels[currentRating];
}

window.submitFeedback = function() {
    if (currentRating === 0) {
        alert("Please select a star rating.");
        return;
    }

    const feedback = document.getElementById('feedbackText').value;
    console.log(`Submitting Review for Doc ID ${currentEventId}: ${currentRating} Stars. Comment: ${feedback}`);

    // Update LocalStorage to "remember" this was rated
    let reviews = JSON.parse(localStorage.getItem('hemoSyncReviews') || '[]');
    reviews.push(currentEventId);
    localStorage.setItem('hemoSyncReviews', JSON.stringify(reviews));

    closeFeedbackModal();
    
    setTimeout(() => {
        alert("Thank You for your Feedback!");
        location.reload(); 
    }, 300);
};