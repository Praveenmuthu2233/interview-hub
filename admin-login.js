"use strict";

const form = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const toast = document.getElementById("toast");

function showMessage(message, success = false) {
  toast.textContent = message;
  toast.className = `toast show ${success ? "ok" : "err"}`;
}

async function checkExistingSession() {
  try {
    const response = await fetch("/api/admin/session", {
      method: "GET",
      credentials: "same-origin"
    });

    if (response.ok) {
      window.location.replace("admin.php");
    }
  } catch {
    showMessage("Cannot connect to the admin server. Please try again.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (loginButton.disabled) return;

  loginButton.disabled = true;
  loginButton.textContent = "Signing in…";

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      showMessage(
        result.error || `Sign-in failed. HTTP ${response.status}`
      );
      return;
    }

    document.getElementById("password").value = "";
    window.location.assign("admin.php");

  } catch {
    showMessage("Cannot connect to the admin server. Check your connection.");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "🔓 Sign in";
  }
});

checkExistingSession();