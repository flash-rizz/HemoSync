import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
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
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', loadNotifications);

async function loadNotifications() {
    const list = document.getElementById('notificationList');
    const loading = document.getElementById('loadingMsg');

    try {
        const q = query(collection(db, "RedAlerts"), where("status", "==", "ACTIVE"));
        const snapshot = await getDocs(q);

        loading.style.display = 'none';
        list.innerHTML = "";

        if (snapshot.empty) {
            list.innerHTML = `
                <div style="text-align:center; color:#888; padding:20px;">
                    <i class="fa-solid fa-check-circle" style="font-size:2rem; color:#4CAF50; margin-bottom:10px;"></i>
                    <p>No active emergencies.</p>
                </div>
            `;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.style.cssText = "background:#fff; border-left: 5px solid #d32f2f; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 15px;";
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <strong style="color:#d32f2f; font-size:1.1rem;">
                        <i class="fa-solid fa-triangle-exclamation"></i> RED ALERT
                    </strong>
                    <span style="background:#d32f2f; color:white; font-size:10px; padding:3px 8px; border-radius:12px;">${data.urgency || "CRITICAL"}</span>
                </div>
                <p style="margin: 10px 0; color:#333; font-size:14px;">
                    Hospital requires <strong>${data.units} units</strong> of <strong>${data.bloodType}</strong> blood immediately.
                </p>
                <div style="font-size:12px; color:#666; border-top:1px solid #eee; padding-top:8px; margin-top:8px;">
                    <i class="fa-regular fa-clock"></i> Required by: ${data.requiredBy ? data.requiredBy.replace('T', ' ') : 'ASAP'}
                </div>
            `;
            list.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading notifications:", error);
        loading.innerHTML = "Failed to load notifications.";
    }
}