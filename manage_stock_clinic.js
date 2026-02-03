import { db } from "./firebase.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 
    "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ======================
// LOAD BLOOD INVENTORY
// ======================
async function loadStock() {
    const table = document.getElementById("stockTable");
    const statusCard = document.getElementById("statusCard");
    table.innerHTML = "";
    let lowStockExists = false;

    try {
        const snapshot = await getDocs(collection(db, "bloodInventory Clinic"));
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
                    <td class="quantity ${status === "Low" ? "low" : "good"}">${data.Quantity}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-use" onclick="useUnit('${id}', ${data.Quantity})">Use</button>
                        <button class="btn btn-discard" onclick="discardUnit('${id}')">Discard</button>
                    </td>
                </tr>
            `;
        });

        statusCard.innerText = lowStockExists ? "Some blood types are low in stock!" : "All blood stocks are sufficient.";

    } catch (err) {
        console.error(err);
        table.innerHTML = `<tr><td colspan="4">Error loading stock</td></tr>`;
        statusCard.innerText = "Failed to load stock data.";
    }
}

// ======================
// ADD BLOOD UNIT (FIXED)
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
        const snap = await getDocs(collection(db, "bloodInventory Clinic"));
        let existingDoc = null;

        snap.forEach(d => {
            if (d.data().BloodType === bloodType) {
                existingDoc = { id: d.id, ...d.data() };
            }
        });

        // 🟢 IF BLOOD TYPE EXISTS → UPDATE QUANTITY
        if (existingDoc) {
            const newQty = existingDoc.Quantity + quantity;

            await updateDoc(doc(db, "bloodInventory Clinic", existingDoc.id), {
                Quantity: newQty,
                ExpiryDate: expiryDate, // overwrite with latest
                status: newQty < 5 ? "Low" : "Available",
                updatedAt: new Date()
            });

            alert(`${bloodType} stock updated. Total: ${newQty} units`);
        }
        // 🔵 IF BLOOD TYPE DOES NOT EXIST → ADD NEW
        else {
            await addDoc(collection(db, "bloodInventory Clinic"), {
                BloodType: bloodType,
                Quantity: quantity,
                ExpiryDate: expiryDate,
                status: quantity < 5 ? "Low" : "Available",
                updatedAt: new Date()
            });

            alert(`${bloodType} stock added to inventory`);
        }

        // reset form
        document.getElementById("bloodType").value = "";
        document.getElementById("quantity").value = "";
        document.getElementById("expiryDate").value = "";

        loadStock();

    } catch (error) {
        console.error(error);
        alert("Failed to add stock!");
    }
};

// ======================
// USE UNIT
// ======================
window.useUnit = async function (id, currentQty) {
    if (currentQty <= 0) return alert("No units left to use!");

    try {
        const docRef = doc(db, "bloodInventory Clinic", id);
        await updateDoc(docRef, {
            Quantity: currentQty - 1,
            status: currentQty - 1 < 5 ? "Low" : "Available",
            updatedAt: new Date()
        });
        loadStock();
    } catch (err) {
        console.error(err);
    }
};

// ======================
// DISCARD UNIT
// ======================
window.discardUnit = async function (id) {
    if (!confirm("Are you sure you want to discard this stock?")) return;
    try {
        const docRef = doc(db, "bloodInventory Clinic", id);
        await deleteDoc(docRef);
        loadStock();
    } catch (err) {
        console.error(err);
    }
};

// ======================
// BACK BUTTON
// ======================
window.goBack = () => { window.location.href = "hospital_clinic_dashboard.html"; };

// ======================
// INITIAL LOAD
// ======================
loadStock();