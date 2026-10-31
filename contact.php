<?php
/**
 * Codeloop - Contact Page (PHP + MySQL + Apache)
 */
require_once __DIR__ . '/config/db.php';

$sentSuccess = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['cName'] ?? '');
    $email = trim($_POST['cEmail'] ?? '');
    $subject = trim($_POST['cSubject'] ?? '');
    $msg = trim($_POST['cMsg'] ?? '');

    if ($name && $email && $msg) {
        $sentSuccess = true;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Contact Us – Codeloop</title>
<link rel="stylesheet" href="contact.css"/>
<link rel="stylesheet" href="light-theme.css"/>
</head>
<body>
<header><div class="header-inner">
  <a href="/" class="logo"><img class="logo-image" src="11zon_cropped.png" alt=""/>Codeloop</a>
  <a href="/" class="back-btn">← Back to Home</a>
</div></header>
<div class="page">
  <h1>Contact <span>Us</span></h1>
  <p class="sub">Have questions, suggestions, or want to submit an interview listing? We'd love to hear from you!</p>
  <div class="contact-grid">
    <div class="contact-info">
      <div class="contact-card">
        <div class="contact-icon icon-social">IG</div>
        <div>
          <h3>Instagram</h3>
          <a href="https://www.instagram.com/codeloop_yt/" target="_blank" rel="noopener noreferrer">@codeloop_yt</a>
          <p>Follow Codeloop for interview drives and updates.</p>
        </div>
      </div>
      <div class="contact-card">
        <div class="contact-icon icon-social">YT</div>
        <div>
          <h3>YouTube</h3>
          <a href="https://www.youtube.com/@CodeLoop-SP" target="_blank" rel="noopener noreferrer">Codeloop</a>
          <p>Watch our latest videos and updates.</p>
        </div>
      </div>
      <div class="contact-card">
        <div class="contact-icon icon-email">📧</div>
        <div>
          <h3>Email</h3>
          <a href="mailto:codeloop9563@gmail.com">codeloop9563@gmail.com</a>
          <p>We respond to all emails within 24 hours.</p>
        </div>
      </div>
      <div class="contact-card">
        <div class="contact-icon icon-loc">📍</div>
        <div>
          <h3>Location</h3>
          <p>Chennai, Tamil Nadu, India – 600 001</p>
          <p>Serving job seekers across all of India.</p>
        </div>
      </div>
    </div>
    <div class="form-card">
      <h2>Send us a Message</h2>
      <form method="POST" action="/contact">
        <div class="form-group">
          <label for="cName">Your Name *</label>
          <input type="text" id="cName" name="cName" required placeholder="e.g. Praveen Kumar"/>
        </div>
        <div class="form-group">
          <label for="cEmail">Email Address *</label>
          <input type="email" id="cEmail" name="cEmail" required placeholder="you@email.com"/>
        </div>
        <div class="form-group">
          <label for="cSubject">Subject</label>
          <select id="cSubject" name="cSubject">
            <option value="">Select a subject…</option>
            <option>Submit an Interview Listing</option>
            <option>Report Incorrect Information</option>
            <option>Advertising / Partnerships</option>
            <option>General Enquiry</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="cMsg">Message *</label>
          <textarea id="cMsg" name="cMsg" required placeholder="Write your message here…"></textarea>
        </div>
        <button class="btn-send" id="sendMessageButton" type="submit">📨 Send Message</button>
      </form>
      <div class="success-msg" id="successMsg" style="<?= $sentSuccess ? 'display: block;' : 'display: none;' ?>">
        ✅ Thank you! Your message has been received. We'll get back to you soon.
      </div>
    </div>
  </div>
</div>
<footer><div class="footer-copy">© 2026 Codeloop · <a href="/">Home</a> · <a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/disclaimer">Disclaimer</a></div></footer>

<script src="contact.js" defer></script>
</body></html>
