import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            populateForms(docSnap.data());
        }
    } else {
        window.location.href = "index.html";
    }
});

function populateForms(data) {
    if(data.fullname) document.getElementById('fullName').value = data.fullname;
    if(data.phone) document.getElementById('phone').value = data.phone;
    if(data.address) document.getElementById('address').value = data.address;

    if(data.dob) document.getElementById('dob').value = data.dob;
    if(data.gender) document.getElementById('gender').value = data.gender;
    if(data.weight) document.getElementById('weight').value = data.weight;
    if(data.bloodType) document.getElementById('bloodType').value = data.bloodType;

    const checkRadio = (name, value) => {
        if (!value) return; 
        const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) radio.checked = true;
    };
    checkRadio('disease', data.history_disease);
    checkRadio('tattoo', data.history_tattoo);
    checkRadio('pregnancy', data.history_pregnancy);
    checkRadio('drugs', data.history_drugs);
    checkRadio('sex_behavior', data.history_sex);
    checkRadio('meds', data.history_meds);

    if (data.isProfileComplete) {
        lockScreeningSection();
    }
}

function lockScreeningSection() {
    document.getElementById('lockedBanner').style.display = 'flex';
    document.getElementById('screeningIntro').style.display = 'none';
    document.getElementById('saveScreeningBtn').style.display = 'none';

    const form = document.getElementById('screeningForm');
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
        elements[i].disabled = true;
    }
}

document.getElementById('personalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = "Updating...";
    
    const updateData = {
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value
    };

    try {
        await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });
        alert("Contact information updated successfully.");
        btn.innerText = oldText;
    } catch (err) {
        console.error(err);
        alert("Error updating info.");
        btn.innerText = oldText;
    }
});

document.getElementById('screeningForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const dobValue = document.getElementById('dob').value;
    const dob = new Date(dobValue);
    
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
        age--;
    }

    if (age < 18 || age > 65) {
        alert("Not eligible to donate.\n\nReason: Donors must be between 18 and 65 years old.");
        return; 
    }


    const genderValue = document.getElementById('gender').value;
    const weight = parseFloat(document.getElementById('weight').value);
    
    const getRadioVal = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || "no";
    const disease = getRadioVal('disease');
    const tattoo = getRadioVal('tattoo');
    const pregnancy = getRadioVal('pregnancy');
    const drugs = getRadioVal('drugs');
    const sexBehavior = getRadioVal('sex_behavior');
    const meds = getRadioVal('meds');

    let isEligible = true;
    let rejectionReason = "";
    let status = "Eligible";

    if (weight < 45) { isEligible = false; rejectionReason = "Weight < 45kg"; }
    else if (disease === 'yes' || meds === 'yes') { isEligible = false; rejectionReason = "Medical History"; }
    else if (tattoo === 'yes' || pregnancy === 'yes') { isEligible = false; status = "Deferred"; rejectionReason = "Temporary Deferral"; }
    else if (drugs === 'yes' || sexBehavior === 'yes') { isEligible = false; status = "Ineligible"; rejectionReason = "High Risk Behavior"; }

    if (!isEligible && status === "Eligible") status = "Ineligible";

    const screeningData = {
        dob: dobValue,
        gender: genderValue,
        weight: weight,
        bloodType: document.getElementById('bloodType').value,
        history_disease: disease,
        history_tattoo: tattoo,
        history_pregnancy: pregnancy,
        history_drugs: drugs,
        history_sex: sexBehavior,
        history_meds: meds,
        
        isProfileComplete: true, 
        eligibilityStatus: status,
        rejectionReason: rejectionReason,
        lastScreeningDate: new Date()
    };

    try {
        await setDoc(doc(db, "users", currentUser.uid), screeningData, { merge: true });
        alert("Your screening information is saved.\n\nYour eligibility status: " + status);
        lockScreeningSection();
    } catch (err) {
        console.error(err);
        alert("Error saving screening data.");
    }
});