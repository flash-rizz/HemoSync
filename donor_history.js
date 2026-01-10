// --- MOCK DATABASE RECORDS ---
// In a real app, this comes from Firebase/Database based on UserID
const donationHistory = [
    {
        id: 301,
        event: "MMU Cyberjaya Blood Drive",
        location: "Grand Hall, MMU Cyberjaya",
        date: "12 Jan, 2026",
        day: "12",
        month: "JAN",
        status: "Upcoming" // From your Appointment logic
    },
    {
        id: 302,
        event: "Community Center Drive",
        location: "Cyberjaya Community Club",
        date: "10 Oct, 2025",
        day: "10",
        month: "OCT",
        status: "Done"
    },
    {
        id: 303,
        event: "Red Cross Mobile Unit",
        location: "DPulze Shopping Centre",
        date: "15 Jun, 2025",
        day: "15",
        month: "JUN",
        status: "Done"
    },
    {
        id: 304,
        event: "University Malaya Medical",
        location: "Block B, Lobby",
        date: "02 Feb, 2025",
        day: "02",
        month: "FEB",
        status: "Done"
    },
    {
        id: 305,
        event: "Emergency Drive",
        location: "Putrajaya Hospital",
        date: "12 Dec, 2024",
        day: "12",
        month: "DEC",
        status: "Cancelled" // Example of cancelled status
    }
];

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});

function loadHistory() {
    const container = document.getElementById('historyContainer');
    const loading = document.getElementById('loadingIndicator');
    const empty = document.getElementById('emptyState');

    // Simulate Network Delay
    setTimeout(() => {
        loading.style.display = 'none';

        // Use Case Step 4: Check if history is empty
        if (donationHistory.length === 0) {
            empty.style.display = 'block';
            return;
        }

        // Generate Cards
        donationHistory.forEach(record => {
            const card = document.createElement('div');
            card.className = 'event-card history-card';

            // Determine Badge Color based on status
            let badgeClass = '';
            if (record.status === 'Done') badgeClass = 'status-done';
            else if (record.status === 'Upcoming') badgeClass = 'status-upcoming';
            else if (record.status === 'Cancelled') badgeClass = 'status-cancelled';

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
                        <p style="font-size: 0.75rem; margin-top: 8px; color: #999;">
                            ID: #${record.id}
                        </p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    }, 600);
}