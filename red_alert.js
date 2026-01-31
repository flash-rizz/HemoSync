import { db } from "./firebase.js";
import { collection, addDoc } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

window.submitAlert = async function () {
    const bloodType = document.getElementById("bloodType").value;
    const units = parseInt(document.getElementById("units").value);
    const requiredBy = document.getElementById("requiredBy").value;
    const notes = document.getElementById("notes").value || "None";
    const doctor = document.getElementById("doctor").value || "N/A";

    if (!bloodType || !units || !requiredBy) {
        alert("Please fill all required fields.");
        return;
    }

    try {
        await addDoc(collection(db, "RedAlerts"), {
            bloodType,
            units,
            urgency,
            requiredBy,
            notes,
            doctor,
            status: "ACTIVE",
            createdAt: new Date()
        });

        alert("🚨 RED ALERT SUCCESSFULLY ISSUED!");
        // Optional: reset fields
        document.getElementById("bloodType").value = "";
        document.getElementById("units").value = "";
        document.getElementById("requiredBy").value = "";
        document.getElementById("notes").value = "";
        document.getElementById("doctor").value = "";
    } catch (error) {
        console.error(error);
        alert("Failed to issue alert. Check console.");
    }
};
