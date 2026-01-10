// Mock Data
const donationHistory = [
    { id: 301, event: "MMU Cyberjaya Blood Drive", location: "Grand Hall, MMU", date: "12 Jan, 2026", day: "12", month: "JAN", status: "Upcoming" },
    { id: 302, event: "Cyberjaya Community Club", location: "Clubhouse Lobby", date: "10 Oct, 2025", day: "10", month: "OCT", status: "Done" },
    { id: 303, event: "DPulze Shopping Centre", location: "Main Atrium", date: "15 Jun, 2025", day: "15", month: "JUN", status: "Done" },
    { id: 305, event: "Putrajaya Hospital", location: "Emergency Wing", date: "12 Dec, 2024", day: "12", month: "DEC", status: "Cancelled" }
];

let currentRating = 0;
let currentEventId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});

function loadHistory() {
    const container = document.getElementById('historyContainer');
    const loading = document.getElementById('loadingIndicator');
    const empty = document.getElementById('emptyState');

    // Get submitted reviews from storage (to handle "Review Already Submitted" alternative flow)
    const submittedReviews = JSON.parse(localStorage.getItem('hemoSyncReviews') || '[]');

    setTimeout(() => {
        loading.style.display = 'none';

        if (donationHistory.length === 0) {
            empty.style.display = 'block';
            return;
        }

        donationHistory.forEach(record => {
            const card = document.createElement('div');
            card.className = 'event-card history-card';

            let badgeClass = '';
            let actionButton = '';

            if (record.status === 'Done') {
                badgeClass = 'status-done';
                // CHECK: If already reviewed, show "Rated", else show "Rate" button
                if (submittedReviews.includes(record.id)) {
                    actionButton = `<button class="btn-rate disabled" disabled><i class="fa-solid fa-check"></i> Rated</button>`;
                } else {
                    // Precondition check: Only 'Done' events get the button
                    actionButton = `<button class="btn-rate" onclick="openFeedbackModal(${record.id}, '${record.event}')"><i class="fa-regular fa-star"></i> Rate</button>`;
                }
            } else if (record.status === 'Upcoming') {
                badgeClass = 'status-upcoming';
            } else if (record.status === 'Cancelled') {
                badgeClass = 'status-cancelled';
            }

            card.innerHTML = `
                <div class="event-header">
                    <div class="event-date" style="margin-right: 15px;">
                        <div>${record.day}</div>
                        <div>${record.month}</div>
                    </div>
                    <div class="event-details" style="flex: 1;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <h4 style="font-size: 0.95rem; margin-bottom: 5px;">${record.event}</h4>
                            <span class="status-badge ${badgeClass}">${record.status}</span>
                        </div>
                        <p><i class="fa-solid fa-location-dot"></i> ${record.location}</p>
                        
                        <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <p style="font-size: 0.75rem; color: #999; margin:0;">ID: #${record.id}</p>
                            ${actionButton}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }, 600);
}

// --- FEEDBACK MODAL LOGIC ---

window.openFeedbackModal = function(id, name) {
    currentEventId = id;
    currentRating = 0;
    document.getElementById('feedbackEventName').innerText = name;
    document.getElementById('feedbackText').value = '';
    updateStars(); // Reset stars
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
    
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-value'));
        if (val <= currentRating) {
            star.classList.add('active');
            star.classList.remove('fa-regular');
            star.classList.add('fa-solid');
        } else {
            star.classList.remove('active');
            star.classList.remove('fa-solid');
            star.classList.add('fa-regular'); // Outline star
        }
    });

    const labels = ["Tap a star", "Poor", "Fair", "Good", "Very Good", "Excellent!"];
    label.innerText = labels[currentRating];
}

window.submitFeedback = function() {
    // 1. Validation
    if (currentRating === 0) {
        alert("Please select a star rating.");
        return;
    }

    // 2. Process Submission (Mock Database)
    const feedback = document.getElementById('feedbackText').value;
    console.log(`Submitting Review for Event ${currentEventId}: ${currentRating} Stars. Comment: ${feedback}`);

    // 3. Save to LocalStorage to persist "Rated" state
    let reviews = JSON.parse(localStorage.getItem('hemoSyncReviews') || '[]');
    reviews.push(currentEventId);
    localStorage.setItem('hemoSyncReviews', JSON.stringify(reviews));

    // 4. Output Confirmation Message
    closeFeedbackModal();
    
    setTimeout(() => {
        alert("Thank You for your Feedback!");
        location.reload(); // Reload to update button to "Rated"
    }, 300);
};