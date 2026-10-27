"use strict";

const tableBody = document.getElementById("usersTableBody");
const toast = document.getElementById("toast");
let users = [];

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value == null ? "" : String(value);
  return element.innerHTML;
}

function showToast(message) {
  toast.textContent = message;
  toast.className = "toast show err";
  window.setTimeout(() => { toast.className = "toast"; }, 5000);
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...options });
  } catch {
    throw new Error("The admin server could not be reached. Check your connection and retry.");
  }
  if (response.status === 401) {
    window.location.replace("/admin/login.php");
    throw new Error("Your admin session expired. Please sign in again.");
  }
  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The server could not complete the request.");
  return result;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function renderUsers() {
  const query = document.getElementById("userSearch").value.trim().toLowerCase();
  const filtered = users.filter(user => [
    user.fullName, user.email, user.phone, user.education, user.experience,
    user.preferredLocation, (user.skills || []).join(" ")
  ].join(" ").toLowerCase().includes(query));

  document.getElementById("statsBar").innerHTML = `
    <div class="stat-card"><div class="stat-card-label">Registered Job Seekers</div><div class="stat-card-val accent">${users.length}</div></div>
    <div class="stat-card"><div class="stat-card-label">Profiles With Skills</div><div class="stat-card-val blue">${users.filter(user => user.skills.length).length}</div></div>
    <div class="stat-card"><div class="stat-card-label">Profiles Without Experience Info</div><div class="stat-card-val green">${users.filter(user => !user.experience).length}</div></div>
    <div class="stat-card"><div class="stat-card-label">Matching Search Results</div><div class="stat-card-val red">${filtered.length}</div></div>`;

  if (!filtered.length) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="6">${query ? "No matching profiles found." : "No users have registered yet."}</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(user => `
    <tr>
      <td><strong>${escapeHtml(user.fullName)}</strong><br/><span class="muted">${escapeHtml(user.email)}</span></td>
      <td>${escapeHtml(user.phone || "—")}</td>
      <td>${escapeHtml(user.education || "—")}${user.graduationYear ? `<br/><span class="muted">Class of ${escapeHtml(user.graduationYear)}</span>` : ""}</td>
      <td>${user.skills.length ? user.skills.map(skill => `<span class="type-badge type-online">${escapeHtml(skill)}</span>`).join(" ") : "—"}</td>
      <td>${escapeHtml(user.experience || "—")}<br/><span class="muted">${escapeHtml(user.preferredLocation || "Location not set")}</span></td>
      <td>${formatDate(user.createdAt)}</td>
    </tr>`).join("");
}

async function loadUsers() {
  tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Loading registered users…</td></tr>';
  try {
    const result = await apiRequest("/api/admin/users");
    users = result.users || [];
    renderUsers();
  } catch (error) {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Could not retrieve registered users.</td></tr>';
    showToast(error.message || "Could not load registered users.");
  }
}

document.getElementById("userSearch").addEventListener("input", renderUsers);
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await apiRequest("/api/admin/logout", { method: "POST" });
    window.location.replace("/admin/login.php");
  } catch (error) {
    showToast(error.message || "Could not log out.");
  }
});

loadUsers();
