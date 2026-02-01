import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// Added 'addDoc' and 'updateDoc' for stock and history updates
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, increment } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

const eventSelect = document.getElementById('eventSelect');
const attendanceSection = document.getElementById('attendanceSection');
const donorList = document.getElementById('donorList');

// 1. Auth & Load Events
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Load events created by this organiser
        const q = query(collection(db, "events"), where("organiserId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        eventSelect.innerHTML = '<option value="">Select an Event...</option>';
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            // We store hospitalId in the value so we can use it later
            eventSelect.innerHTML += `<option value="${doc.id}" data-hospital="${event.assignedHospitalId || ''}">${event.venue} (${event.date})</option>`;
        });
    } else {
        window.location.href = "index.html";
    }
});

// 2. Load Donors (Real Query)
eventSelect.addEventListener('change', async () => {
    const eventId = eventSelect.value;
    if(!eventId) {
        attendanceSection.style.display = "none";
        return;
    }

    attendanceSection.style.display = "block";
    donorList.innerHTML = "<p>Loading donors...</p>";

    try {
        // Query appointments for this specific event
        const q = query(collection(db, "appointments"), where("eventId", "==", eventId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            donorList.innerHTML = "<p style='color:#777;'>No donors have booked this event yet.</p>";
            return;
        }

        donorList.innerHTML = ""; // Clear loading message

        querySnapshot.forEach((docSnap) => {
            const apt = docSnap.data();
            const aptId = docSnap.id;
            
            // Check if already processed
            const isProcessed = apt.status === "Completed" || apt.status === "Absent";
            
            // Create the UI Card for the donor
            const div = document.createElement("div");
            div.className = "input-group";
            div.style.background = "#fff";
            div.style.padding = "10px";
            div.style.border = "1px solid #eee";
            div.style.borderRadius = "8px";
            div.style.marginBottom = "10px";
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.style.alignItems = "center";

            div.innerHTML = `
                <div>
                    <strong>${apt.donorName}</strong> <br>
                    <small>Type: ${apt.donorBloodType} | Time: ${apt.slotTime}</small><br>
                    <small style="color:${getColor(apt.status)}">Status: ${apt.status}</small>
                </div>
                <div id="actions-${aptId}">
                    ${isProcessed ? '<span>Verified</span>' : `
                        <button class="btn-login" style="padding:5px 10px; width:auto; background:#2ecc71; margin-right:5px;" 
                            onclick="markStatus('${aptId}', 'Completed', '${apt.donorId}', '${apt.donorBloodType}')">
                            Present
                        </button>
                        <button class="btn-login" style="padding:5px 10px; width:auto; background:#e74c3c;" 
                            onclick="markStatus('${aptId}', 'Absent', '${apt.donorId}', '${apt.donorBloodType}')">
                            Absent
                        </button>
                    `}
                </div>
            `;
            donorList.appendChild(div);
        });

    } catch (error) {
        console.error("Error loading donors:", error);
        donorList.innerHTML = "<p style='color:red;'>Error loading data.</p>";
    }
});

function getColor(status) {
    if(status === 'Completed') return 'green';
    if(status === 'Absent') return 'red';
    return 'orange';
}

// 3. Mark Status Function (Global window function to be accessible by HTML onclick)
window.markStatus = async function(aptId, status, donorId, bloodType) {
    if(!confirm(`Mark donor as ${status}?`)) return;

    // Get hospital ID from the dropdown selection we made earlier
    const selectedOption = eventSelect.options[eventSelect.selectedIndex];
    const hospitalId = selectedOption.getAttribute('data-hospital');

    try {
        // A. Update Appointment Status
        const aptRef = doc(db, "appointments", aptId);
        await updateDoc(aptRef, { status: status });

        // If "Present" (Completed), we do 2 extra things:
        if (status === "Completed") {
            
            // B. Auto Update Blood Stock for that Hospital
            if (hospitalId && hospitalId !== "Unassigned") {
                await updateHospitalStock(hospitalId, bloodType);
            } else {
                alert("Warning: No hospital assigned to event. Stock not updated.");
            }

            // C. Update Donor History (Donations Collection)
            await addDoc(collection(db, "donations"), {
                donorId: donorId,
                eventId: eventSelect.value,
                bloodType: bloodType,
                donationDate: new Date(),
                status: "Success",
                location: selectedOption.text
            });
            
            // Optional: Update Donor Last Donation Date
            await updateDoc(doc(db, "users", donorId), {
                lastDonationDate: new Date()
            });
        }

        alert("Attendance Marked!");
        // Refresh the list logic (simulate click)
        eventSelect.dispatchEvent(new Event('change'));

    } catch (error) {
        console.error("Error updating status:", error);
        alert("Error: " + error.message);
    }
};

// Helper to update stock
async function updateHospitalStock(hospitalId, bloodType) {
    // 1. Check if a stock record exists for this Hospital + Blood Type
    // Note: In a real app, 'bloodInventory' should have a 'hospitalId' field. 
    // We assume the schema is: { hospitalId, BloodType, Quantity, status }
    
    const q = query(
        collection(db, "bloodInventory"), 
        where("hospitalId", "==", hospitalId),
        where("BloodType", "==", bloodType)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // Doc exists, increment it
        querySnapshot.forEach(async (d) => {
            await updateDoc(d.ref, {
                Quantity: increment(1),
                updatedAt: new Date()
            });
        });
    } else {
        // Doc doesn't exist, create it
        await addDoc(collection(db, "bloodInventory"), {
            hospitalId: hospitalId,
            BloodType: bloodType,
            Quantity: 1,
            ExpiryDate: "2026-12-31", // Default expiry for demo
            status: "Available"
        });
    }
}
