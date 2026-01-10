// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Configuration
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

let currentUser = null;

// 1. Listen for Auth State & Load Existing Data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log("User detected:", user.uid);
        
        // Show loading state if needed
        document.querySelector('.btn-login').innerText = "Loading Profile...";

        // Fetch existing data
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // If profile is already marked as complete, populate the form
                if (data.isProfileComplete) {
                    populateForm(data);
                }
            }
            document.querySelector('.btn-login').innerText = "Save & Verify Eligibility";
        } catch (error) {
            console.error("Error fetching profile:", error);
        }

    } else {
        window.location.href = "index.html";
    }
});

// 2. Function to Pre-fill the Form
function populateForm(data) {
    console.log("Populating form with existing data...");

    // Basic Fields
    if(data.fullname) document.getElementById('fullName').value = data.fullname;
    if(data.dob) document.getElementById('dob').value = data.dob;
    if(data.gender) document.getElementById('gender').value = data.gender;
    if(data.weight) document.getElementById('weight').value = data.weight;
    if(data.bloodType) document.getElementById('bloodType').value = data.bloodType;

    // Helper to check radio buttons
    const checkRadio = (name, value) => {
        if (!value) return; 
        const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) radio.checked = true;
    };

    // Screening Questions (Assuming you saved these keys in Firebase previously)
    // If these keys don't exist in your DB yet, they will simply be skipped.
    checkRadio('disease', data.history_disease);
    checkRadio('tattoo', data.history_tattoo);
    checkRadio('pregnancy', data.history_pregnancy);
    checkRadio('drugs', data.history_drugs);
    checkRadio('sex_behavior', data.history_sex);
    checkRadio('meds', data.history_meds);
}

// 3. Handle Form Submission (Update/Save)
document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!currentUser) {
        alert("Error: You are not logged in.");
        return;
    }

    const submitBtn = document.querySelector('.btn-login');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;

    // --- Data Gathering ---
    const fullName = document.getElementById('fullName').value;
    const dob = new Date(document.getElementById('dob').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const bloodType = document.getElementById('bloodType').value;
    const gender = document.getElementById('gender').value;

    // Get Radios
    const getRadioVal = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || "no";
    
    const disease = getRadioVal('disease');
    const tattoo = getRadioVal('tattoo');
    const pregnancy = getRadioVal('pregnancy');
    const drugs = getRadioVal('drugs');
    const sexBehavior = getRadioVal('sex_behavior');
    const meds = getRadioVal('meds');

    // --- Logic / Eligibility Check ---
    let isEligible = true;
    let rejectionReason = "";
    let status = "Eligible";

    // A. Age Check
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    if (age < 18 || age > 65) {
        isEligible = false;
        rejectionReason = "Age must be between 18 and 65.";
    } else if (weight < 45) {
        isEligible = false;
        rejectionReason = "Weight must be at least 45kg.";
    } else if (disease === 'yes' || meds === 'yes') {
        isEligible = false;
        rejectionReason = "Medical history or current medication prevents donation.";
    } else if (tattoo === 'yes') {
        isEligible = false;
        rejectionReason = "Recent tattoos/piercings require 6-12 month deferral.";
        status = "Deferred";
    } else if (pregnancy === 'yes') {
        isEligible = false;
        rejectionReason = "Cannot donate while pregnant or breastfeeding.";
        status = "Deferred";
    } else if (drugs === 'yes' || sexBehavior === 'yes') {
        isEligible = false;
        rejectionReason = "High-risk history excludes donation.";
        status = "Ineligible";
    }

    if (!isEligible && status === "Eligible") status = "Ineligible";

    // --- Prepare Data Object ---
    const userProfile = {
        fullname: fullName,
        dob: dob.toISOString().split('T')[0],
        gender: gender,
        weight: weight,
        bloodType: bloodType,
        
        // Save screening answers so we can reload them later
        history_disease: disease,
        history_tattoo: tattoo,
        history_pregnancy: pregnancy,
        history_drugs: drugs,
        history_sex: sexBehavior,
        history_meds: meds,

        isProfileComplete: true,
        eligibilityStatus: status,
        rejectionReason: rejectionReason,
        lastUpdated: new Date()
    };

    // --- Save to Firestore ---
    try {
        await setDoc(doc(db, "users", currentUser.uid), userProfile, { merge: true });

        if (isEligible) {
            alert("Profile Verified! You are eligible to donate.");
            window.location.href = "donor_home.html";
        } else {
            alert("Profile Saved.\n\nStatus: " + status + "\nReason: " + rejectionReason);
            window.location.href = "donor_home.html";
        }

    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Error saving profile: " + error.message);
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
});