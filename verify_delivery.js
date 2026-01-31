import { db } from "./firebase.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let deliveries = [];
let currentTab = "Delivered";

// Load deliveries from Firestore
async function loadDeliveries() {
    deliveries = [];
    const snap = await getDocs(collection(db,"Deliveries"));
    snap.forEach(d => {
        deliveries.push({
            id: d.id,
            ...d.data()
        });
    });
    renderDeliveries();
}

function renderDeliveries() {
    const list = document.getElementById("eventList");
    list.innerHTML = "";

    let filtered = deliveries.filter(e => {
        if(currentTab === "Delivered") return e.status === "Delivered";
        if(currentTab === "Confirmed") return e.status === "Confirmed";
        return true;
    });

    if(filtered.length === 0) {
        list.innerHTML = `<div class="empty">No events found</div>`;
        return;
    }

    filtered.forEach(e => {
        let card = document.createElement("div");
        card.className = "event-card";

        card.innerHTML = `
            <div class="event-title">${e.eventName}</div>
            <div class="event-info">Units Delivered: ${e.units}</div>
            <div class="event-info">Status: ${e.status}</div>
            ${e.status === "Delivered" ? `
                <div class="actions">
                    <button class="btn btn-confirm" onclick="confirmDelivery('${e.id}')">Confirm</button>
                    <button class="btn btn-flag" onclick="flagIssue('${e.id}')">Flag Issue</button>
                </div>` : ``}
        `;
        list.appendChild(card);
    });
}

// Confirm delivery
window.confirmDelivery = async (id) => {
    const ref = doc(db,"Deliveries",id);
    await updateDoc(ref,{ status:"Confirmed" });
    alert("Delivery verified & added to stock");
    loadDeliveries();
}

// Flag issue
window.flagIssue = async (id) => {
    const ref = doc(db,"Deliveries",id);
    await updateDoc(ref,{ status:"Issue" });
    alert("Issue flagged for investigation");
    loadDeliveries();
}

// Switch tabs
window.switchTab = (tab, btn) => {
    currentTab = tab;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    renderDeliveries();
}

// Go back
window.goBack = () => { window.location.href = "hospital_clinic_dashboard.html"; }

// Initial load
loadDeliveries();
