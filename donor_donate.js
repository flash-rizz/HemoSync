// --- 1. MOCK DATA (The events we want to show) ---
const availableEvents = [
    {
        id: 101,
        title: "MMU Cyberjaya Blood Drive",
        location: "Grand Hall, MMU Cyberjaya",
        date: "12 Jan, 2026",
        month: "JAN",
        day: "12",
        slots: [
            { time: "09:00 AM", available: true },
            { time: "10:00 AM", available: false }, 
            { time: "11:00 AM", available: true },
            { time: "01:00 PM", available: true },
            { time: "02:00 PM", available: true }
        ]
    },
    {
        id: 102,
        title: "Cyberjaya Community Club",
        location: "Clubhouse Main Lobby",
        date: "15 Jan, 2026",
        month: "JAN",
        day: "15",
        slots: [
            { time: "10:00 AM", available: true },
            { time: "11:00 AM", available: true },
            { time: "12:00 PM", available: true }
        ]
    }
];

let selectedBooking = null;

// --- 2. RUN WHEN PAGE LOADS ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Page Loaded. Running loadEvents()...");
    loadEvents();
});

function loadEvents() {
    const container = document.getElementById('eventsContainer');
    const loading = document.getElementById('loadingIndicator');

    if (!container) {
        alert("Error: Could not find <div id='eventsContainer'> in your HTML.");
        return;
    }

    // Simulate a network delay (makes it feel real)
    setTimeout(() => {
        // Hide loading spinner
        if(loading) loading.style.display = 'none';
        
        // Loop through data and create HTML
        availableEvents.forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-card';
            
            // Create buttons for each time slot
            let slotsHtml = '';
            event.slots.forEach((slot) => {
                const statusClass = slot.available ? '' : 'disabled';
                // Note: We use window.selectSlot because of type="module"
                slotsHtml += `
                    <button class="time-slot ${statusClass}" 
                        onclick="window.selectSlot(${event.id}, '${slot.time}', this)" 
                        ${!slot.available ? 'disabled' : ''}>
                        ${slot.time}
                    </button>
                `;
            });

            // Fill the card HTML
            card.innerHTML = `
                <div class="event-header">
                    <div class="event-details">
                        <h4>${event.title}</h4>
                        <p><i class="fa-solid fa-location-dot"></i> ${event.location}</p>
                    </div>
                    <div class="event-date">
                        <div>${event.day}</div>
                        <div>${event.month}</div>
                    </div>
                </div>
                <div class="slots-grid">
                    ${slotsHtml}
                </div>
            `;
            
            // Add card to the page
            container.appendChild(card);
        });
    }, 800); // 0.8 second delay
}

// --- 3. CLICK HANDLERS (Attached to Window) ---

window.selectSlot = function(eventId, time, element) {
    // 1. Remove 'selected' color from all other buttons
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    
    // 2. Add 'selected' color to clicked button
    element.classList.add('selected');

    // 3. Save selection
    const event = availableEvents.find(e => e.id === eventId);
    selectedBooking = {
        eventId: event.id,
        eventName: event.title,
        location: event.location,
        time: time
    };

    // 4. Show the popup modal
    openConfirmModal();
};

function openConfirmModal() {
    if(!selectedBooking) return;

    document.getElementById('modalEventName').innerText = selectedBooking.eventName;
    document.getElementById('modalTime').innerText = selectedBooking.time;
    document.getElementById('modalLocation').innerText = selectedBooking.location;
    
    // Show the modal (CSS handles the display:flex)
    document.getElementById('confirmModal').classList.add('active');
}

window.closeModal = function() {
    document.getElementById('confirmModal').classList.remove('active');
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    selectedBooking = null;
}

window.processBooking = function() {
    const btn = document.querySelector('.btn-primary');
    
    // Change button text to show it's working
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
    btn.disabled = true;

    setTimeout(() => {
        // Success state
        btn.innerText = "Confirmed!";
        btn.style.backgroundColor = "#4CAF50";

        setTimeout(() => {
            alert(`Booking Successful!\n\nAppointment confirmed for ${selectedBooking.eventName}.`);
            window.location.href = 'donor_home.html';
        }, 1000);

    }, 1500);
};