import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// 1. Auth Check
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.role !== 'organiser') {
                    alert("Access Denied.");
                    window.location.href = "index.html";
                }
                document.getElementById('welcomeName').textContent = "Hello, " + userData.fullname;
                
                // LOAD ALERTS AFTER LOGIN
                loadRedAlerts();
            }
        } catch (error) {
            console.error("Error:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// 2. Load Red Alerts
async function loadRedAlerts() {
    const container = document.getElementById('alertContainer');
    try {
        const q = query(collection(db, "RedAlerts"), where("status", "==", "ACTIVE"));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            container.innerHTML = ""; // Clear existing
            
            snapshot.forEach(doc => {
                const alert = doc.data();
                const div = document.createElement("div");
                // Styling for notification
                div.style.cssText = "background:#ffebee; border-left: 5px solid #d32f2f; padding: 10px; margin-bottom: 15px; border-radius: 5px; animation: fadeIn 1s;";
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:#d32f2f;"><i class="fa-solid fa-triangle-exclamation"></i> RED ALERT</strong>
                        <span style="font-size:11px; background:#d32f2f; color:white; padding:2px 6px; border-radius:10px;">${alert.urgency || "Critical"}</span>
                    </div>
                    <p style="font-size:13px; margin:5px 0 0 0; color:#333;">
                        Hospital needs <strong>${alert.units} units</strong> of <strong>${alert.bloodType}</strong>.
                    </p>
                `;
                container.appendChild(div);
            });
        }
    } catch (e) {
        console.error("Alert Error:", e);
    }
}

// 3. Logout
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}
