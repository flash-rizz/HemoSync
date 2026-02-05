import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
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

const tableBody = document.getElementById("userTableBody");
const mobileCards = document.getElementById("mobileUserCards");

const detailPanel = document.getElementById("userDetailsPanel");
const detailContent = document.getElementById("userDetailsContent");
const detailActions = document.getElementById("userDetailsActions");

const searchInput = document.getElementById("adminSearchInput");
const statusFilterSelect = document.getElementById("statusFilter");
const pendingHeadsUp = document.getElementById("pendingHeadsUp");
const pendingCounter = document.getElementById("pendingCounter");

const pageSizeSelect = document.getElementById("pageSizeSelect");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

const logoutBtn = document.getElementById("adminLogoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (e) {
      console.error("Logout error:", e);
      alert("Error logging out: " + e.message);
    }
  });
}

let targetUserIdForSuspension = null;

let currentPage = 1;
let pageSize = parseInt(pageSizeSelect.value, 10) || 20;

let cachedFilteredDocs = [];

function normalizeStatus(user) {
  if (user.status === "Suspended") return "Suspended";
  if (user.isProfileComplete === true) return "Active";
  return "Pending";
}

function statusToColor(status) {
  if (status === "Suspended") return "#e74c3c";
  if (status === "Pending") return "#f39c12";
  if (status === "Active") return "#2ecc71";
  return "#95a5a6";
}

function updateHeadsUpVisibility() {
  pendingHeadsUp.style.display =
    statusFilterSelect.value === "Pending" ? "block" : "none";
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

function sortDocsPendingFirst(docs, statusFilter) {
  return docs.slice().sort((a, b) => {
    const sa = normalizeStatus(a.data());
    const sb = normalizeStatus(b.data());

    if (statusFilter === "ALL") {
      const pa = sa === "Pending" ? 0 : 1;
      const pb = sb === "Pending" ? 0 : 1;
      if (pa !== pb) return pa - pb;
    }

    const na = (a.data().fullname || "").toLowerCase();
    const nb = (b.data().fullname || "").toLowerCase();
    return na.localeCompare(nb);
  });
}

window.unverifyUser = async function (userId, userEmail) {
  const ok = confirm(
    `Reset eligibility for ${userEmail}? This will move them back to Pending.`
  );
  if (!ok) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      isProfileComplete: false,
      status: "Pending",
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
  const ok = confirm(
    `Send reminder to ${userEmail}? (Temporary: opens email client)`
  );
  if (!ok) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      lastReminderAt: new Date().toISOString(),
      lastReminderBy: "admin"
    });

    await logAdminAction("REMIND_USER", { userId, userEmail });

    const subject = encodeURIComponent("HemoSync: Action Required");
    const body = encodeURIComponent(
      "Hi, please complete your eligibility screening in the app so your account can be activated."
    );
    window.location.href = `mailto:${userEmail}?subject=${subject}&body=${body}`;

    await refreshWithCurrentInputs();
  } catch (e) {
    console.error("Remind Error:", e);
    alert("Failed to send reminder: " + e.message);
  }
};

function renderUserRow(docSnap, index = 0) {
  const user = docSnap.data();

  const status = normalizeStatus(user);
  const statusColor = statusToColor(status);

  const showRemind = status === "Pending";
  const showUnverify = status === "Active";
  const showUnsuspend = status === "Suspended";

  const rowBg = status === "Pending" ? "background: #fffbe6;" : "";
  const delay = index * 0.1;

  return `
    <tr style="border-bottom: 1px solid #eee; animation-delay: ${delay}s; ${rowBg}">
      <td style="padding: 15px;">
        <div style="font-weight: 600; color: #222;">${user.fullname || "-"}</div>
        <div style="font-size: 12px; color: #777;">${user.email || "-"}</div>
      </td>

      <td style="padding: 15px; font-size: 13px; text-transform: capitalize;">
        ${user.role || "-"}
      </td>

      <td style="padding: 15px;">
        <span style="color: white; background: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px;">
          ${status}
        </span>
      </td>

      <td style="padding: 15px; text-align: center;">
        <div class="action-group">
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

          ${
            showUnsuspend
              ? `<button class="btn-login" style="padding: 6px 12px; font-size: 11px; margin: 0; background-color: #2ecc71; color: white;"
                   onclick="unsuspendUser('${docSnap.id}', '${user.email || ""}', ${user.isProfileComplete === true})">
                   <i class="fa-solid fa-user-check"></i> Unsuspend
                 </button>`
              : `<button class="btn-logout" style="padding: 6px 12px; font-size: 11px; margin: 0; background-color: #e74c3c; color: white;"
                   onclick="confirmSuspension('${docSnap.id}', '${user.email || ""}')">
                   <i class="fa-solid fa-user-slash"></i> Suspend
                 </button>`
          }
        </div>
      </td>
    </tr>
  `;
}

function renderUserCard(docSnap) {
  const user = docSnap.data();

  const status = normalizeStatus(user);
  const statusColor = statusToColor(status);

  const showRemind = status === "Pending";
  const showUnverify = status === "Active";
  const showUnsuspend = status === "Suspended";
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
        <button class="btn-login" style="margin: 0;" onclick="viewUser('${docSnap.id}')">
          <i class="fa-solid fa-eye"></i> View
        </button>

        ${
          showRemind
            ? `<button class="btn-login" style="margin: 0; background-color: #f39c12; color: white;"
                 onclick="remindUser('${docSnap.id}', '${user.email || ""}')">
                 <i class="fa-solid fa-envelope"></i> Remind
               </button>`
            : ``
        }

        ${
          showUnverify
            ? `<button class="btn-login" style="margin: 0; background-color: #6c757d; color: white;"
                 onclick="unverifyUser('${docSnap.id}', '${user.email || ""}')">
                 <i class="fa-solid fa-rotate-left"></i> Reset
               </button>`
            : ``
        }

        ${
          showUnsuspend
            ? `<button class="btn-login" style="margin: 0; background-color: #2ecc71; color: white;"
                 onclick="unsuspendUser('${docSnap.id}', '${user.email || ""}', ${user.isProfileComplete === true})">
                 <i class="fa-solid fa-user-check"></i> Unsuspend
               </button>`
            : `<button class="btn-logout" style="margin: 0; background-color: #e74c3c; color: white;"
                 onclick="confirmSuspension('${docSnap.id}', '${user.email || ""}')">
                 <i class="fa-solid fa-user-slash"></i> Suspend
               </button>`
        }
      </div>
    </div>
  `;
}

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

async function loadUsers(searchTerm = null, statusFilter = "ALL") {
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">Retrieving user directory.</td></tr>`;
  }
  if (mobileCards) {
    mobileCards.innerHTML = `<div style="text-align:center; padding: 10px; color:#777;">Retrieving user directory.</div>`;
  }

  try {
    const q = collection(db, "users");
    const querySnapshot = await getDocs(q);

    let docs = [];
    querySnapshot.forEach((d) => docs.push(d));

    docs = sortDocsPendingFirst(docs, statusFilter);

    const term = (searchTerm || "").trim().toLowerCase();
    let filtered = docs;

    if (term) {
      filtered = filtered.filter((d) => {
        const u = d.data();
        const name = (u.fullname || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return name.includes(term) || email.includes(term);
      });
    }

    if (statusFilter && statusFilter !== "ALL") {
      filtered = filtered.filter((d) => normalizeStatus(d.data()) === statusFilter);
    }

    cachedFilteredDocs = filtered;

    const pendingCount = docs.filter((d) => normalizeStatus(d.data()) === "Pending").length;
    setPendingCounter(pendingCount);

    updateHeadsUpVisibility();

    currentPage = 1;
    renderCurrentPage();
  } catch (e) {
    console.error("Load Users Error:", e);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color:red;">Failed to load users: ${e.message}</td></tr>`;
    }
    if (mobileCards) {
      mobileCards.innerHTML = `<div style="text-align:center; padding: 10px; color:red;">Failed to load users: ${e.message}</div>`;
    }
  }
}

async function refreshWithCurrentInputs() {
  const term = searchInput.value;
  const status = statusFilterSelect.value || "ALL";
  await loadUsers(term, status);
}

window.viewUser = async function (userId) {
  try {
    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      alert("User not found.");
      return;
    }

    const u = snap.data();

    detailContent.innerHTML = `
      <div><strong>Full Name:</strong><br>${u.fullname || "-"}</div>
      <div><strong>Email:</strong><br>${u.email || "-"}</div>
      <div><strong>Role:</strong><br>${u.role || "-"}</div>
      <div><strong>Status:</strong><br>${normalizeStatus(u)}</div>
      <div><strong>Phone:</strong><br>${u.phone || "-"}</div>
      <div><strong>IC / ID:</strong><br>${u.ic || "-"}</div>
      <div><strong>Gender:</strong><br>${u.gender || "-"}</div>
      <div><strong>Address:</strong><br>${u.address || "-"}</div>
      <div><strong>Blood Type:</strong><br>${u.bloodType || "-"}</div>
      <div><strong>Last Updated:</strong><br>${u.updatedAt || "-"}</div>
    `;

    if (detailActions) {
      detailActions.innerHTML = `
        <button class="btn-login" style="background: #D32F2F;" onclick="resetPasswordForUser('${u.email || ""}')">
          <i class="fa-solid fa-key"></i> Reset Password Email
        </button>
      `;
    }

    detailPanel.style.display = "block";
    detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    console.error("View User Error:", e);
    alert("Error loading user details: " + e.message);
  }
};

window.closeDetails = function () {
  detailPanel.style.display = "none";
  if (detailActions) detailActions.innerHTML = "";
};

window.resetPasswordForUser = async function (userEmail) {
  if (!userEmail) {
    alert("No email available for this user.");
    return;
  }

  const ok = confirm(`Send password reset email to ${userEmail}?`);
  if (!ok) return;

  try {
    await sendPasswordResetEmail(auth, userEmail);
    await logAdminAction("RESET_PASSWORD", { userEmail });
    alert("Password reset email sent.");
  } catch (e) {
    console.error("Reset Password Error:", e);
    alert("Failed to send reset email: " + e.message);
  }
};

window.confirmSuspension = function (userId, userEmail) {
  targetUserIdForSuspension = userId;

  const modal = document.getElementById("suspensionModal");
  const reasonInput = document.getElementById("suspensionReasonInput");

  if (reasonInput) reasonInput.value = "";
  if (modal) modal.style.display = "flex";
};

async function suspendUser(userId, reason) {
  try {
    await updateDoc(doc(db, "users", userId), {
      status: "Suspended",
      suspensionReason: reason || "Violation of terms",
      suspendedAt: new Date().toISOString(),
      suspendedBy: "admin"
    });

    await logAdminAction("SUSPEND_USER", { userId, reason });

    alert("User suspended successfully.");
    await refreshWithCurrentInputs();
  } catch (e) {
    console.error("Suspend Error:", e);
    alert("Failed to suspend user: " + e.message);
  }
}

window.unsuspendUser = async function (userId, userEmail, isProfileComplete) {
  const ok = confirm(`Unsuspend ${userEmail}?`);
  if (!ok) return;

  const nextStatus = isProfileComplete ? "Active" : "Pending";

  try {
    await updateDoc(doc(db, "users", userId), {
      status: nextStatus,
      suspensionReason: null,
      suspendedAt: null,
      suspendedBy: null,
      unsuspendedAt: new Date().toISOString(),
      unsuspendedBy: "admin"
    });

    await logAdminAction("UNSUSPEND_USER", { userId, userEmail, nextStatus });

    alert("User unsuspended successfully.");
    await refreshWithCurrentInputs();
  } catch (e) {
    console.error("Unsuspend Error:", e);
    alert("Failed to unsuspend user: " + e.message);
  }
};

document.getElementById("confirmSuspendBtn")?.addEventListener("click", async () => {
  const reason = document.getElementById("suspensionReasonInput")?.value?.trim();
  const modal = document.getElementById("suspensionModal");

  if (!targetUserIdForSuspension) return;

  await suspendUser(targetUserIdForSuspension, reason);

  if (modal) modal.style.display = "none";
  targetUserIdForSuspension = null;
});

document.getElementById("cancelSuspendBtn")?.addEventListener("click", () => {
  const modal = document.getElementById("suspensionModal");
  if (modal) modal.style.display = "none";
  targetUserIdForSuspension = null;
});

document.getElementById("execSearchBtn")?.addEventListener("click", async () => {
  await refreshWithCurrentInputs();
});

searchInput?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    await refreshWithCurrentInputs();
  }
});

document.getElementById("clearSearchBtn")?.addEventListener("click", async () => {
  searchInput.value = "";
  statusFilterSelect.value = "ALL";
  await refreshWithCurrentInputs();
});

statusFilterSelect?.addEventListener("change", async () => {
  await refreshWithCurrentInputs();
  updateHeadsUpVisibility();
});

pageSizeSelect?.addEventListener("change", async () => {
  pageSize = parseInt(pageSizeSelect.value, 10) || 20;
  currentPage = 1;
  renderCurrentPage();
});

prevPageBtn?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderCurrentPage();
  }
});

nextPageBtn?.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(cachedFilteredDocs.length / pageSize));
  if (currentPage < totalPages) {
    currentPage++;
    renderCurrentPage();
  }
});

refreshWithCurrentInputs();
