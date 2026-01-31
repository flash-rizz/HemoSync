import { db } from "./firebase.js";
import { collection, getDocs } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

async function loadSystemReport(){

/* ================= BLOOD INVENTORY ================= */
const inventoryDiv = document.getElementById("inventorySection");
const bloodSnap = await getDocs(collection(db,"bloodInventory"));

let inventory = {};
bloodSnap.forEach(doc=>{
  const d = doc.data();
  inventory[d.BloodType] = (inventory[d.BloodType] || 0) + (d.Quantity || 0);
});

if(Object.keys(inventory).length === 0){
  inventoryDiv.innerHTML += `<div class="row">No inventory data</div>`;
} else {
  Object.keys(inventory).forEach(type=>{
    let cls="good";
    if(inventory[type] <= 2) cls="low";
    else if(inventory[type] <= 5) cls="medium";

    inventoryDiv.innerHTML += `
      <div class="row">
        <span>${type}</span>
        <span class="${cls}">${inventory[type]} units</span>
      </div>`;
  });
}

/* ================= RED ALERT SUMMARY ================= */
const alertDiv = document.getElementById("alertSection");
const alertSnap = await getDocs(collection(db,"RedAlerts"));

let critical=0, high=0, medium=0;

alertSnap.forEach(doc=>{
  const a = doc.data();
  if(a.urgency==="Critical") critical++;
  else if(a.urgency==="High") high++;
  else medium++;
});

alertDiv.innerHTML += `
  <div class="row"><span>Critical Alerts</span><span class="low">${critical}</span></div>
  <div class="row"><span>High Alerts</span><span class="medium">${high}</span></div>
  <div class="row"><span>Medium Alerts</span><span>${medium}</span></div>
`;

/* ================= DONOR TRIAGE ================= */
const triageDiv = document.getElementById("triageSection");
const triageSnap = await getDocs(collection(db,"TriageLogs"));

let eligible=0, deferred=0;
triageSnap.forEach(doc=>{
  if(doc.data().status==="Eligible") eligible++;
  else deferred++;
});

triageDiv.innerHTML += `
  <div class="row"><span>Total Screened</span><span>${triageSnap.size}</span></div>
  <div class="row"><span>Eligible</span><span class="good">${eligible}</span></div>
  <div class="row"><span>Deferred</span><span class="low">${deferred}</span></div>
`;

/* ================= DELIVERY SUMMARY ================= */
const deliveryDiv = document.getElementById("deliverySection");
const deliverySnap = await getDocs(collection(db,"Deliveries"));

let verified=0, rejected=0;
deliverySnap.forEach(doc=>{
  if(doc.data().status==="Verified") verified++;
  else if(doc.data().status==="Rejected") rejected++;
});

deliveryDiv.innerHTML += `
  <div class="row"><span>Verified Deliveries</span><span class="good">${verified}</span></div>
  <div class="row"><span>Rejected</span><span class="medium">${rejected}</span></div>
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
