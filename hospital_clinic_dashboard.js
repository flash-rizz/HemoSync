import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/* Firebase config – unchanged */
const firebaseConfig = {
    apiKey: "AIzaSyDmmZr7FuJV39cK_9WqabqS26doV04USgE",
    authDomain: "hemosync-765c9.firebaseapp.com",
    projectId: "hemosync-765c9",
    storageBucket: "hemosync-765c9.firebasestorage.app",
    messagingSenderId: "749126382362",
    appId: "1:749126382362:web:8852a1e895edbbea3072a3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* AUTH WATCHER */
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Authenticated as:", user.email);
        loadInventory();
    } else {
        window.location.href = "index.html";
    }
});

/* LOAD INVENTORY */
async function loadInventory() {
    const inventoryBody = document.getElementById('inventoryBody');
    const q = query(collection(db, "BloodUnit"), where("status", "==", "Available"));

    try {
        const querySnapshot = await getDocs(q);
        inventoryBody.innerHTML = "";
        let isLowStock = false;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.Quantity < 5) isLowStock = true;

            inventoryBody.innerHTML += `
                <tr style="${data.Quantity < 5 ? 'color:red;font-weight:bold;' : ''}">
                    <td>${data.BloodType}</td>
                    <td>${data.Quantity} units</td>
                    <td>${data.ExpiryDate}</td>
                    <td>
                        <button onclick="alert('Batch marked for use')"
                        style="border:none;background:none;color:#D32F2F;font-weight:600;cursor:pointer;">
                        Use
                        </button>
                    </td>
                </tr>
            `;
        });

        if (isLowStock) {
            document.getElementById('stockStatus').innerText =
                "CRITICAL: Low Stock Warning!";
            document.getElementById('alertCard').style.borderLeft =
                "6px solid #D32F2F";
        } else {
            document.getElementById('stockStatus').innerText =
                "All levels optimal.";
        }

    } catch (err) {
        console.error("Inventory load error:", err);
    }
}

/* DONOR TRIAGE */
window.performDonorSearch = async () => {
    const id = document.getElementById('donorIdInput').value;
    const resultDiv = document.getElementById('donorResult');

    if (!id) return;

    resultDiv.innerHTML = "Searching HemoSync records...";

    try {
        const docRef = doc(db, "users", id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            const data = snap.data();
            resultDiv.innerHTML = `
                <div style="background:#fff;padding:10px;border-radius:12px;border:1px solid #eee;">
                    <strong>Donor Name:</strong> ${data.fullname}<br>
                    <strong>Group:</strong> ${data.bloodType || 'Unknown'}<br>
                    <strong style="color:#D32F2F;">Allergies:</strong> ${data.allergies || 'None'}<br>
                    <strong>Eligibility:</strong> ${data.medicalHistory || 'Safe'}
                </div>
            `;
        } else {
            resultDiv.innerHTML =
                "<span style='color:red;'>No record found.</span>";
        }
    } catch {
        resultDiv.innerHTML = "Access denied.";
    }
};

/* UI HELPERS */
window.toggleSection = (id) => {
    document.querySelectorAll('.section-panel')
        .forEach(p => p.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

window.triggerRedAlert = () => {
    alert("SYSTEM BROADCAST: Urgent blood request sent.");
};

/* ✅ SAFE LOGOUT HANDLER */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('logoutBtn').onclick = () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    };
});
