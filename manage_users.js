import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmmZr7FuJV39cK_9WqabqS26doV04USgE",
  authDomain: "hemosync-765c9.firebaseapp.com",
  projectId: "hemosync-765c9",
  storageBucket: "hemosync-765c9.firebasestorage.app",
  messagingSenderId: "749126382362",
  appId: "1:749126382362:web:8852a1e895edbbea3072a3",
  measurementId: "G-JP1Y251LN5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM
const tableBody = document.getElementById("userTableBody");
const mobileCards = document.getElementById("mobileUserCards");

const detailPanel = document.getElementById("userDetailsPanel");
const detailContent = document.getElementById("userDetailsContent");

const emailInput = document.getElementById("adminSearchInput");
const statusFilterSelect = document.getElementById("statusFilter");
const pendingHeadsUp = document.getElementById("pendingHeadsUp");
const pendingCounter = document.getElementById("pendingCounter");

const pageSizeSelect = document.getElementById("pageSizeSelect");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

// State
let targetUserIdForSuspension = null;

// Pagination state
let currentPage = 1;
let pageSize = parseInt(pageSizeSelect.value, 10) || 20;

// Cached docs for pagination
let cachedFilteredDocs = [];

// --- NEW LOGIC: Status based on Eligibility Check (isProfileComplete) ---
function normalizeStatus(user) {
  // 1. Suspension takes priority
  if (user.status === "Suspended") return "Suspended";

  // 2. If profile is complete (eligibility check done) -> Active
  if (user.isProfileComplete === true) return "Active";

  // 3. Otherwise -> Pending
  return "Pending";
}

function statusToColor(status) {
  if (status === "Suspended") return "#e74c3c";
  if (status === "Pending") return "#f39c12"; // Orange
  if (status === "Active") return "#2ecc71";  // Green
  return "#95a5a6";
}

function updateHeadsUpVisibility() {
  pendingHeadsUp.style.display = statusFilterSelect.value === "Pending" ? "block" : "none";
}

function setPendingCounter(count) {
  if (!pendingCounter) return;
  const span = pendingCounter.querySelector("span");
  if (span) span.innerText = `Pending: ${count}`;
}

async function logAdminAction(actionType, payload) {
  try {
    await addDoc(collection(db, "logs"), {
      actionType,
      payload: payload || {},
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Log action failed:", e);
  }
}

async function buildFirestoreQuery(emailSearch) {
  // Note: We fetch loosely and filter client-side for status
  // because status is now derived from isProfileComplete
  if (emailSearch) {
    return query(collection(db, "users"), where("email", "==", emailSearch));
  }
  return collection(db, "users");
}

function sortDocsPendingFirst(docs, statusFilter) {
  if (statusFilter !== "ALL") return docs;

  return docs.slice().sort((a, b) => {
    const sa = normalizeStatus(a.data());
    const sb = normalizeStatus(b.data());

    const pa = sa === "Pending" ? 0 : 1;
    const pb = sb === "Pending" ? 0 : 1;
    if (pa !== pb) return pa - pb;

    const na = (a.data().fullname || "").toLowerCase();
    const nb = (b.data().fullname || "").toLowerCase();
    return na.localeCompare(nb);
  });
}

// --- ACTIONS ---

// Note: "Verify" is removed because Active status is now automatic upon profile completion.

// "Unverify" now forces the user back to Pending by flagging profile as incomplete
window.unverifyUser = async function (userId, userEmail) {
  const ok = confirm(`Reset eligibility for ${userEmail}? This will move them back to Pending.`);
  if (!ok) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      isProfileComplete: false, // Forces status to Pending
      status: "Pending",        // Sync legacy field just in case
      unverifiedAt: new Date().toISOString(),
      unverifiedBy: "admin"
    });

    await logAdminAction("UNVERIFY_USER", { userId, userEmail });

    alert("User moved back to Pending.");
    await refreshWithCurrentInputs();
  } catch (e) {
    console.error("Unverify Error:", e);
    alert("Failed to reset user: " + e.message);
  }
};

window.remindUser = async function (userId, userEmail) {
  const ok = confirm(`Send reminder to ${userEmail}? (Temporary: opens email client)`);
  if (!ok) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      lastReminderAt: new Date().toISOString(),
      lastReminderBy: "admin"
    });

    await logAdminAction("REMIND_USER", { userId, userEmail });

    const subject = encodeURIComponent("HemoSync: Action Required");
    const body = encodeURIComponent("Hi, please complete your eligibility screening in the app so your account can be activated.");
    window.location.href = `mailto:${userEmail}?subject=${subject}&body=${body}`;

    await refreshWithCurrentInputs();
  } catch (e) {
    console.error("Remind Error:", e);
    alert("Failed to send reminder: " + e.message);
  }
};

// Desktop table row
function renderUserRow(docSnap, index = 0) {
  const user = docSnap.data();

  // Use new logic
  const status = normalizeStatus(user);
  const statusColor = statusToColor(status);

  // Logic: Pending users get Remind. Active users get Unverify. Suspended get nothing special here.
  const showRemind = status === "Pending";
  const showUnverify = status === "Active";

  const rowBg = status === "Pending" ? "background: #fffbe6;" : "";
  const delay = index * 0.1;

  return `
    <tr style="border-bottom: 1px solid #eee; animation-delay: ${delay}s; ${rowBg}">
      <td style="padding: 15px;">
        <div style="font-weight: 600; color: #222;">${user.fullname || "-"}</div>
        <div style="font-size: 12px; color: #666;">${user.email || "-"}</div>
      </td>

      <td style="padding: 15px;">
        <span class="role-badge">${user.role || "-"}</span>
      </td>

      <td style="padding: 15px;">
        <span style="color: white; background: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px;">
          ${status}
        </span>
      </td>

      <td style="padding: 15px; text-align: center; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        <button class="btn-login" style="padding: 6px 12px; font-size: 11px; margin: 0;" onclick="viewUser('${docSnap.id}')">
          <i class="fa-solid fa-eye"></i> View
        </button>

        ${
          showRemind
            ? `<button class="btn-login" style="padding: 6px 12px; font-size: 11px; margin: 0; background-color: #f39c12; color: white;"
                 onclick="remindUser('${docSnap.id}', '${user.email || ""}')">
                 <i class="fa-solid fa-envelope"></i> Remind
               </button>`
            : ``
        }

        ${
          showUnverify
            ? `<button class="btn-login" style="padding: 6px 12px; font-size: 11px; margin: 0; background-color: #6c757d; color: white;"
                 onclick="unverifyUser('${docSnap.id}', '${user.email || ""}')">
                 <i class="fa-solid fa-rotate-left"></i> Reset
               </button>`
            : ``
        }

        <button class="btn-logout" style="padding: 6px 12px; font-size: 11px; margin: 0; background-color: #e74c3c; color: white;"
          onclick="confirmSuspension('${docSnap.id}', '${user.email || ""}')">
          <i class="fa-solid fa-user-slash"></i> Suspend
        </button>
      </td>
    </tr>
  `;
}

// Mobile card
function renderUserCard(docSnap) {
  const user = docSnap.data();

  const status = normalizeStatus(user);
  const statusColor = statusToColor(status);

  const showRemind = status === "Pending";
  const showUnverify = status === "Active";
  const cardClass = status === "Pending" ? "user-card pending" : "user-card";

  return `
    <div class="${cardClass}">
      <div class="user-card-row">
        <div style="flex: 1;">
          <div class="label">Full name</div>
          <div class="value">${user.fullname || "-"}</div>
          <div class="subvalue">${user.email || "-"}</div>
        </div>

        <div style="display:flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <div class="status-pill" style="background:${statusColor};">
            <i class="fa-solid fa-circle"></i> ${status}
          </div>
          <div>
            <div class="label" style="text-align:right;">Role</div>
            <div class="value" style="text-align:right;">${user.role || "-"}</div>
          </div>
        </div>
      </div>

      <div class="user-card-actions">
        <button class="btn-login" style="padding: 10px 12px; font-size: 12px; margin: 0;" onclick="viewUser('${docSnap.id}')">
          <i class="fa-solid fa-eye"></i> View
        </button>

        ${
          showRemind
            ? `<button class="btn-login" style="padding: 10px 12px; font-size: 12px; margin: 0; background-color: #f39c12; color: white;"
                 onclick="remindUser('${docSnap.id}', '${user.email || ""}')">
                 <i class="fa-solid fa-envelope"></i> Remind
               </button>`
            : ``
        }

        ${
          showUnverify
            ? `<button class="btn-login" style="padding: 10px 12px; font-size: 12px; margin: 0; background-color: #6c757d; color: white;"
                 onclick="unverifyUser('${docSnap.id}', '${user.email || ""}')">
                 <i class="fa-solid fa-rotate-left"></i> Reset
               </button>`
            : ``
        }

        <button class="btn-logout" style="padding: 10px 12px; font-size: 12px; margin: 0; background-color: #e74c3c; color: white;"
          onclick="confirmSuspension('${docSnap.id}', '${user.email || ""}')">
          <i class="fa-solid fa-user-slash"></i> Suspend
        </button>
      </div>
    </div>
  `;
}

// Render both desktop + mobile from the same pageDocs
function renderCurrentPage() {
  if (tableBody) tableBody.innerHTML = "";
  if (mobileCards) mobileCards.innerHTML = "";

  const total = cachedFilteredDocs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageDocs = cachedFilteredDocs.slice(start, end);

  if (pageDocs.length === 0) {
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">No matching accounts found.</td></tr>`;
    }
    if (mobileCards) {
      mobileCards.innerHTML = `<div style="text-align:center; padding: 10px; color:#777;">No matching accounts found.</div>`;
    }
  } else {
    let index = 0;
    pageDocs.forEach((docSnap) => {
      if (tableBody) tableBody.innerHTML += renderUserRow(docSnap, index);
      if (mobileCards) mobileCards.innerHTML += renderUserCard(docSnap);
      index++;
    });
  }

  pageInfo.innerText = `Page ${currentPage} / ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

async function loadUsers(emailSearch = null, statusFilter = "ALL") {
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">Retrieving user directory...</td></tr>`;
  }
  if (mobileCards) {
    mobileCards.innerHTML = `<div style="text-align:center; padding: 10px; color:#777;">Retrieving user directory...</div>`;
  }

  try {
    const q = await buildFirestoreQuery(emailSearch);
    const querySnapshot = await getDocs(q);

    let docs = [];
    querySnapshot.forEach((d) => docs.push(d));

    // Calculate Pending Count based on new normalized logic
    const pendingCount = docs.reduce((acc, d) => acc + (normalizeStatus(d.data()) === "Pending" ? 1 : 0), 0);
    setPendingCounter(pendingCount);

    // Client-side filtering based on derived status
    const selected = (statusFilter || "ALL").trim();
    if (selected !== "ALL") {
      docs = docs.filter((d) => normalizeStatus(d.data()) === selected);
    }

    docs = sortDocsPendingFirst(docs, selected);

    cachedFilteredDocs = docs;
    renderCurrentPage();
  } catch (error) {
    console.error("Load Error:", error);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">Error loading users.</td></tr>`;
    }
    if (mobileCards) {
      mobileCards.innerHTML = `<div style="text-align:center; padding: 10px; color:#777;">Error loading users.</div>`;
    }
  }
}

async function refreshWithCurrentInputs() {
  updateHeadsUpVisibility();
  await loadUsers(emailInput.value.trim(), statusFilterSelect.value);
}

// Suspension dropdown
window.toggleSuspensionDrop = function () {
  const content = document.getElementById("suspensionDropContent");
  const icon = document.getElementById("dropIcon");
  if (!content || !icon) return;

  if (content.style.display === "none") {
    content.style.display = "block";
    icon.style.transform = "rotate(180deg)";
  } else {
    content.style.display = "none";
    icon.style.transform = "rotate(0deg)";
  }
};

// View user details
window.viewUser = async function (userId) {
  try {
    const docSnap = await getDoc(doc(db, "users", userId));
    if (!docSnap.exists()) return;

    const u = docSnap.data();
    const status = normalizeStatus(u); // Use new logic

    let detailsHTML = `
      <div><strong style="color:#888; font-size:12px;">FULL NAME</strong><br>${u.fullname || "-"}</div>
      <div><strong style="color:#888; font-size:12px;">EMAIL ADDRESS</strong><br>${u.email || "-"}</div>
      <div><strong style="color:#888; font-size:12px;">ACCOUNT ROLE</strong><br><span class="role-badge">${u.role || "-"}</span></div>
      <div><strong style="color:#888; font-size:12px;">STATUS</strong><br>${status}</div>
      <div><strong style="color:#888; font-size:12px;">ELIGIBILITY CHECK</strong><br>${u.isProfileComplete ? "Submitted" : "Not Submitted"}</div>

      <div style="grid-column: 1 / -1; margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
        <button onclick="initiatePasswordReset('${u.email || ""}', '${userId}')" class="btn-reset">
          <i class="fa-solid fa-key"></i> Send Password Reset Email
        </button>
        <p style="font-size: 11px; color: #999; margin-top: 5px;">
          This will email a secure link to the user to set a new password.
        </p>
      </div>
    `;

    if (status === "Suspended") {
      detailsHTML += `
        <div style="grid-column: 1 / -1; margin-top: 10px; border: 1px solid #ffa39e; border-radius: 8px; overflow: hidden;">
          <div onclick="toggleSuspensionDrop()" style="background: #fff1f0; padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <strong style="color:#cf1322; font-size:12px;">VIEW SUSPENSION REASON</strong>
            <i id="dropIcon" class="fa-solid fa-chevron-down" style="transition: 0.3s; color:#cf1322;"></i>
          </div>
          <div id="suspensionDropContent" style="display: none; padding: 15px; background: white; border-top: 1px solid #ffa39e;">
            <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
              <strong>Reason:</strong> ${u.suspensionReason || "No reason provided"}
            </p>
            <p style="margin: 0; color: #777; font-size: 12px;">
              <strong>Timestamp:</strong> ${u.suspendedAt ? new Date(u.suspendedAt).toLocaleString() : "N/A"}
            </p>
          </div>
        </div>
      `;
    }

    detailContent.innerHTML = detailsHTML;
    detailPanel.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    console.error("View Error:", e);
  }
};

window.closeDetails = function () {
  detailPanel.style.display = "none";
};

// Password reset
window.initiatePasswordReset = async function (email, userId) {
  const confirmed = confirm(`Are you sure you want to send a password reset link to ${email}?`);
  if (!confirmed) return;

  try {
    await sendPasswordResetEmail(auth, email);

    await updateDoc(doc(db, "users", userId), {
      lastAdminResetDate: new Date().toISOString(),
      lastAdminResetAction: "Password Reset Link Sent"
    });

    await logAdminAction("PASSWORD_RESET_SENT", { userId, email });

    alert("Success! Password reset instructions sent to email.");
  } catch (error) {
    console.error("Reset Error:", error);
    if (error.code === "auth/user-not-found") {
      alert("This email is not registered in the authentication system.");
    } else {
      alert("Error sending reset email: " + error.message);
    }
  }
};

// Suspend modal
window.confirmSuspension = function (userId, userEmail) {
  targetUserIdForSuspension = userId;

  const modal = document.getElementById("suspensionModal");
  const targetText = document.getElementById("suspensionTargetText");

  targetText.innerText = `You are about to suspend access for ${userEmail}. The entity will no longer be able to log in.`;
  modal.style.display = "flex";
};

window.closeSuspensionModal = function () {
  document.getElementById("suspensionModal").style.display = "none";
  document.getElementById("suspensionReason").value = "";
};

document.getElementById("confirmModalBtn").addEventListener("click", async () => {
  const reason = document.getElementById("suspensionReason").value.trim();
  if (!reason) return alert("You must provide a reason for the audit log.");

  try {
    await updateDoc(doc(db, "users", targetUserIdForSuspension), {
      status: "Suspended",
      suspensionReason: reason,
      suspendedAt: new Date().toISOString()
    });

    await logAdminAction("SUSPEND_USER", { userId: targetUserIdForSuspension, reason });

    alert("Entity has been successfully suspended.");
    closeSuspensionModal();
    await refreshWithCurrentInputs();
  } catch (error) {
    console.error("Suspension Error:", error);
  }
});

document.getElementById("cancelModalBtn").addEventListener("click", closeSuspensionModal);

// Events
document.getElementById("execSearchBtn").addEventListener("click", async () => {
  currentPage = 1;
  await refreshWithCurrentInputs();
});

document.getElementById("clearSearchBtn").addEventListener("click", async () => {
  emailInput.value = "";
  statusFilterSelect.value = "Pending"; // default to Pending
  updateHeadsUpVisibility();
  currentPage = 1;
  await refreshWithCurrentInputs();
});

statusFilterSelect.addEventListener("change", async () => {
  currentPage = 1;
  await refreshWithCurrentInputs();
});

// Pagination
pageSizeSelect.addEventListener("change", () => {
  pageSize = parseInt(pageSizeSelect.value, 10) || 20;
  currentPage = 1;
  renderCurrentPage();
});

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderCurrentPage();
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(cachedFilteredDocs.length / pageSize));
  if (currentPage < totalPages) {
    currentPage++;
    renderCurrentPage();
  }
});

// Initial load
statusFilterSelect.value = "Pending";
updateHeadsUpVisibility();
refreshWithCurrentInputs();