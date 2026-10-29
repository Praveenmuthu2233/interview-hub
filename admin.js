"use strict";

// DOM Elements - Navigation & Session
const headerAdminName = document.getElementById("headerAdminName");
const logoutBtn = document.getElementById("logoutBtn");
const tabListings = document.getElementById("tabListings");
const tabActivity = document.getElementById("tabActivity");
const tabAdmins = document.getElementById("tabAdmins");
const viewListings = document.getElementById("viewListings");
const viewActivity = document.getElementById("viewActivity");
const viewAdmins = document.getElementById("viewAdmins");
const tabListingsCount = document.getElementById("tabListingsCount");
const tabActivityCount = document.getElementById("tabActivityCount");
const tabAdminsCount = document.getElementById("tabAdminsCount");

// DOM Elements - Listings
const tableBody = document.getElementById("tableBody");
const saveButton = document.getElementById("saveBtn");
const resetButton = document.getElementById("resetBtn");
const adminSearch = document.getElementById("adminSearch");
const tagField = document.getElementById("tagField");
const tagsWrap = document.getElementById("tagsWrap");
const entryCount = document.getElementById("entryCount");

// DOM Elements - Activity Log
const activityTableBody = document.getElementById("activityTableBody");
const actSearch = document.getElementById("actSearch");
const actActionFilter = document.getElementById("actActionFilter");
const refreshActBtn = document.getElementById("refreshActBtn");
const actStatTotal = document.getElementById("actStatTotal");
const actStatInserted = document.getElementById("actStatInserted");
const actStatUpdated = document.getElementById("actStatUpdated");
const actStatDeleted = document.getElementById("actStatDeleted");

// DOM Elements - Admins Management
const adminsTableBody = document.getElementById("adminsTableBody");
const adminSearchField = document.getElementById("adminSearchField");
const adminCountBadge = document.getElementById("adminCountBadge");
const createAdminBtn = document.getElementById("createAdminBtn");
const newAdminUser = document.getElementById("newAdminUser");
const newAdminEmail = document.getElementById("newAdminEmail");
const newAdminPass = document.getElementById("newAdminPass");
const newAdminPassConfirm = document.getElementById("newAdminPassConfirm");

// Toast
const toast = document.getElementById("toast");
let toastTimer;

// State
let cachedListings = [];
let cachedActivity = [];
let cachedAdmins = [];
let currentAdminUsername = "admin";
let skills = [];
let currentTab = "listings";

/* ----------------------------------------------------
   Toast & Formatting Helpers
---------------------------------------------------- */
function showToast(message, success = false) {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${success ? "ok" : "err"}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.className = "toast";
  }, 5000);
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value == null ? "" : String(value);
  return element.innerHTML;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatRelativeTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(value);
}

/* ----------------------------------------------------
   API Request Wrapper
---------------------------------------------------- */
async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...options });
  } catch {
    throw new Error("The admin server could not be reached. Ensure MySQL is running in XAMPP.");
  }

  if (response.status === 401) {
    window.location.assign("/admin-login");
    throw new Error("Your admin session expired. Please sign in again.");
  }
  if (response.status === 204) return null;

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The server could not complete the request.");
  return result;
}

/* ----------------------------------------------------
   Tab Navigation
---------------------------------------------------- */
function switchTab(tab) {
  currentTab = tab;
  [tabListings, tabActivity, tabAdmins].forEach(btn => {
    if (!btn) return;
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  if (viewListings) viewListings.classList.toggle("hidden", tab !== "listings");
  if (viewActivity) viewActivity.classList.toggle("hidden", tab !== "activity");
  if (viewAdmins) viewAdmins.classList.toggle("hidden", tab !== "admins");

  if (tab === "listings") renderListingsTable();
  if (tab === "activity") loadActivity();
  if (tab === "admins") loadAdmins();
}

[tabListings, tabActivity, tabAdmins].forEach(btn => {
  if (btn) {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  }
});

/* ----------------------------------------------------
   Session & Profile
---------------------------------------------------- */
async function checkSession() {
  try {
    const res = await apiRequest("/api/admin/session");
    if (res && res.username) {
      currentAdminUsername = res.username;
      if (headerAdminName) headerAdminName.textContent = res.username;
    }
  } catch {
    // Session check fails if not logged in
  }
}

/* ----------------------------------------------------
   TAB 1: JOB LISTINGS LOGIC
---------------------------------------------------- */
function renderTags() {
  if (!tagsWrap || !tagField) return;
  tagsWrap.querySelectorAll(".tag-item").forEach(el => el.remove());
  skills.forEach((skill, index) => {
    const tag = document.createElement("span");
    tag.className = "tag-item";
    tag.append(document.createTextNode(skill));
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.dataset.removeTag = String(index);
    removeButton.setAttribute("aria-label", `Remove ${skill}`);
    removeButton.textContent = "×";
    tag.append(removeButton);
    tagsWrap.insertBefore(tag, tagField);
  });
}

function resetForm() {
  const editId = document.getElementById("editId");
  if (editId) editId.value = "";
  ["fCompany", "fRole", "fDate", "fLocation", "fExperience", "fSalary", "fLink", "fDesc"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const fType = document.getElementById("fType");
  if (fType) fType.value = "online";
  skills = [];
  renderTags();
  const formTitle = document.getElementById("formTitle");
  if (formTitle) formTitle.textContent = "➕ Add Job";
  const formSub = document.getElementById("formSub");
  if (formSub) formSub.textContent = "Fill in details. All additions and changes will be logged with your admin ID.";
  const fDate = document.getElementById("fDate");
  if (fDate) fDate.value = new Date().toISOString().slice(0, 10);
}

function renderListingsStats() {
  const today = new Date().toISOString().slice(0, 10);
  const total = cachedListings.length;
  const online = cachedListings.filter(item => item.type === "online").length;
  const walkin = cachedListings.filter(item => item.type === "walkin").length;
  const todayDrives = cachedListings.filter(item => item.date === today).length;

  const statTotal = document.getElementById("statTotalVal");
  const statOnline = document.getElementById("statOnlineVal");
  const statWalkin = document.getElementById("statWalkinVal");
  const statToday = document.getElementById("statTodayVal");

  if (statTotal) statTotal.textContent = String(total);
  if (statOnline) statOnline.textContent = String(online);
  if (statWalkin) statWalkin.textContent = String(walkin);
  if (statToday) statToday.textContent = String(todayDrives);
  if (tabListingsCount) tabListingsCount.textContent = String(total);
}

function renderListingsTable() {
  if (!tableBody) return;
  const query = (adminSearch ? adminSearch.value : "").trim().toLowerCase();
  const results = cachedListings.filter(item =>
    !query
    || (item.company || "").toLowerCase().includes(query)
    || (item.role || "").toLowerCase().includes(query)
    || (item.type || "").toLowerCase().includes(query)
    || (item.location || "").toLowerCase().includes(query)
    || (item.createdBy || "").toLowerCase().includes(query)
    || (item.updatedBy || "").toLowerCase().includes(query)
  );

  if (entryCount) entryCount.textContent = String(cachedListings.length);

  if (!results.length) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="7">${query ? "No jobs found matching search." : "No jobs in the database yet."}</td></tr>`;
    return;
  }

  tableBody.innerHTML = results.map(item => {
    const type = ["online", "offline", "walkin"].includes(item.type) ? item.type : "online";
    const typeLabel = type === "walkin" ? "Walk-in" : (type.charAt(0).toUpperCase() + type.slice(1));
    const createdBy = item.createdBy || "admin";
    const updatedBy = item.updatedBy;

    return `<tr>
      <td class="td-company">${escapeHtml(item.company)}</td>
      <td class="td-role">${escapeHtml(item.role)}</td>
      <td><span class="type-badge type-${type}">${escapeHtml(typeLabel)}</span></td>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.location || "-")}</td>
      <td>
        <div class="author-meta">
          <span class="badge-creator" title="Added by admin: ${escapeHtml(createdBy)}">
            <span>👤</span> ${escapeHtml(createdBy)}
          </span>
          ${updatedBy ? `<span class="badge-updater" title="Last modified by: ${escapeHtml(updatedBy)}">✎ ${escapeHtml(updatedBy)}</span>` : ""}
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" type="button" data-action="edit" data-entry-id="${encodeURIComponent(item.id)}">✏️ Edit</button>
          <button class="btn-delete" type="button" data-action="delete" data-entry-id="${encodeURIComponent(item.id)}">🗑 Delete</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

async function loadListings() {
  if (tableBody) tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Loading jobs from database...</td></tr>';
  try {
    const result = await apiRequest("/api/admin/listings");
    cachedListings = result.listings || [];
    renderListingsTable();
    renderListingsStats();
  } catch (error) {
    if (error.message) showToast(error.message);
    if (tableBody) tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Could not retrieve jobs. Check MySQL connection.</td></tr>';
  }
}

function readForm() {
  return {
    company: document.getElementById("fCompany").value.trim(),
    role: document.getElementById("fRole").value.trim(),
    type: document.getElementById("fType").value,
    date: document.getElementById("fDate").value,
    location: document.getElementById("fLocation").value.trim(),
    experience: document.getElementById("fExperience").value.trim(),
    salary: document.getElementById("fSalary").value.trim(),
    applyLink: document.getElementById("fLink").value.trim(),
    description: document.getElementById("fDesc").value.trim(),
    skills: [...skills]
  };
}

async function saveEntry() {
  const listing = readForm();
  if (!listing.company || !listing.role || !listing.date || !listing.description) {
    showToast("Please fill all required fields (*).");
    return;
  }

  const editId = document.getElementById("editId").value;
  saveButton.disabled = true;
  saveButton.textContent = "⏳ Saving...";
  try {
    await apiRequest(editId ? `/api/admin/listings/${encodeURIComponent(editId)}` : "/api/admin/listings", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listing)
    });
    showToast(editId ? " Job updated successfully." : " Job created and logged successfully.", true);
    resetForm();
    await loadListings();
    loadActivitySilent();
  } catch (error) {
    showToast(error.message || "Could not save the job.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "💾 Save Job";
  }
}

function editEntry(id) {
  const item = cachedListings.find(listing => listing.id === id);
  if (!item) {
    showToast("Job not found. Refreshing...", false);
    return;
  }
  document.getElementById("editId").value = item.id;
  document.getElementById("fCompany").value = item.company || "";
  document.getElementById("fRole").value = item.role || "";
  document.getElementById("fType").value = item.type || "online";
  document.getElementById("fDate").value = item.date || "";
  document.getElementById("fLocation").value = item.location || "";
  document.getElementById("fExperience").value = item.experience || "";
  document.getElementById("fSalary").value = item.salary || "";
  document.getElementById("fLink").value = item.applyLink || "";
  document.getElementById("fDesc").value = item.description || "";
  skills = Array.isArray(item.skills) ? [...item.skills] : [];
  renderTags();
  document.getElementById("formTitle").textContent = "✏️ Edit Job";
  document.getElementById("formSub").textContent = `Editing: ${item.role} @ ${item.company} (Will be recorded in Audit Log)`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteEntry(id) {
  const item = cachedListings.find(listing => listing.id === id);
  const label = item ? `${item.company} - ${item.role}` : "this job";
  if (!window.confirm(`Delete ${label}? This action and your username will be permanently logged in the audit trail.`)) return;

  try {
    await apiRequest(`/api/admin/listings/${encodeURIComponent(id)}`, { method: "DELETE" });
    showToast("🗑 Job deleted and recorded in audit log.", true);
    await loadListings();
    loadActivitySilent();
  } catch (error) {
    showToast(error.message || "Could not delete the job.");
  }
}

/* ----------------------------------------------------
   TAB 2: ACTIVITY LOG (AUDIT TRAIL) LOGIC
---------------------------------------------------- */
function getActionBadge(actionType) {
  switch (actionType) {
    case "INSERT_JOB":
      return '<span class="badge-action insert">➕ Added Job</span>';
    case "UPDATE_JOB":
      return '<span class="badge-action update">✎ Updated Job</span>';
    case "DELETE_JOB":
      return '<span class="badge-action delete">✕ Deleted Job</span>';
    case "CREATE_ADMIN":
      return '<span class="badge-action admin">👤 Added Admin</span>';
    case "DELETE_ADMIN":
      return '<span class="badge-action delete">🗑 Removed Admin</span>';
    default:
      return `<span class="badge-action">${escapeHtml(actionType)}</span>`;
  }
}

function renderActivityTable() {
  if (!activityTableBody) return;
  const searchVal = (actSearch ? actSearch.value : "").trim().toLowerCase();
  const actionVal = (actActionFilter ? actActionFilter.value : "").trim();

  const results = cachedActivity.filter(item => {
    if (actionVal && item.actionType !== actionVal) return false;
    if (searchVal) {
      const match = (item.adminUsername || "").toLowerCase().includes(searchVal)
        || (item.itemTitle || "").toLowerCase().includes(searchVal)
        || (item.details || "").toLowerCase().includes(searchVal)
        || (item.actionType || "").toLowerCase().includes(searchVal);
      if (!match) return false;
    }
    return true;
  });

  if (!results.length) {
    activityTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">No activity log entries found.</td></tr>';
    return;
  }

  activityTableBody.innerHTML = results.map(log => {
    const relTime = formatRelativeTime(log.createdAt);
    const fullTime = formatDateTime(log.createdAt);
    const actionBadge = getActionBadge(log.actionType);

    return `<tr>
      <td>
        <div class="activity-time-rel">${escapeHtml(relTime)}</div>
        <div class="activity-time-sub">${escapeHtml(fullTime)}</div>
      </td>
      <td>
        <span class="activity-user">
          <span class="activity-user-badge">👤 ${escapeHtml(log.adminUsername || "admin")}</span>
        </span>
      </td>
      <td>${actionBadge}</td>
      <td>
        <strong class="activity-target-title">${escapeHtml(log.itemTitle || "-")}</strong>
      </td>
      <td>
        <div class="activity-details-cell">${escapeHtml(log.details || "-")}</div>
      </td>
    </tr>`;
  }).join("");
}

async function loadActivity() {
  if (activityTableBody) activityTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">Loading audit trail logs...</td></tr>';
  try {
    const result = await apiRequest("/api/admin/activity?limit=200");
    cachedActivity = result.logs || [];
    renderActivityTable();

    // Stats
    const stats = result.stats || {};
    if (actStatTotal) actStatTotal.textContent = String(stats.total || cachedActivity.length);
    if (actStatInserted) actStatInserted.textContent = String(stats.inserted || 0);
    if (actStatUpdated) actStatUpdated.textContent = String(stats.updated || 0);
    if (actStatDeleted) actStatDeleted.textContent = String(stats.deleted || 0);
    if (tabActivityCount) tabActivityCount.textContent = String(stats.total || cachedActivity.length);
  } catch (error) {
    if (activityTableBody) activityTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">Could not retrieve audit trail.</td></tr>';
  }
}

async function loadActivitySilent() {
  try {
    const result = await apiRequest("/api/admin/activity?limit=200");
    cachedActivity = result.logs || [];
    const stats = result.stats || {};
    if (tabActivityCount) tabActivityCount.textContent = String(stats.total || cachedActivity.length);
    if (currentTab === "activity") {
      renderActivityTable();
      if (actStatTotal) actStatTotal.textContent = String(stats.total || cachedActivity.length);
      if (actStatInserted) actStatInserted.textContent = String(stats.inserted || 0);
      if (actStatUpdated) actStatUpdated.textContent = String(stats.updated || 0);
      if (actStatDeleted) actStatDeleted.textContent = String(stats.deleted || 0);
    }
  } catch {
    // silent
  }
}

/* ----------------------------------------------------
   TAB 3: MANAGE ADMINS LOGIC
---------------------------------------------------- */
function renderAdminsTable() {
  if (!adminsTableBody) return;
  const query = (adminSearchField ? adminSearchField.value : "").trim().toLowerCase();
  const results = cachedAdmins.filter(admin =>
    !query
    || (admin.username || "").toLowerCase().includes(query)
    || (admin.email || "").toLowerCase().includes(query)
    || (admin.createdBy || "").toLowerCase().includes(query)
  );

  if (adminCountBadge) adminCountBadge.textContent = String(cachedAdmins.length);
  if (tabAdminsCount) tabAdminsCount.textContent = String(cachedAdmins.length);

  if (!results.length) {
    adminsTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">${query ? "No admin matching search." : "No admin accounts found."}</td></tr>`;
    return;
  }

  adminsTableBody.innerHTML = results.map(admin => {
    const isCurrent = admin.isCurrent || (admin.username === currentAdminUsername);
    return `<tr>
      <td>
        <strong>${escapeHtml(admin.username)}</strong>
        ${isCurrent ? '<span class="badge-you">(You)</span>' : ""}
      </td>
      <td>${escapeHtml(admin.email || "—")}</td>
      <td><span class="activity-user-badge">👤 ${escapeHtml(admin.createdBy || "system")}</span></td>
      <td>${formatDateTime(admin.createdAt)}</td>
      <td>${admin.lastSeenAt ? formatDateTime(admin.lastSeenAt) : "Never"}</td>
      <td>
        ${isCurrent
          ? '<span style="color:var(--muted);font-size:.75rem;">Active Session</span>'
          : `<button class="btn-delete" type="button" data-del-admin-id="${encodeURIComponent(admin.id)}" data-del-admin-user="${escapeHtml(admin.username)}">🗑 Delete</button>`
        }
      </td>
    </tr>`;
  }).join("");
}

async function loadAdmins() {
  if (adminsTableBody) adminsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Loading admin accounts...</td></tr>';
  try {
    const result = await apiRequest("/api/admin/admins");
    cachedAdmins = result.admins || [];
    if (result.currentAdmin) currentAdminUsername = result.currentAdmin;
    renderAdminsTable();
  } catch (error) {
    if (adminsTableBody) adminsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Could not retrieve admin accounts.</td></tr>';
    showToast(error.message || "Failed to load admin list.");
  }
}

async function createAdmin() {
  const username = (newAdminUser ? newAdminUser.value : "").trim();
  const email = (newAdminEmail ? newAdminEmail.value : "").trim();
  const password = newAdminPass ? newAdminPass.value : "";
  const confirmPassword = newAdminPassConfirm ? newAdminPassConfirm.value : "";

  if (!username) {
    showToast("Please enter a username for the new admin.");
    if (newAdminUser) newAdminUser.focus();
    return;
  }

  if (username.length < 3) {
    showToast("Admin username must be at least 3 characters.");
    return;
  }

  if (!/^[a-zA-Z0-9_\-\.]+$/.test(username)) {
    showToast("Username may only contain letters, numbers, hyphens, and underscores.");
    return;
  }

  if (!password || password.length < 6) {
    showToast("Password must be at least 6 characters long.");
    if (newAdminPass) newAdminPass.focus();
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match. Please re-enter.");
    if (newAdminPassConfirm) newAdminPassConfirm.focus();
    return;
  }

  if (createAdminBtn) {
    createAdminBtn.disabled = true;
    createAdminBtn.textContent = "⏳ Creating Admin...";
  }

  try {
    const res = await apiRequest("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    showToast(`✅ ${res.message || "New admin created successfully!"}`, true);
    if (newAdminUser) newAdminUser.value = "";
    if (newAdminEmail) newAdminEmail.value = "";
    if (newAdminPass) newAdminPass.value = "";
    if (newAdminPassConfirm) newAdminPassConfirm.value = "";

    await loadAdmins();
    loadActivitySilent();
  } catch (error) {
    showToast(error.message || "Could not create admin.");
  } finally {
    if (createAdminBtn) {
      createAdminBtn.disabled = false;
      createAdminBtn.textContent = "➕ Create Admin Account";
    }
  }
}

async function deleteAdmin(id, username) {
  if (!window.confirm(`Are you sure you want to remove admin account '${username}'? This action will be recorded in the audit log.`)) return;

  try {
    const res = await apiRequest(`/api/admin/admins?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    showToast(`🗑 ${res.message || "Admin account removed."}`, true);
    await loadAdmins();
    loadActivitySilent();
  } catch (error) {
    showToast(error.message || "Could not remove admin account.");
  }
}

/* ----------------------------------------------------
   Event Listeners
---------------------------------------------------- */
if (tagField) {
  tagField.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const value = tagField.value.trim().replace(/,$/, "");
      if (value && !skills.includes(value)) {
        skills.push(value);
        renderTags();
      }
      tagField.value = "";
    } else if (event.key === "Backspace" && !tagField.value && skills.length) {
      skills.pop();
      renderTags();
    }
  });
}

if (tagsWrap) {
  tagsWrap.addEventListener("click", event => {
    const removeButton = event.target.closest("[data-remove-tag]");
    if (removeButton) {
      skills.splice(Number(removeButton.dataset.removeTag), 1);
      renderTags();
      if (tagField) tagField.focus();
    } else if (event.target === tagsWrap && tagField) {
      tagField.focus();
    }
  });
}

if (tableBody) {
  tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-action][data-entry-id]");
    if (!button) return;
    const id = decodeURIComponent(button.dataset.entryId);
    if (button.dataset.action === "edit") editEntry(id);
    if (button.dataset.action === "delete") deleteEntry(id);
  });
}

if (adminsTableBody) {
  adminsTableBody.addEventListener("click", event => {
    const delBtn = event.target.closest("[data-del-admin-id]");
    if (!delBtn) return;
    const id = decodeURIComponent(delBtn.dataset.delAdminId);
    const user = delBtn.dataset.delAdminUser || "admin";
    deleteAdmin(id, user);
  });
}

if (adminSearch) adminSearch.addEventListener("input", renderListingsTable);
if (actSearch) actSearch.addEventListener("input", renderActivityTable);
if (actActionFilter) actActionFilter.addEventListener("change", renderActivityTable);
if (refreshActBtn) refreshActBtn.addEventListener("click", () => {
  loadActivity();
  showToast("⟳ Activity log refreshed.", true);
});
if (adminSearchField) adminSearchField.addEventListener("input", renderAdminsTable);
if (saveButton) saveButton.addEventListener("click", saveEntry);
if (resetButton) resetButton.addEventListener("click", resetForm);
if (createAdminBtn) createAdminBtn.addEventListener("click", createAdmin);

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await apiRequest("/api/admin/logout", { method: "POST" });
      window.location.replace("/admin-login");
    } catch (error) {
      showToast(error.message || "Could not log out.");
    }
  });
}

/* ----------------------------------------------------
   Initialization
---------------------------------------------------- */
checkSession();
resetForm();
loadListings();
loadActivitySilent();
