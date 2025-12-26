import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDmmZr7FuJV39cK_9WqabqS26doV04USgE",
    authDomain: "hemosync-765c9.firebaseapp.com",
    projectId: "hemosync-765c9",
    storageBucket: "hemosync-765c9.firebasestorage.app",
    messagingSenderId: "749126382362",
    appId: "1:749126382362:web:8852a1e895edbbea3072a3",
    measurementId: "G-JP1Y251LN5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tableBody = document.getElementById('userTableBody');
const detailPanel = document.getElementById('userDetailsPanel');
const detailContent = document.getElementById('userDetailsContent');

// --- Functions ---

// 1. Initial Load: Fetch All Actors 
async function loadUsers(emailSearch = null) {
    tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding: 20px;'>Retrieving user directory...</td></tr>";
    
    let q = collection(db, "users");
    if (emailSearch) {
        q = query(q, where("email", "==", emailSearch)); // Search Service 
    }

    try {
        const querySnapshot = await getDocs(q);
        tableBody.innerHTML = "";

        if (querySnapshot.empty) {
            tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding: 20px;'>No matching accounts found.</td></tr>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const user = docSnap.data();
            const status = user.status || "Active";
            const statusColor = status === "Suspended" ? "#e74c3c" : "#2ecc71";

            const row = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 15px;">
                        <div style="font-weight:600;">${user.fullname}</div>
                        <div style="font-size:12px; color:#666;">${user.email}</div>
                    </td>
                    <td style="padding: 15px;"><span class="role-badge">${user.role}</span></td>
                    <td style="padding: 15px;">
                        <span style="color: white; background: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px;">
                            ${status}
                        </span>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        <button class="btn-login" style="padding: 5px 10px; font-size: 11px; margin:0;" onclick="viewUser('${docSnap.id}')">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Load Error:", error);
    }
}

// 2. View User Details (Integrated with top panel) 
window.viewUser = async (userId) => {
    try {
        const docSnap = await getDoc(doc(db, "users", userId));
        if (docSnap.exists()) {
            const u = docSnap.data();
            detailContent.innerHTML = `
                <div><strong style="color:#888; font-size:12px;">FULL NAME</strong><br>${u.fullname}</div>
                <div><strong style="color:#888; font-size:12px;">EMAIL ADDRESS</strong><br>${u.email}</div>
                <div><strong style="color:#888; font-size:12px;">ACCOUNT ROLE</strong><br><span class="role-badge">${u.role}</span></div>
                <div><strong style="color:#888; font-size:12px;">STATUS</strong><br>${u.status || 'Active'}</div>
            `;
            detailPanel.style.display = "block";
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll for mobile users
        }
    } catch (e) { console.error("View Error:", e); }
};

window.closeDetails = () => {
    detailPanel.style.display = "none";
};

// Event Listeners
document.getElementById('execSearchBtn').addEventListener('click', () => {
    loadUsers(document.getElementById('adminSearchInput').value.trim());
});

document.getElementById('clearSearchBtn').addEventListener('click', () => {
    document.getElementById('adminSearchInput').value = "";
    loadUsers();
});

// Load immediately on page open
loadUsers();