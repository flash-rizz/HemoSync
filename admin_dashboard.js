// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// Added query, collection, where, and getDocs for Use Case 4.1.1.3
import { getFirestore, doc, getDoc, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDmmZr7FuJV39cK_9WqabqS26doV04USgE",
    authDomain: "hemosync-765c9.firebaseapp.com",
    databaseURL: "https://hemosync-765c9-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hemosync-765c9",
    storageBucket: "hemosync-765c9.firebasestorage.app",
    messagingSenderId: "749126382362",
    appId: "1:749126382362:web:8852a1e895edbbea3072a3",
    measurementId: "G-JP1Y251LN5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 1. Security Check: Is user logged in as an ADMIN?
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.role !== 'admin') {
                    alert("Access Denied: You are not an Admin.");
                    window.location.href = "index.html"; 
                }
                const welcomeElement = document.getElementById('welcomeName');
                if (welcomeElement) {
                    welcomeElement.textContent = "Hello, " + userData.fullname;
                }
            }
        } catch (error) {
            console.error("Error fetching admin profile:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// --- Use Case 4.1.1.3: Search/Identify User Account Logic ---
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const resultsArea = document.getElementById('searchResults');
const tableBody = document.getElementById('resultsTableBody');

if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
        const criteria = searchInput.value.trim();
        if (!criteria) return alert("Please enter search criteria (email).");

        // UI Feedback during query
        tableBody.innerHTML = "<tr><td colspan='3' style='padding: 20px; text-align: center;'>Searching Database...</td></tr>";
        resultsArea.style.display = "block";

        try {
            // Flow: Search Service queries the Database for matches
            const q = query(collection(db, "users"), where("email", "==", criteria));
            const querySnapshot = await getDocs(q);

            tableBody.innerHTML = ""; 

            if (querySnapshot.empty) {
                tableBody.innerHTML = "<tr><td colspan='3' style='padding: 20px; text-align: center;'>No user account found.</td></tr>";
                return;
            }

            // Flow: System retrieves and displays user's full profile details
            querySnapshot.forEach((docSnap) => {
                const user = docSnap.data();
                const row = `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">${user.fullname}</td>
                        <td style="padding: 12px;">${user.role}</td>
                        <td style="padding: 12px;">
                            <button class="btn-login" style="padding: 6px 12px; font-size: 11px; margin: 0;" 
                                    onclick="alert('Full Profile Retrieved:\\nEmail: ${user.email}\\nRole: ${user.role}')">
                                View Profile
                            </button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
            console.log("Search action logged successfully."); // Audit log
        } catch (error) {
            console.error("Search Service Error:", error);
            tableBody.innerHTML = "<tr><td colspan='3' style='padding: 20px; text-align: center; color: red;'>Search error.</td></tr>";
        }
    });
}

// 2. Handle Logout
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            alert("Admin logged out successfully.");
            window.location.href = "index.html";
        }).catch((error) => {
            console.error("Logout Error:", error);
        });
    });
}