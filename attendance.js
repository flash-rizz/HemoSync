import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, increment 
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

const eventSelect = document.getElementById('eventSelect');
const attendanceSection = document.getElementById('attendanceSection');
const donorList = document.getElementById('donorList');
const loadingMsg = document.getElementById('loadingMsg');
const emptyMsg = document.getElementById('emptyMsg');
const donorCount = document.getElementById('donorCount');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadOrganiserEvents(user.uid);
        
        // Auto-select if coming from dashboard shortcut
        const preSelectedId = localStorage.getItem('autoSelectEventId');
        if (preSelectedId) {
            eventSelect.value = preSelectedId;
            eventSelect.dispatchEvent(new Event('change')); 
            localStorage.removeItem('autoSelectEventId'); 
        }
    } else {
        window.location.href = "index.html";
    }
});

async function loadOrganiserEvents(uid) {
    try {
        const q = query(collection(db, "events"), where("organiserId", "==", uid));
        const querySnapshot = await getDocs(q);
        
        eventSelect.innerHTML = '<option value="">Select an Event...</option>';
        if (querySnapshot.empty) return;

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.dataset.hospital = event.assignedHospitalId || "";
            opt.innerText = `${event.venue} (${event.date})`;
            eventSelect.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

eventSelect.addEventListener('change', async () => {
    const eventId = eventSelect.value;
    attendanceSection.style.display = "none";
    donorList.innerHTML = "";
    emptyMsg.style.display = "none";
    if(!eventId) return;

    loadingMsg.style.display = "block";

    try {
        const q = query(collection(db, "appointments"), where("eventId", "==", eventId));
        const querySnapshot = await getDocs(q);

        loadingMsg.style.display = "none";
        attendanceSection.style.display = "block";
        donorCount.innerText = querySnapshot.size + " found";

        if (querySnapshot.empty) {
            emptyMsg.style.display = "block";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const apt = docSnap.data();
            const aptId = docSnap.id;
            
            const isProcessed = apt.status === "Completed" || apt.status === "Absent";
            let statusColor = isProcessed ? (apt.status === "Completed" ? "green" : "red") : "#666";

            const card = document.createElement("div");
            card.className = "input-group";
            card.style.cssText = "background:#fff; padding:12px; border:1px solid #eee; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;";

            card.innerHTML = `
                <div>
                    <strong>${apt.donorName || "Unknown"}</strong><br>
                    <small style="color:#555;">Blood: ${apt.donorBloodType}</small> | 
                    <small style="color:#555;">Time: ${apt.slotTime}</small><br>
                    <small style="font-weight:bold; color:${statusColor}">Status: ${apt.status}</small>
                </div>
                <div>
                    ${isProcessed ? 
                        `<i class="fa-solid fa-lock" style="color:#ccc;"></i>` : 
                        `
                        <button style="background:#2ecc71; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; margin-right:5px;" 
                            onclick="markStatus('${aptId}', 'Completed', '${apt.donorId}', '${apt.donorBloodType}')">
                            <i class="fa-solid fa-check"></i>
                        </button>
                        <button style="background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;" 
                            onclick="markStatus('${aptId}', 'Absent', '${apt.donorId}', '${apt.donorBloodType}')">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                        `
                    }
                </div>
            `;
            donorList.appendChild(card);
        });
    } catch (error) { console.error(error); }
});

// SILENT MARK STATUS (No Alert)
window.markStatus = async function(aptId, status, donorId, bloodType) {
    const selectedOption = eventSelect.options[eventSelect.selectedIndex];
    const hospitalId = selectedOption.dataset.hospital;

    try {
        const aptRef = doc(db, "appointments", aptId);
        await updateDoc(aptRef, { status: status });

        if (status === "Completed") {
            if (hospitalId && hospitalId !== "Unassigned") {
                await updateHospitalStock(hospitalId, bloodType);
                console.log("Inventory +1 updated silently.");
            }
        }
        // Refresh list silently
        eventSelect.dispatchEvent(new Event('change'));

    } catch (error) { console.error(error); }
};

async function updateHospitalStock(hospitalId, bloodType) {
    const q = query(collection(db, "bloodInventory"), where("hospitalId", "==", hospitalId), where("BloodType", "==", bloodType));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        querySnapshot.forEach(async (d) => {
            await updateDoc(d.ref, { Quantity: increment(1), updatedAt: new Date() });
        });
    } else {
        await addDoc(collection(db, "bloodInventory"), {
            hospitalId: hospitalId, BloodType: bloodType, Quantity: 1, ExpiryDate: "2026-12-31", status: "Available"
        });
    }
}