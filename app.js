// Import the functions we need from Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// TODO: Paste your firebaseConfig here
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Get HTML elements
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMessage');
const forgotPassLink = document.getElementById('forgotPasswordLink');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

// ---------------------------------------------------------
// 1. SHOW/HIDE PASSWORD LOGIC
// ---------------------------------------------------------
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        // Toggle the type attribute
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Toggle the eye / eye-slash icon
        this.classList.toggle('fa-eye-slash');
        this.classList.toggle('fa-eye');
    });
}

// ---------------------------------------------------------
// 2. FORGOT PASSWORD LOGIC (WITH NAME VERIFICATION)
// ---------------------------------------------------------
if (forgotPassLink) {
    forgotPassLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();

        // Check if input is empty
        if (!email) {
            errorMsg.style.color = "#f39c12"; 
            errorMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please enter your email address first.';
            return;
        }

        // Show loading state
        errorMsg.style.color = "#666";
        errorMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Checking account details...';

        try {
            // QUERY: Find user by email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                errorMsg.style.color = "red";
                errorMsg.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> No account found with this email.';
                return;
            }

            const docSnap = querySnapshot.docs[0];
            const userData = docSnap.data();

            // CHECK SUSPENSION
            if (userData.status === "Suspended") {
                errorMsg.style.color = "#e74c3c";
                errorMsg.innerHTML = `
                    <div style="animation: shake 0.5s;">
                        <strong><i class="fa-solid fa-ban"></i> Request Denied</strong><br>
                        <span style="font-size: 11px;">This account is suspended.</span>
                    </div>
                `;
                return;
            }

            // SECURITY CHECK: Verify Full Name
            const inputName = prompt(`Security Check: To reset the password for ${email}, please enter your Full Name exactly as registered:`);

            if (!inputName) {
                errorMsg.style.color = "#666";
                errorMsg.innerText = "Password reset cancelled.";
                return;
            }

            const dbName = (userData.fullname || "").trim().toLowerCase();
            const userProvidedName = inputName.trim().toLowerCase();

            if (dbName !== userProvidedName) {
                errorMsg.style.color = "red";
                errorMsg.innerHTML = '<i class="fa-solid fa-shield-halved"></i> <strong>Verification Failed.</strong> The name provided does not match our records.';
                return;
            }

            // PROCEED
            errorMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending reset link...';
            await sendPasswordResetEmail(auth, email);
            
            errorMsg.style.color = "green";
            errorMsg.innerHTML = '<i class="fa-solid fa-check-circle"></i> Verification passed! Reset link sent.';

        } catch (error) {
            console.error("Reset Error:", error);
            errorMsg.style.color = "red";
            errorMsg.textContent = "Error: " + error.message;
        }
    });
}

// ---------------------------------------------------------
// 3. LOGIN LOGIC
// ---------------------------------------------------------
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop page reload

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        errorMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying credentials...';
        errorMsg.style.color = "#666";

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();

                // SUSPENSION CHECK
                if (userData.status === "Suspended") {
                    await signOut(auth);
                    errorMsg.style.color = "#e74c3c";
                    errorMsg.innerHTML = `
                        <div style="animation: shake 0.5s;">
                            <strong><i class="fa-solid fa-ban"></i> Access Denied</strong><br>
                            <span style="font-size: 11px;">Your account has been suspended.</span><br>
                            <span style="font-size: 11px; color: #555; background: #ffe6e6; padding: 2px 5px; border-radius: 4px;">
                                Reason: ${userData.suspensionReason || "Violation of terms"}
                            </span>
                        </div>
                    `;
                    return;
                }

                const role = userData.role; 

                errorMsg.style.color = "green";
                errorMsg.textContent = "Login successful! Redirecting...";

                // REDIRECT
                setTimeout(() => {
                    if (role === 'donor') {
                        window.location.href = "donor_home.html";
                    } 
                    else if (role === 'organiser') {  
                        window.location.href = "organiser_dashboard.html";
                    } 
                    else if (role === 'medical') {
                        window.location.href = "hospital_clinic_dashboard.html";
                    }
                    else if (role === 'admin') {
                        window.location.href = "manage_users.html";
                    } 
                    else {
                        alert("Error: Role '" + role + "' is not recognized.");
                    }
                }, 800); 

            } else {
                errorMsg.textContent = "Error: User data not found in database.";
                await signOut(auth); 
            }

        } catch (error) {
            console.error("Login Error:", error.code);

            errorMsg.style.color = "red";
            if(error.code === 'auth/user-not-found') {
                errorMsg.textContent = "Account not found. Please Sign Up.";
            } else if (error.code === 'auth/wrong-password') {
                errorMsg.textContent = "Incorrect password.";
            } else if (error.code === 'auth/too-many-requests') {
                 errorMsg.textContent = "Too many failed attempts. Try again later.";
            } else {
                errorMsg.textContent = "Login failed: " + error.message;
            }
        }
    });
}

// Shake animation for error messages
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}`;
document.head.appendChild(styleSheet);