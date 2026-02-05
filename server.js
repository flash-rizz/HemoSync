const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

if (!SMTP_USER || !SMTP_PASS) {
  console.warn(
    "Missing SMTP_USER or SMTP_PASS. Set them before sending emails."
  );
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

app.post("/api/remind", async (req, res) => {
  const to = (req.body?.to || "").toString().trim();
  if (!to) {
    return res.status(400).json({ error: "Missing recipient email." });
  }

  if (!SMTP_USER || !SMTP_PASS) {
    return res
      .status(500)
      .json({ error: "SMTP not configured on server." });
  }

  const subject = "HemoSync: Complete Your Screening";
  const screeningUrl = `${APP_BASE_URL}/donor_profile.html?tab=screening`;
  const text = [
    "Hi,",
    "",
    "Please complete your eligibility screening so your account can be activated.",
    `Open the screening page here: ${screeningUrl}`,
    "",
    "If you're not logged in, you'll be asked to log in first.",
    "",
    "Thank you,",
    "HemoSync Team"
  ].join("\n");

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to,
      subject,
      text
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("SMTP send error:", err);
    return res.status(500).json({ error: "Failed to send email." });
  }
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`HemoSync server running on ${APP_BASE_URL}`);
});
