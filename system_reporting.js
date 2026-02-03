import { db } from "./firebase.js";
import { collection, getDocs } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

async function loadSystemReport(){

/* ================= BLOOD INVENTORY ================= */
const hospitalDiv = document.getElementById("hospitalInventory");
const clinicDiv = document.getElementById("clinicInventory");

hospitalDiv.innerHTML = `<strong style="font-size:13px;">🏥 Hospital Inventory</strong>`;
clinicDiv.innerHTML = `<strong style="font-size:13px;">🏥 Clinic Inventory</strong>`;

/* 🏥 HOSPITAL INVENTORY */
const hospitalSnap = await getDocs(collection(db,"bloodInventory"));

if(hospitalSnap.empty){
  hospitalDiv.innerHTML += `<div class="row">No hospital stock</div>`;
} else {
  hospitalSnap.forEach(doc=>{
    const d = doc.data();
    let cls = "good";
    if(d.Quantity <= 2) cls = "low";
    else if(d.Quantity <= 5) cls = "medium";

    hospitalDiv.innerHTML += `
      <div class="row">
        <span>${d.BloodType}</span>
        <span class="${cls}">${d.Quantity} units</span>
      </div>
    `;
  });
}

/* 🏥 CLINIC INVENTORY */
const clinicSnap = await getDocs(collection(db,"bloodInventory Clinic"));

if(clinicSnap.empty){
  clinicDiv.innerHTML += `<div class="row">No clinic stock</div>`;
} else {
  clinicSnap.forEach(doc=>{
    const d = doc.data();
    let cls = "good";
    if(d.Quantity <= 2) cls = "low";
    else if(d.Quantity <= 5) cls = "medium";

    clinicDiv.innerHTML += `
      <div class="row">
        <span>${d.BloodType}</span>
        <span class="${cls}">${d.Quantity} units</span>
      </div>
    `;
  });
}

/* ================= RED ALERT SUMMARY ================= */
const alertDiv = document.getElementById("alertSection");
alertDiv.innerHTML = `<h3><i class="fa-solid fa-triangle-exclamation"></i> Red Alert Summary</h3>`;

const alertSnap = await getDocs(collection(db,"RedAlerts"));

let critical = 0, high = 0, medium = 0;

alertSnap.forEach(doc=>{
  const a = doc.data();
  if(a.urgency === "Critical") critical++;
  else if(a.urgency === "High") high++;
  else medium++;
});

alertDiv.innerHTML += `
  <div class="row"><span>Critical Alerts</span><span class="low">${critical}</span></div>
  <div class="row"><span>High Alerts</span><span class="medium">${high}</span></div>
  <div class="row"><span>Medium Alerts</span><span>${medium}</span></div>
`;

/* ================= DELIVERY VERIFICATION SUMMARY ================= */
const deliveryDiv = document.getElementById("deliverySection");
deliveryDiv.innerHTML = `<h3><i class="fa-solid fa-truck-medical"></i> Delivery Verification Summary</h3>`;

const eventSnap = await getDocs(collection(db,"events"));

let verified = 0;
let rejected = 0;
let pending = 0;

eventSnap.forEach(doc=>{
  const d = doc.data();
  if(d.deliveryStatus === "Verified") verified++;
  else if(d.deliveryStatus === "Rejected") rejected++;
  else pending++;
});

deliveryDiv.innerHTML += `
  <div class="row"><span>Verified Deliveries</span><span class="good">${verified}</span></div>
  <div class="row"><span>Rejected Deliveries</span><span class="low">${rejected}</span></div>
  <div class="row"><span>Pending Verification</span><span class="medium">${pending}</span></div>
`;

/* ================= SYSTEM STATUS ================= */
const banner = document.getElementById("statusBanner");

if(critical > 0){
  banner.style.background="#ffebee";
  banner.style.borderLeft="6px solid #d32f2f";
  banner.innerHTML="🔴 System Warning: Critical blood shortage detected.";
} else {
  banner.style.background="#e8f5e9";
  banner.style.borderLeft="6px solid #2e7d32";
  banner.innerHTML="🟢 System Stable: All systems operational.";
}

}

loadSystemReport();