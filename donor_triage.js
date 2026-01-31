import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let selectedDonorDoc = null;
let selectedDonorData = null;

// 🔍 Search donor
window.searchDonor = async function () {
    const value = document.getElementById("searchInput").value.trim();
    if (!value) {
        alert("Enter Donor ID");
        return;
    }

    document.getElementById("statusCard").innerText = "Searching donor...";

    const q = query(collection(db, "donors"), where("donorId", "==", value));
    const snap = await getDocs(q);

    if (snap.empty) {
        document.getElementById("statusCard").innerText = "No donor found";
        return;
    }

    snap.forEach(d => {
        selectedDonorDoc = d.ref;
        selectedDonorData = d.data();

        document.getElementById("donorProfile").style.display = "block";
        document.getElementById("triageLog").style.display = "block";

        document.getElementById("donorName").innerText = selectedDonorData.name;
        document.getElementById("donorId").innerText = selectedDonorData.donorId;
        document.getElementById("bloodType").innerText = selectedDonorData.bloodType;
        document.getElementById("donorAge").innerText = selectedDonorData.age;
        document.getElementById("donorGender").innerText = selectedDonorData.gender;

        const statusEl = document.getElementById("eligibilityStatus");
        statusEl.innerText = selectedDonorData.status || "Pending";
        statusEl.className = "eligibility-status pending";
    });

    document.getElementById("statusCard").innerText = "Donor record loaded";
};

// ✅ Approve donor
window.approveDonor = async function () {
    if (!selectedDonorDoc) return;

    await updateDoc(selectedDonorDoc, {
        status: "Eligible"
    });

    await addDoc(collection(db, "donorTriage"), {
        donorId: selectedDonorData.donorId,
        action: "Approved",
        date: new Date()
    });

    alert("Donor Approved");
    document.getElementById("eligibilityStatus").innerText = "Eligible";
};

// ❌ Reject donor
window.rejectDonor = async function () {
    if (!selectedDonorDoc) return;

    await updateDoc(selectedDonorDoc, {
        status: "Not Eligible"
    });

    await addDoc(collection(db, "donorTriage"), {
        donorId: selectedDonorData.donorId,
        action: "Rejected",
        date: new Date()
    });

    alert("Donor Rejected");
    document.getElementById("eligibilityStatus").innerText = "Not Eligible";
};

// 🧹 Clear
window.clearSearch = function () {
    document.getElementById("searchInput").value = "";
    document.getElementById("donorProfile").style.display = "none";
    document.getElementById("triageLog").style.display = "none";
    document.getElementById("statusCard").innerText =
        "Search for donor to begin triage process";
};

// 🔙 Back
window.goBack = function () {
    window.location.href = "hospital_clinic_dashboard.html";
};
