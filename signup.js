import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

const signupForm = document.getElementById("signupForm");
const errorMsg = document.getElementById("errorMessage");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullname = document.getElementById("fullname").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  errorMsg.textContent = "";

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("Account created for:", user.email);

    await setDoc(doc(db, "users", user.uid), {
      fullname: fullname,
      email: email,
      role: role,
      createdAt: new Date()
    });

    alert("Account created successfully! Please log in.");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error code:", error.code);

    if (error.code === "auth/email-already-in-use") {
      errorMsg.textContent = "This email is already registered.";
    } else if (error.code === "auth/weak-password") {
      errorMsg.textContent = "Password should be at least 6 characters.";
    } else {
      errorMsg.textContent = "Error: " + error.message;
    }
  }
});
