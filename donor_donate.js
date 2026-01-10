// --- 1. MOCK DATA ---
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

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
});

function loadEvents() {
    const container = document.getElementById('eventsContainer');
    const loading = document.getElementById('loadingIndicator');

    if (!container) return; // Safety check

    setTimeout(() => {
        if(loading) loading.style.display = 'none';
        
        availableEvents.forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-card';
            
            let slotsHtml = '';
            event.slots.forEach((slot) => {
                const statusClass = slot.available ? '' : 'disabled';
                slotsHtml += `
                    <button class="time-slot ${statusClass}" 
                        onclick="window.selectSlot(${event.id}, '${slot.time}', this)" 
                        ${!slot.available ? 'disabled' : ''}>
                        ${slot.time}
                    </button>
                `;
            });

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
            container.appendChild(card);
        });
    }, 800);
}

// --- 3. SELECTION LOGIC ---
window.selectSlot = function(eventId, time, element) {
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    const event = availableEvents.find(e => e.id === eventId);
    selectedBooking = {
        eventId: event.id,
        eventName: event.title,
        location: event.location,
        time: time
    };

    openConfirmModal();
};

function openConfirmModal() {
    if(!selectedBooking) return;
    document.getElementById('modalEventName').innerText = selectedBooking.eventName;
    document.getElementById('modalTime').innerText = selectedBooking.time;
    document.getElementById('modalLocation').innerText = selectedBooking.location;
    document.getElementById('confirmModal').classList.add('active');
}

window.closeModal = function() {
    document.getElementById('confirmModal').classList.remove('active');
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    selectedBooking = null;
}

// --- 4. BOOKING PROCESS (SAVES TO LOCALSTORAGE) ---
window.processBooking = function() {
    const btn = document.querySelector('.btn-primary');
    
    // UI Loading
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
    btn.disabled = true;

    setTimeout(() => {
        // 1. Get Event Details
        const event = availableEvents.find(e => e.id === selectedBooking.eventId);

        // 2. Create Appointment Object
        const appointmentData = {
            eventName: selectedBooking.eventName,
            location: selectedBooking.location,
            time: selectedBooking.time,
            date: event.date,
            day: event.day,
            month: event.month
        };

        // 3. Save to Storage (So Dashboard can see it)
        localStorage.setItem('hemoSyncAppointment', JSON.stringify(appointmentData));

        // 4. Success & Redirect
        btn.innerText = "Confirmed!";
        btn.style.backgroundColor = "#4CAF50";

        setTimeout(() => {
            alert(`Booking Successful!\n\nReminder set for ${selectedBooking.eventName}.`);
            window.location.href = 'donor_home.html';
        }, 1000);

    }, 1500);
};