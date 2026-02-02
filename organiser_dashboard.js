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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.role !== 'organiser') {
                    window.location.href = "index.html";
                }
                document.getElementById('welcomeName').textContent = "Hello, " + userData.fullname;
                
                // CHECK FOR ALERTS TO SHOW RED DOT
                checkForNotifications();
            }
        } catch (error) { console.error(error); }
    } else {
        window.location.href = "index.html";
    }
});

// Logic to show Red Dot on Bell
async function checkForNotifications() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;

    try {
        const q = query(collection(db, "RedAlerts"), where("status", "==", "ACTIVE"));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            badge.style.display = "block"; // Show red dot
        } else {
            badge.style.display = "none";
        }
    } catch (e) { console.error(e); }
}

const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}