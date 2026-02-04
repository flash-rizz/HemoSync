import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ======================
// LOAD BLOOD INVENTORY
// ======================
async function loadStock() {
    const table = document.getElementById("stockTable");
    const statusCard = document.getElementById("statusCard");

    table.innerHTML = "";
    let lowStockExists = false;

    try {
        const snapshot = await getDocs(collection(db, "bloodInventory"));

        if (snapshot.empty) {
            table.innerHTML = `<tr><td colspan="4">No stock available</td></tr>`;
            statusCard.innerText = "No blood stock in inventory.";
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            const status = data.Quantity < 5 ? "Low" : "Available";
            if (status === "Low") lowStockExists = true;

            table.innerHTML += `
                <tr>
                    <td>${data.BloodType}</td>
                    <td class="quantity ${status === "Low" ? "low" : "good"}">
                        ${data.Quantity}
                    </td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-use"
                            onclick="useUnit('${id}', ${data.Quantity})">
                            Use
                        </button>
                        <button class="btn btn-discard"
                            onclick="discardUnit('${id}')">
                            Discard
                        </button>
                    </td>
                </tr>
            `;
        });

        statusCard.innerText = lowStockExists
            ? "Some blood types are low in stock!"
            : "All blood stocks are sufficient.";

    } catch (err) {
        console.error(err);
        table.innerHTML = `<tr><td colspan="4">Error loading stock</td></tr>`;
        statusCard.innerText = "Failed to load stock data.";
    }
}

// ======================
// ADD BLOOD STOCK
// ======================
window.addBloodUnit = async function () {
    const bloodType = document.getElementById("bloodType").value;
    const quantity = parseInt(document.getElementById("quantity").value);
    const expiryDate = document.getElementById("expiryDate").value;

    if (!bloodType || !quantity || !expiryDate) {
        alert("Please fill all fields!");
        return;
    }

    try {
        const snap = await getDocs(collection(db, "bloodInventory"));
        let existingDoc = null;

        snap.forEach(d => {
            if (d.data().BloodType === bloodType) {
                existingDoc = { id: d.id, ...d.data() };
            }
        });

        if (existingDoc) {
            const newQty = existingDoc.Quantity + quantity;

            await updateDoc(doc(db, "bloodInventory", existingDoc.id), {
                Quantity: newQty,
                ExpiryDate: expiryDate,
                status: newQty < 5 ? "Low" : "Available",
                updatedAt: new Date()
            });

            alert(`${bloodType} stock updated (${newQty} units)`);

        } else {
            await addDoc(collection(db, "bloodInventory"), {
                BloodType: bloodType,
                Quantity: quantity,
                ExpiryDate: expiryDate,
                status: quantity < 5 ? "Low" : "Available",
                updatedAt: new Date()
            });

            alert(`${bloodType} stock added`);
        }

        document.getElementById("bloodType").value = "";
        document.getElementById("quantity").value = "";
        document.getElementById("expiryDate").value = "";

        loadStock();

    } catch (error) {
        console.error(error);
        alert("Failed to add stock");
    }
};

// ======================
// USE BLOOD UNIT
// ======================
window.useUnit = async function (id, currentQty) {
    if (currentQty <= 0) {
        alert("No units left!");
        return;
    }

    await updateDoc(doc(db, "bloodInventory", id), {
        Quantity: currentQty - 1,
        status: currentQty - 1 < 5 ? "Low" : "Available",
        updatedAt: new Date()
    });

    loadStock();
};

// ======================
// DISCARD STOCK
// ======================
window.discardUnit = async function (id) {
    if (!confirm("Discard this stock?")) return;

    await deleteDoc(doc(db, "bloodInventory", id));
    loadStock();
};

// ======================
// BACK TO DASHBOARD
// ======================
window.goBack = () => {
    window.location.href = "hospital_clinic_dashboard.html";
};

// ======================
// INITIAL LOAD
// ======================
loadStock();
