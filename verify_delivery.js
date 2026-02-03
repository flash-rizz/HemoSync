import { db } from "./firebase.js";
import { collection, getDocs, doc, updateDoc }
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const eventList = document.getElementById("eventList");

async function loadDeliveries(){
    eventList.innerHTML = "";

    const snapshot = await getDocs(collection(db, "events"));

    if(snapshot.empty){
        eventList.innerHTML = `<div class="empty">No delivery records</div>`;
        return;
    }

    snapshot.forEach(docSnap=>{
        const d = docSnap.data();
        const id = docSnap.id;

        const rejectedClass = d.deliveryStatus === "Rejected" ? "rejected" : "";

        eventList.innerHTML += `
            <div class="event-card ${rejectedClass}">
                <div class="event-title">${d.venue || "Event"}</div>
                <div class="event-info">
                    Date: ${d.date || "-"}<br>
                    Blood Units: ${d.collectedUnits || "N/A"}<br>
                    Status: ${d.deliveryStatus || "Delivered"}
                </div>
                <div class="actions">
                    <button class="btn btn-confirm" onclick="verify('${id}')">Verify</button>
                    <button class="btn btn-reject" onclick="reject('${id}')">Reject</button>
                </div>
            </div>
        `;
    });
}

window.verify = async (id)=>{
    await updateDoc(doc(db,"events",id),{
        deliveryStatus:"Verified"
    });
    loadDeliveries();
};

window.reject = async (id)=>{
    await updateDoc(doc(db,"events",id),{
        deliveryStatus:"Rejected"
    });
    loadDeliveries();
};

window.goBack = ()=>{
    window.location.href="hospital_clinic_dashboard.html";
};

loadDeliveries();
