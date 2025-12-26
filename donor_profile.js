document.getElementById('profileForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // 1. Gather Personal Data
    const fullName = document.getElementById('fullName').value;
    const dob = new Date(document.getElementById('dob').value);
    const weight = parseFloat(document.getElementById('weight').value);
    
    // 2. Gather Screening Data (Radio Buttons)
    const disease = document.querySelector('input[name="disease"]:checked').value;
    const tattoo = document.querySelector('input[name="tattoo"]:checked').value;
    const pregnancy = document.querySelector('input[name="pregnancy"]:checked').value;
    const drugs = document.querySelector('input[name="drugs"]:checked').value;
    const sexBehavior = document.querySelector('input[name="sex_behavior"]:checked').value;
    const meds = document.querySelector('input[name="meds"]:checked').value;

    // 3. Initialize Logic
    let isEligible = true;
    let rejectionReason = "";

    // --- Eligibility Check ---

    // A. Age Check (Must be 18-65)
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    if (age < 18 || age > 65) {
        isEligible = false;
        rejectionReason = "Age must be between 18 and 65.";
    } 
    // B. Weight Check (Must be > 45kg)
    else if (weight < 45) {
        isEligible = false;
        rejectionReason = "Weight must be at least 45kg.";
    }
    // C. Major Health Conditions & Meds
    else if (disease === 'yes' || meds === 'yes') {
        isEligible = false;
        rejectionReason = "Medical history or current medication prevents donation.";
    }
    // D. Temporary Deferrals (Tattoo/Piercing)
    else if (tattoo === 'yes') {
        isEligible = false;
        rejectionReason = "Recent tattoos, piercings, or acupuncture require a 6-12 month deferral period.";
    }
    // E. Pregnancy / Miscarriage
    else if (pregnancy === 'yes') {
        isEligible = false;
        rejectionReason = "You cannot donate while pregnant, breastfeeding, or recently after a miscarriage (6 months deferral).";
    }
    // F. High Risk Behavior (Drugs / Sex)
    else if (drugs === 'yes') {
        isEligible = false;
        rejectionReason = "History of drug abuse permanently excludes you from blood donation.";
    }
    else if (sexBehavior === 'yes') {
        isEligible = false;
        rejectionReason = "High-risk sexual activities require a deferral period or permanent exclusion.";
    }

    // 4. Save Status to LocalStorage
    // This allows the Dashboard to know if the user is allowed to click 'Donate Now'
    const userProfile = {
        name: fullName,
        isProfileComplete: true,
        isEligible: isEligible,
        rejectionReason: rejectionReason
    };

    localStorage.setItem('hemoSyncUser', JSON.stringify(userProfile));

    // 5. User Feedback & Redirection
    if (isEligible) {
        alert("Profile Verified! You are eligible to donate.");
        window.location.href = "dashboard.html";
    } else {
        // We still save the profile so they don't have to fill it out again,
        // but we warn them they can't donate yet.
        alert("Profile Saved.\n\nStatus: NOT ELIGIBLE\nReason: " + rejectionReason + "\n\nYou will not be able to schedule donations at this time.");
        window.location.href = "dashboard.html";
    }
});