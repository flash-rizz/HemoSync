import { auth, db } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const fullName = document.getElementById("fullName");
const email = document.getElementById("email");
const roleInput = document.getElementById("role");
const phone = document.getElementById("phone");
const address = document.getElementById("address");

let userId = null;

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    userId = user.uid;
    email.value = user.email;

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();

        fullName.value = data.fullName || "";
        roleInput.value = data.role || "Hospital / Clinic";
        phone.value = data.phone || "";
        address.value = data.address || "";

    } else {
        // SAFETY: create doc if missing
        await setDoc(userRef, {
            email: user.email,
            role: "Hospital / Clinic",
            fullName: "",
            phone: "",
            address: ""
        });
    }
});

// SAVE PROFILE
document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!userId) return;

    try {
        await updateDoc(doc(db, "users", userId), {
            fullName: fullName.value,
            phone: phone.value,
            address: address.value
        });

        alert("Profile updated successfully!");

    } catch (err) {
        console.error("Update failed:", err);
        alert("Failed to update profile");
    }
});

// Back button
window.goBack = () => {
    window.location.href = "hospital_clinic_dashboard.html";
};