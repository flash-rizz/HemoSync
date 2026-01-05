import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// YOUR API KEYS
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

const nameInput = document.getElementById('pName');
const emailInput = document.getElementById('pEmail');
const roleInput = document.getElementById('pRole');

// 1. Load Current Data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            nameInput.value = data.fullname;
            emailInput.value = data.email;
            roleInput.value = data.role.toUpperCase();
        }
    } else {
        window.location.href = "index.html";
    }
});

// 2. Save Changes
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
        const docRef = doc(db, "users", user.uid);
        
        try {
            await updateDoc(docRef, {
                fullname: nameInput.value
            });
            alert("Profile updated successfully!");
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
});