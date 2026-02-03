import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                loadMatchedEvents(userData.bloodType);
            }
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

async function loadMatchedEvents(userBloodType) {
    const list = document.getElementById('notifList');
    list.innerHTML = ""; 

    if (!userBloodType) {
        list.innerHTML = `<p style="text-align:center; padding:20px;">Please update your blood type in Profile to see alerts.</p>`;
        return;
    }

    try {
        const eventsRef = collection(db, "events");
        const q = query(eventsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        let count = 0;
        let readEvents = JSON.parse(localStorage.getItem('hemoReadEvents') || "[]");
        let listUpdated = false;

        const now = new Date();

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            
            const pBlood = String(event.priorityBlood || "").trim().toUpperCase();
            const uBlood = String(userBloodType || "").trim().toUpperCase();

            if (event.status !== "Published") return;

            if (pBlood !== uBlood) return;


            if (event.createdAt) {
                const createdDate = event.createdAt.toDate();
                const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
                if (diffDays > 7) return; 
            }

            count++;
            
            if (!readEvents.includes(doc.id)) {
                readEvents.push(doc.id);
                listUpdated = true;
            }

            let dateString = event.date || "Date TBA";
            let timeString = event.time || "--:--";
            
            const item = document.createElement('div');
            item.className = 'faq-item'; 
            item.style.padding = '15px';
            item.style.marginBottom = '10px';
            item.style.cursor = 'pointer';
            item.style.background = 'white';
            item.style.border = '1px solid #ffcdd2'; 
            item.style.borderLeft = '5px solid #D32F2F'; 
            item.style.borderRadius = '10px';

            item.onclick = () => window.location.href = 'donor_donate.html'; 

            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <h4 style="margin:0; font-size:14px; color:#D32F2F;">
                            <i class="fa-solid fa-triangle-exclamation"></i> ${event.eventName || "Urgent Blood Drive"}
                        </h4>
                        <p style="margin:5px 0 0; font-size:12px; color:#555;">
                            <i class="fa-solid fa-location-dot"></i> ${event.location || "Location TBD"} <br>
                            <span style="color:#888; font-size:11px;">
                                <i class="fa-regular fa-calendar"></i> ${dateString} &bull; ${timeString}
                            </span>
                        </p>
                    </div>
                    <div style="background:#ffebee; color:#D32F2F; padding:5px 10px; border-radius:8px; font-size:10px; font-weight:bold; white-space:nowrap; margin-left:10px; height: fit-content; border: 1px solid #ef9a9a;">
                        Type ${pBlood} Only
                    </div>
                </div>
            `;
            list.appendChild(item);
        });


        if (listUpdated) {
            localStorage.setItem('hemoReadEvents', JSON.stringify(readEvents));
        }

        if (count === 0) {
            list.innerHTML = `
                <div style="text-align:center; padding:40px 20px; color:#888;">
                    <i class="fa-regular fa-circle-check" style="font-size:2.5rem; margin-bottom:15px; display:block; color:#ddd;"></i>
                    <p style="font-size:0.9rem;">No urgent calls for Type <b>${userBloodType}</b> right now.</p>
                </div>
            `;
        }

    } catch (error) {
        console.error("Error loading events:", error);
        list.innerHTML = `<p style="text-align:center; color:red; font-size:0.9rem;">Unable to load alerts.</p>`;
    }
}