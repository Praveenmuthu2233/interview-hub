"use strict";

const header = document.querySelector("header .header-inner, header .hi");

if (header) {
  const accountControls = document.createElement("div");
  accountControls.className = "user-header-controls";
  accountControls.innerHTML = `
    <a class="user-header-login" href="/user-login.html">👤 User Login</a>
    <a class="user-header-profile" href="/dashboard" aria-label="Open your profile">
      <span class="user-header-avatar" aria-hidden="true">👤</span>
      <span class="user-header-name"></span>
    </a>
    <button class="user-header-logout" type="button">Log out</button>
    <span class="user-header-message" role="status" aria-live="polite"></span>`;
  header.append(accountControls);

  const loginLink = accountControls.querySelector(".user-header-login");
  const profileLink = accountControls.querySelector(".user-header-profile");
  const logoutButton = accountControls.querySelector(".user-header-logout");
  const message = accountControls.querySelector(".user-header-message");

  async function loadAccount() {
    try {
      const response = await fetch("/api/user/session", { credentials: "same-origin" });
      if (!response.ok) return;
      const result = await response.json();
      if (!result.user || typeof result.user.fullName !== "string") {
        throw new Error("The account profile could not be loaded.");
      }
      accountControls.querySelector(".user-header-name").textContent = result.user.fullName;
      accountControls.classList.add("is-signed-in");
    } catch {
      message.textContent = "Could not load account details.";
      message.classList.add("is-visible");
    }
  }

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    message.textContent = "";
    message.classList.remove("is-visible");
    try {
      const response = await fetch("/api/user/logout", {
        method: "POST",
        credentials: "same-origin"
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Could not log out. Please try again.");
      }
      window.location.reload();
    } catch (error) {
      message.textContent = error.message || "Could not log out. Please try again.";
      message.classList.add("is-visible");
      logoutButton.disabled = false;
    }
  });

  loadAccount();
}
