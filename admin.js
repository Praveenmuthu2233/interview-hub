"use strict";

const tableBody = document.getElementById("tableBody");
const saveButton = document.getElementById("saveBtn");
const tagField = document.getElementById("tagField");
const tagsWrap = document.getElementById("tagsWrap");
const toast = document.getElementById("toast");
let cachedData = [];
let skills = [];
let toastTimer;

function showToast(message, success = false) {
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

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...options });
  } catch {
    throw new Error("The admin server could not be reached. Check your connection and retry.");
  }

  if (response.status === 401) {
    window.location.assign("/admin/login.php");
    throw new Error("Your admin session expired. Please sign in again.");
  }
  if (response.status === 204) return null;

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The server could not complete the request.");
  return result;
}

function renderTags() {
  tagsWrap.querySelectorAll(".tag-item").forEach(element => element.remove());
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
  document.getElementById("editId").value = "";
  ["fCompany", "fRole", "fDate", "fLocation", "fExperience", "fSalary", "fLink", "fDesc"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("fType").value = "online";
  skills = [];
  renderTags();
  document.getElementById("formTitle").textContent = "➕ Add Interview Listing";
  document.getElementById("formSub").textContent = "Fill in all the details below";
  document.getElementById("fDate").value = new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function renderStats() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("statsBar").innerHTML = `
    <div class="stat-card"><div class="stat-card-label">Total</div><div class="stat-card-val accent">${cachedData.length}</div></div>
    <div class="stat-card"><div class="stat-card-label">Online</div><div class="stat-card-val green">${cachedData.filter(item => item.type === "online").length}</div></div>
    <div class="stat-card"><div class="stat-card-label">Walk-in</div><div class="stat-card-val blue">${cachedData.filter(item => item.type === "walkin").length}</div></div>
    <div class="stat-card"><div class="stat-card-label">Today</div><div class="stat-card-val red">${cachedData.filter(item => item.date === today).length}</div></div>`;
}

function renderTable() {
  const query = document.getElementById("adminSearch").value.trim().toLowerCase();
  const results = cachedData.filter(item =>
    !query
    || (item.company || "").toLowerCase().includes(query)
    || (item.role || "").toLowerCase().includes(query)
    || (item.type || "").toLowerCase().includes(query)
    || (item.location || "").toLowerCase().includes(query)
  );
  document.getElementById("entryCount").textContent = String(cachedData.length);
  if (!results.length) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="6">${query ? "No listings found." : "No interview listings in the database yet."}</td></tr>`;
    return;
  }

  tableBody.innerHTML = results.map(item => {
    const type = ["online", "offline", "walkin"].includes(item.type) ? item.type : "other";
    return `<tr>
      <td class="td-company">${escapeHtml(item.company)}</td>
      <td class="td-role">${escapeHtml(item.role)}</td>
      <td><span class="type-badge type-${type}">${type === "walkin" ? "Walk-in" : escapeHtml(type)}</span></td>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.location || "—")}</td>
      <td><div class="action-btns">
        <button class="btn-edit" type="button" data-action="edit" data-entry-id="${encodeURIComponent(item.id)}">✏️ Edit</button>
        <button class="btn-delete" type="button" data-action="delete" data-entry-id="${encodeURIComponent(item.id)}">🗑️ Delete</button>
      </div></td>
    </tr>`;
  }).join("");
}

async function loadListings() {
  tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Loading listings…</td></tr>';
  try {
    const result = await apiRequest("/api/admin/listings");
    cachedData = result.listings || [];
    renderTable();
    renderStats();
  } catch (error) {
    if (error.message) showToast(error.message);
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Could not retrieve listings from the database.</td></tr>';
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
  saveButton.textContent = "⏳ Saving…";
  try {
    await apiRequest(editId ? `/api/admin/listings/${encodeURIComponent(editId)}` : "/api/admin/listings", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listing)
    });
    showToast(editId ? "✅ Listing updated." : "✅ Listing saved.", true);
    resetForm();
    await loadListings();
  } catch (error) {
    showToast(error.message || "Could not save the listing.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "💾 Save Listing";
  }
}

function editEntry(id) {
  const item = cachedData.find(listing => listing.id === id);
  if (!item) {
    showToast("This listing is no longer available. Refresh the list and try again.");
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
  document.getElementById("formTitle").textContent = "✏️ Edit Listing";
  document.getElementById("formSub").textContent = `Editing: ${item.role} @ ${item.company}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteEntry(id) {
  if (!window.confirm("Delete this listing? This cannot be undone.")) return;
  try {
    await apiRequest(`/api/admin/listings/${encodeURIComponent(id)}`, { method: "DELETE" });
    showToast("🗑️ Listing deleted.", true);
    await loadListings();
  } catch (error) {
    showToast(error.message || "Could not delete the listing.");
  }
}

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

tagsWrap.addEventListener("click", event => {
  const removeButton = event.target.closest("[data-remove-tag]");
  if (removeButton) {
    skills.splice(Number(removeButton.dataset.removeTag), 1);
    renderTags();
    tagField.focus();
  } else if (event.target === tagsWrap) {
    tagField.focus();
  }
});

document.getElementById("tableBody").addEventListener("click", event => {
  const button = event.target.closest("[data-action][data-entry-id]");
  if (!button) return;
  const id = decodeURIComponent(button.dataset.entryId);
  if (button.dataset.action === "edit") editEntry(id);
  if (button.dataset.action === "delete") deleteEntry(id);
});

document.getElementById("adminSearch").addEventListener("input", renderTable);
document.getElementById("saveBtn").addEventListener("click", saveEntry);
document.getElementById("resetBtn").addEventListener("click", resetForm);
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await apiRequest("/api/admin/logout", { method: "POST" });
    window.location.replace("/admin/login.php");
  } catch (error) {
    showToast(error.message || "Could not log out.");
  }
});

resetForm();
loadListings();
