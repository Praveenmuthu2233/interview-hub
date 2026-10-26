"use strict";

const form = document.getElementById("userAuthForm");
const button = document.getElementById("submitButton");
const message = document.getElementById("authMessage");
const mode = form.dataset.mode;

const graduationYear = document.getElementById("graduationYear");
if (graduationYear) graduationYear.max = String(new Date().getFullYear() + 10);

function showMessage(text, success = false) {
  message.textContent = text;
  message.className = `portal-message show ${success ? "success" : "error"}`;
}

async function checkSession() {
  try {
    const response = await fetch("/api/user/session", { credentials: "same-origin" });
    if (response.ok) window.location.replace("/dashboard");
  } catch {
    showMessage("Cannot connect to the account service. Please try again.");
  }
}

function registrationData() {
  const year = document.getElementById("graduationYear").value.trim();
  const skills = document.getElementById("skills").value
    .split(",")
    .map(skill => skill.trim())
    .filter(Boolean);
  return {
    fullName: document.getElementById("fullName").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    education: document.getElementById("education").value.trim(),
    graduationYear: year,
    skills,
    experience: document.getElementById("experience").value.trim(),
    preferredLocation: document.getElementById("preferredLocation").value.trim(),
    password: document.getElementById("password").value
  };
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (button.disabled) return;

  const payload = mode === "register"
    ? registrationData()
    : {
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value
      };

  button.disabled = true;
  button.textContent = mode === "register" ? "Creating account…" : "Signing in…";
  try {
    const response = await fetch(`/api/user/${mode}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      showMessage(result.error || `Request failed. HTTP ${response.status}`);
      return;
    }
    document.getElementById("password").value = "";
    window.location.assign("/dashboard");
  } catch {
    showMessage("Cannot connect to the account service. Check your connection and retry.");
  } finally {
    button.disabled = false;
    button.textContent = mode === "register" ? "Create account" : "Sign in";
  }
});

checkSession();
