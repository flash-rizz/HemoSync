import { auth, db } from './firebase.js';
import { signOut, onAuthStateChanged } from
    "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Logged in as:", user.email);
        loadInventory();
    } else {
        console.log("User not logged in");
        window.location.href = "index.html"; //
    }
});

// ===============================
// LOAD BLOOD INVENTORY (FIREBASE)
// ===============================
async function loadInventory() {
    const inventoryBody = document.getElementById('inventoryBody');
    const stockStatus = document.getElementById('stockStatus');

    inventoryBody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;

    try {
        const q = query(
            collection(db, "bloodInventory"),
            where("status", "==", "Available")
        );

        const snapshot = await getDocs(q);

        inventoryBody.innerHTML = "";
        let isLowStock = false;

        if (snapshot.empty) {
            inventoryBody.innerHTML =
                `<tr><td colspan="3">No inventory available</td></tr>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            if (data.Quantity < 5) isLowStock = true;

            inventoryBody.innerHTML += `
                <tr style="${data.Quantity < 5 ? 'color:red;font-weight:bold;' : ''}">
                    <td>${data.BloodType}</td>
                    <td>${data.Quantity}</td>
                    <td>${data.ExpiryDate}</td>
                </tr>
            `;
        });

        // Update stock status text
        if (isLowStock) {
            stockStatus.innerText = "CRITICAL: Low Blood Stock!";
            stockStatus.style.color = "#d32f2f";
        } else {
            stockStatus.innerText = "Stock level normal";
            stockStatus.style.color = "#388e3c";
        }

    } catch (error) {
        console.error("Error loading inventory:", error);
        inventoryBody.innerHTML =
            `<tr><td colspan="3">Error loading data</td></tr>`;
    }
}

// ===============================
// LOGOUT (FIREBASE SIGN OUT)
// ===============================
document.getElementById("logoutBtn").addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
        signOut(auth)
            .then(() => {
                window.location.href = "index.html"; // 
            })
            .catch(err => {
                console.error("Logout error:", err);
                alert("Logout failed. Try again.");
            });
    }
});
