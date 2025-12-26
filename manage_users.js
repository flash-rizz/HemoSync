import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// State for Modal
let targetUserIdForSuspension = null;

// --- Functions ---

function renderUserRow(docSnap) {
    const user = docSnap.data();
    const status = user.status || "Active";
    const statusColor = status === "Suspended" ? "#e74c3c" : "#2ecc71";

    return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 15px;">
                <div style="font-weight:600; color:#222;">${user.fullname}</div>
                <div style="font-size:12px; color:#666;">${user.email}</div>
            </td>
            <td style="padding: 15px;"><span class="role-badge">${user.role}</span></td>
            <td style="padding: 15px;">
                <span style="color: white; background: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px;">
                    ${status}
                </span>
            </td>
            <td style="padding: 15px; text-align: center; display: flex; gap: 8px; justify-content: center;">
                <button class="btn-login" style="padding: 6px 12px; font-size: 11px; margin:0;" onclick="viewUser('${docSnap.id}')">
                    <i class="fa-solid fa-eye"></i> View
                </button>
                <button class="btn-logout" style="padding: 6px 12px; font-size: 11px; margin:0; background-color:#e74c3c;" 
                        onclick="confirmSuspension('${docSnap.id}', '${user.email}')">
                    <i class="fa-solid fa-user-slash"></i> Suspend
                </button>
            </td>
        </tr>`;
}

async function loadUsers(emailSearch = null) {
    tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding: 20px;'>Retrieving user directory...</td></tr>";
    let q = collection(db, "users");
    if (emailSearch) { q = query(q, where("email", "==", emailSearch)); }

    try {
        const querySnapshot = await getDocs(q);
        tableBody.innerHTML = "";
        if (querySnapshot.empty) {
            tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding: 20px;'>No matching accounts found.</td></tr>";
            return;
        }
        querySnapshot.forEach((docSnap) => { tableBody.innerHTML += renderUserRow(docSnap); });
    } catch (error) { console.error("Load Error:", error); }
}

// manage_users.js

// Function to toggle the suspension dropdown
window.toggleSuspensionDrop = () => {
    const content = document.getElementById('suspensionDropContent');
    const icon = document.getElementById('dropIcon');
    if (content.style.display === "none") {
        content.style.display = "block";
        icon.style.transform = "rotate(180deg)";
    } else {
        content.style.display = "none";
        icon.style.transform = "rotate(0deg)";
    }
};

window.viewUser = async (userId) => {
    try {
        const docSnap = await getDoc(doc(db, "users", userId));
        if (docSnap.exists()) {
            const u = docSnap.data();
            const status = u.status || 'Active';
            
            let detailsHTML = `
                <div><strong style="color:#888; font-size:12px;">FULL NAME</strong><br>${u.fullname}</div>
                <div><strong style="color:#888; font-size:12px;">EMAIL ADDRESS</strong><br>${u.email}</div>
                <div><strong style="color:#888; font-size:12px;">ACCOUNT ROLE</strong><br><span class="role-badge">${u.role}</span></div>
                <div><strong style="color:#888; font-size:12px;">STATUS</strong><br>${status}</div>
            `;

            // If suspended, create the "droppable" section
            if (status === "Suspended") {
                detailsHTML += `
                    <div style="grid-column: 1 / -1; margin-top: 10px; border: 1px solid #ffa39e; border-radius: 8px; overflow: hidden;">
                        <div onclick="toggleSuspensionDrop()" style="background: #fff1f0; padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                            <strong style="color:#cf1322; font-size:12px;">VIEW SUSPENSION REASON</strong>
                            <i id="dropIcon" class="fa-solid fa-chevron-down" style="transition: 0.3s; color:#cf1322;"></i>
                        </div>
                        <div id="suspensionDropContent" style="display: none; padding: 15px; background: white; border-top: 1px solid #ffa39e;">
                            <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;"><strong>Reason:</strong> ${u.suspensionReason || 'No reason provided'}</p>
                            <p style="margin: 0; color: #777; font-size: 12px;"><strong>Timestamp:</strong> ${u.suspendedAt ? new Date(u.suspendedAt).toLocaleString() : 'N/A'}</p>
                        </div>
                    </div>
                `;
            }

            detailContent.innerHTML = detailsHTML;
            detailPanel.style.display = "block";
            window.scrollTo({ top: 0, behavior: 'smooth' }); //
        }
    } catch (e) { console.error("View Error:", e); }
};

window.closeDetails = () => { detailPanel.style.display = "none"; };

// --- Use Case 4.1.1.2: Integrated Pop-up Logic ---

window.confirmSuspension = (userId, userEmail) => {
    targetUserIdForSuspension = userId;
    const modal = document.getElementById('suspensionModal');
    const targetText = document.getElementById('suspensionTargetText');
    
    targetText.innerText = `You are about to suspend access for ${userEmail}. The entity will no longer be able to log in.`;
    modal.style.display = 'flex'; 
};

window.closeSuspensionModal = () => {
    document.getElementById('suspensionModal').style.display = 'none';
    document.getElementById('suspensionReason').value = ""; 
};

document.getElementById('confirmModalBtn').addEventListener('click', async () => {
    const reason = document.getElementById('suspensionReason').value.trim();
    if (!reason) return alert("You must provide a reason for the audit log.");

    try {
        const userRef = doc(db, "users", targetUserIdForSuspension);
        // Step: Update Status in Database & Record activity log
        await updateDoc(userRef, {
            status: "Suspended",
            suspensionReason: reason,
            suspendedAt: new Date().toISOString()
        });
        
        alert("Entity has been successfully suspended.");
        closeSuspensionModal();
        loadUsers(); 
    } catch (error) {
        console.error("Suspension Error:", error);
    }
});

document.getElementById('cancelModalBtn').addEventListener('click', closeSuspensionModal);

// Event Listeners
document.getElementById('execSearchBtn').addEventListener('click', () => {
    loadUsers(document.getElementById('adminSearchInput').value.trim());
});

document.getElementById('clearSearchBtn').addEventListener('click', () => {
    document.getElementById('adminSearchInput').value = "";
    loadUsers();
});

loadUsers();