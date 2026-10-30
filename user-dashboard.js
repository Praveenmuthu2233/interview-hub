"use strict";

const profileContainer   = document.getElementById("profileDetails");
const jobList            = document.getElementById("jobList");
const savedJobList       = document.getElementById("savedJobList");
const portalMessage      = document.getElementById("portalMessage");
const jobSkeletonList    = document.getElementById("jobSkeletonList");
const profileSkeleton    = document.getElementById("profileSkeleton");

let currentUser;
let currentListings  = [];
let savedListings    = [];
const savedListingIds = new Set();

// Pagination State
const JOBS_PER_PAGE  = 5;
const SAVED_PER_PAGE = 5;
let currentJobPage   = 1;
let currentSavedPage = 1;
let processedResults = [];

/* ============================================================
   Utilities
   ============================================================ */
function escapeHtml(value) {
  const el = document.createElement("div");
  el.textContent = value == null ? "" : String(value);
  return el.innerHTML;
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...options });
  } catch {
    throw new Error("The account service could not be reached. Check your connection and retry.");
  }
  if (response.status === 401) {
    window.location.replace("/user-login");
    throw new Error("Your session expired. Please sign in again.");
  }
  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The server could not complete the request.");
  return result;
}

function showToast(message, type = "error") {
  portalMessage.textContent = message;
  portalMessage.className   = `dash-toast show ${type}`;
  clearTimeout(portalMessage._timer);
  portalMessage._timer = setTimeout(() => {
    portalMessage.className = "dash-toast";
  }, 5000);
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Date N/A"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ============================================================
   Profile Render
   ============================================================ */
function profileValue(value, html = false) {
  if (value && String(value).trim()) {
    return html ? value : escapeHtml(value);
  }
  return '<span class="muted">Not provided</span>';
}

function renderProfile(user) {
  currentUser = user;

  // Nav bar updates
  const initial = (user.fullName || "?").trim().slice(0, 1).toUpperCase();
  document.getElementById("navAvatar").textContent   = initial;
  document.getElementById("welcomeName").textContent = user.fullName || "Dashboard";

  // Stat bar (totals will be set by renderListings)
  document.getElementById("statSaved").textContent = String(savedListings.length);

  const skillTags = user.skills.length
    ? user.skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("")
    : '<span class="muted">Not provided</span>';

  profileContainer.innerHTML = `
    <div class="profile-top">
      <div class="profile-avatar-wrap">
        <div class="avatar">${escapeHtml(initial)}</div>
      </div>
      <div class="profile-name">${escapeHtml(user.fullName)}</div>
      <div class="profile-email">${escapeHtml(user.email)}</div>
    </div>

    <div class="profile-body">
      <div class="profile-edit-btn-wrap">
        <button class="dash-btn dash-btn-ghost" id="editProfileButton" type="button">✏️ Edit profile</button>
      </div>

      <ul class="profile-list">
        <li class="profile-item">
          <span class="profile-item-label">Phone</span>
          <span class="profile-item-value">${profileValue(user.phone)}</span>
        </li>
        <li class="profile-item">
          <span class="profile-item-label">Education</span>
          <span class="profile-item-value">${profileValue(user.education)}</span>
        </li>
        <li class="profile-item">
          <span class="profile-item-label">Graduation year</span>
          <span class="profile-item-value">${profileValue(user.graduationYear)}</span>
        </li>
        <li class="profile-item">
          <span class="profile-item-label">Experience</span>
          <span class="profile-item-value">${profileValue(user.experience)}</span>
        </li>
        <li class="profile-item">
          <span class="profile-item-label">Preferred location</span>
          <span class="profile-item-value">${profileValue(user.preferredLocation)}</span>
        </li>
        <li class="profile-item">
          <span class="profile-item-label">Skills</span>
          <div class="skill-list">${skillTags}</div>
        </li>
      </ul>

      <form id="profileEditForm" class="profile-edit-form" hidden>
        <div class="portal-field">
          <label for="editFullName">Full name</label>
          <input id="editFullName" name="fullName" maxlength="160" required/>
        </div>
        <div class="portal-field">
          <label for="editPhone">Phone</label>
          <input id="editPhone" name="phone" maxlength="40"/>
        </div>
        <div class="portal-field">
          <label for="editEducation">Education</label>
          <input id="editEducation" name="education" maxlength="180"/>
        </div>
        <div class="portal-field">
          <label for="editGraduationYear">Graduation year</label>
          <input id="editGraduationYear" name="graduationYear" type="number" min="1950" max="${new Date().getFullYear() + 10}" inputmode="numeric"/>
        </div>
        <div class="portal-field">
          <label for="editExperience">Experience</label>
          <input id="editExperience" name="experience" maxlength="240"/>
        </div>
        <div class="portal-field">
          <label for="editSkills">Skills</label>
          <input id="editSkills" name="skills" maxlength="1000" placeholder="Java, SQL, communication"/>
        </div>
        <div class="portal-field">
          <label for="editPreferredLocation">Preferred location</label>
          <input id="editPreferredLocation" name="preferredLocation" maxlength="160"/>
        </div>
        <div class="profile-edit-actions">
          <button class="dash-btn dash-btn-primary" id="saveProfileButton" type="submit">Save</button>
          <button class="dash-btn dash-btn-ghost"   id="cancelProfileButton" type="button">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Hide skeleton, show content
  if (profileSkeleton) profileSkeleton.hidden = true;
  profileContainer.hidden = false;

  document.getElementById("editProfileButton").addEventListener("click",   openProfileEditor);
  document.getElementById("cancelProfileButton").addEventListener("click", closeProfileEditor);
  document.getElementById("profileEditForm").addEventListener("submit",    saveProfile);
}

function openProfileEditor() {
  document.getElementById("editFullName").value         = currentUser.fullName        || "";
  document.getElementById("editPhone").value            = currentUser.phone           || "";
  document.getElementById("editEducation").value        = currentUser.education       || "";
  document.getElementById("editGraduationYear").value   = currentUser.graduationYear  || "";
  document.getElementById("editExperience").value       = currentUser.experience      || "";
  document.getElementById("editSkills").value           = currentUser.skills.join(", ");
  document.getElementById("editPreferredLocation").value = currentUser.preferredLocation || "";
  document.getElementById("profileEditForm").hidden    = false;
  document.getElementById("editProfileButton").hidden  = true;
}

function closeProfileEditor() {
  document.getElementById("profileEditForm").hidden   = true;
  document.getElementById("editProfileButton").hidden = false;
}

async function saveProfile(event) {
  event.preventDefault();
  const form   = event.currentTarget;
  const button = document.getElementById("saveProfileButton");
  const values = new FormData(form);
  const profile = Object.fromEntries(values.entries());
  profile.email  = currentUser.email;
  profile.skills = String(profile.skills).split(",").map(s => s.trim()).filter(Boolean);
  button.disabled = true;
  try {
    const result = await apiRequest("/api/user/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile)
    });
    renderProfile(result.user);
    renderListings(currentListings, currentUser, 1);
    showToast("Your profile has been updated.", "success");
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
  }
}

/* ============================================================
   Matching / Scoring
   ============================================================ */
function scoreListing(listing, user) {
  const searchText = [
    listing.company, listing.role, listing.location,
    listing.experience, listing.description, ...(listing.skills || [])
  ].join(" ").toLowerCase();
  const matchedSkills = user.skills.filter(skill => skill && searchText.includes(skill.toLowerCase()));
  let score = matchedSkills.length;
  if (user.preferredLocation && searchText.includes(user.preferredLocation.toLowerCase())) score += 2;
  if (user.education          && searchText.includes(user.education.toLowerCase()))         score += 1;
  return { score, matchedSkills };
}

/* ============================================================
   Job Card Markup
   ============================================================ */
function jobCardMarkup(listing, matchedSkills = []) {
  const type     = listing.type === "walkin" ? "Walk-in" : listing.type;
  const isSaved  = savedListingIds.has(listing.id);

  const skillsHtml = listing.skills.length
    ? listing.skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("")
    : '<span class="muted" style="font-size:.8rem">See role details</span>';

  const matchBadge = matchedSkills.length
    ? `<div class="matched-skills-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Matches your skills: ${escapeHtml(matchedSkills.join(", "))}
       </div>`
    : "";

  return `<article class="job-card">
    <div class="job-card-top">
      <div>
        <p class="job-card-company">${escapeHtml(listing.company)}</p>
        <h3 class="job-card-role">${escapeHtml(listing.role)}</h3>
      </div>
      <span class="type-pill">${escapeHtml(type)}</span>
    </div>

    <div class="job-meta">
      <span class="job-meta-item"><span class="job-meta-icon">📅</span> ${escapeHtml(formatDate(listing.date))}</span>
      <span class="job-meta-item"><span class="job-meta-icon">📍</span> ${escapeHtml(listing.location || "Location N/A")}</span>
      <span class="job-meta-item"><span class="job-meta-icon">💼</span> ${escapeHtml(listing.experience || "Any experience")}</span>
      <span class="job-meta-item"><span class="job-meta-icon">💰</span> ${escapeHtml(listing.salary || "Not specified")}</span>
    </div>

    <hr class="job-divider"/>

    <p class="job-skills-label">Skills &amp; Requirements</p>
    <div class="skill-list">${skillsHtml}</div>

    <details class="job-description">
      <summary>Role &amp; eligibility details</summary>
      <p>${escapeHtml(listing.description)}</p>
    </details>

    ${matchBadge}

    <div class="job-actions">
      <a class="apply-btn" href="/detail?id=${encodeURIComponent(listing.id)}">Apply now →</a>
      <button class="save-job-button ${isSaved ? "is-saved" : ""}"
              type="button"
              data-listing-id="${escapeHtml(listing.id)}"
              aria-pressed="${isSaved}">
        ${isSaved ? "🔖 Remove saved" : "🔖 Save job"}
      </button>
    </div>
  </article>`;
}

/* ============================================================
   Pagination Component
   ============================================================ */
function renderPagination(containerId, currentPage, totalPages, totalItems, startItem, endItem, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (totalPages <= 1) { container.hidden = true; container.innerHTML = ""; return; }
  container.hidden = false;

  let pageButtonsHtml = "";
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage   = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

  if (startPage > 1) {
    pageButtonsHtml += `<button type="button" class="pagination-page-btn" data-page="1">1</button>`;
    if (startPage > 2) pageButtonsHtml += `<span class="pagination-ellipsis">…</span>`;
  }
  for (let p = startPage; p <= endPage; p++) {
    const active = p === currentPage;
    pageButtonsHtml += `<button type="button" class="pagination-page-btn ${active ? "active" : ""}" data-page="${p}" ${active ? 'aria-current="page"' : ""}>${p}</button>`;
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pageButtonsHtml += `<span class="pagination-ellipsis">…</span>`;
    pageButtonsHtml += `<button type="button" class="pagination-page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  container.innerHTML = `
    <div class="pagination-container">
      <div class="pagination-summary">Showing <strong>${startItem}–${endItem}</strong> of <strong>${totalItems}</strong></div>
      <div class="pagination-nav">
        <button type="button" class="pagination-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>← Prev</button>
        <div class="pagination-numbers">${pageButtonsHtml}</div>
        <button type="button" class="pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>Next →</button>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      const pageNum = Number(btn.dataset.page);
      if (!Number.isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
        onPageChange(pageNum);
      }
    });
  });
}

/* ============================================================
   Open Drives — render with pagination
   ============================================================ */
function renderJobPage(page) {
  const total = processedResults.length;
  if (!total) {
    jobList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p class="empty-state-title">No drives right now</p>
        <p class="empty-state-sub">There are no upcoming interview drives at the moment. Check back soon!</p>
      </div>`;
    const pag = document.getElementById("jobPagination");
    if (pag) pag.hidden = true;
    return;
  }

  const totalPages = Math.ceil(total / JOBS_PER_PAGE);
  currentJobPage   = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentJobPage - 1) * JOBS_PER_PAGE;
  const endIndex   = Math.min(startIndex + JOBS_PER_PAGE, total);
  const pageItems  = processedResults.slice(startIndex, endIndex);

  jobList.innerHTML = pageItems.map(({ listing, matchedSkills }) => jobCardMarkup(listing, matchedSkills)).join("");

  renderPagination("jobPagination", currentJobPage, totalPages, total, startIndex + 1, endIndex, newPage => {
    renderJobPage(newPage);
    document.querySelector(".dash-section").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderListings(listings, user, page = 1) {
  const scored = listings.map(listing => ({ listing, ...scoreListing(listing, user) }));
  const hasPreferences = Boolean(user.skills.length || user.preferredLocation || user.education);
  const matches = hasPreferences ? scored.filter(item => item.score > 0) : [];
  processedResults = matches.length ? matches : scored;
  processedResults.sort((a, b) => b.score - a.score);

  const total = processedResults.length;
  document.getElementById("listingCount").textContent  = String(total);
  document.getElementById("statTotal").textContent     = String(total);
  document.getElementById("statMatched").textContent   = String(matches.length || total);

  document.getElementById("matchNote").textContent = matches.length
    ? `${matches.length} drive${matches.length === 1 ? "" : "s"} matched your skills or location.`
    : "No direct profile matches yet — showing all current open drives.";

  // Hide skeletons, show real list
  if (jobSkeletonList) jobSkeletonList.hidden = true;
  jobList.hidden = false;

  renderJobPage(page);
}

/* ============================================================
   Saved Jobs — render with pagination
   ============================================================ */
function renderSavedPage(page) {
  const total = savedListings.length;
  document.getElementById("savedListingCount").textContent = String(total);
  document.getElementById("statSaved").textContent         = String(total);
  document.getElementById("savedListingNote").textContent  = total
    ? "Your bookmarked interview drives are ready whenever you need them."
    : "Save a drive from the list above to bookmark it here.";

  if (!total) {
    savedJobList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔖</div>
        <p class="empty-state-title">No saved jobs yet</p>
        <p class="empty-state-sub">Click "Save job" on any drive to bookmark it here for quick access.</p>
      </div>`;
    const pag = document.getElementById("savedJobPagination");
    if (pag) pag.hidden = true;
    return;
  }

  const totalPages = Math.ceil(total / SAVED_PER_PAGE);
  currentSavedPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentSavedPage - 1) * SAVED_PER_PAGE;
  const endIndex   = Math.min(startIndex + SAVED_PER_PAGE, total);
  const pageItems  = savedListings.slice(startIndex, endIndex);

  savedJobList.innerHTML = pageItems.map(listing => jobCardMarkup(listing)).join("");

  renderPagination("savedJobPagination", currentSavedPage, totalPages, total, startIndex + 1, endIndex, newPage => {
    renderSavedPage(newPage);
    document.querySelector(".dash-section-saved").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderSavedListings(page = 1) { renderSavedPage(page); }

/* ============================================================
   Save / Unsave Action Handler
   ============================================================ */
async function toggleSavedListing(listingId, button) {
  button.disabled = true;
  try {
    if (savedListingIds.has(listingId)) {
      await apiRequest(`/api/user/saved-listings/${encodeURIComponent(listingId)}`, { method: "DELETE" });
      savedListingIds.delete(listingId);
      savedListings = savedListings.filter(l => l.id !== listingId);
    } else {
      await apiRequest("/api/user/saved-listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId })
      });
      const listing = currentListings.find(l => l.id === listingId);
      if (listing) { savedListings.unshift(listing); }
      savedListingIds.add(listingId);
    }
    renderJobPage(currentJobPage);
    renderSavedPage(currentSavedPage);
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
  }
}

function handleSavedListingClick(event) {
  const button = event.target.closest(".save-job-button[data-listing-id]");
  if (button) toggleSavedListing(button.dataset.listingId, button);
}

/* ============================================================
   Dashboard Initialization
   ============================================================ */
async function loadDashboard() {
  try {
    const [session, dashboard] = await Promise.all([
      apiRequest("/api/user/session"),
      apiRequest("/api/user/dashboard")
    ]);
    renderProfile(session.user);
    currentListings = dashboard.listings || [];
    renderListings(currentListings, currentUser, 1);

    try {
      const saved = await apiRequest("/api/user/saved-listings");
      savedListings = saved.listings || [];
      savedListingIds.clear();
      savedListings.forEach(l => savedListingIds.add(l.id));
      // Re-render job page so save-button states update
      renderJobPage(currentJobPage);
      renderSavedListings(1);
      // Update saved stat in profile
      document.getElementById("statSaved").textContent = String(savedListings.length);
    } catch (error) {
      document.getElementById("savedListingNote").textContent = "Could not load saved jobs. Refresh to try again.";
      savedJobList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <p class="empty-state-title">Saved jobs unavailable</p>
          <p class="empty-state-sub">Refresh the page to try again.</p>
        </div>`;
      showToast(error.message, "error");
      console.error("Could not load saved jobs:", error);
    }
  } catch (error) {
    if (error.message) showToast(error.message, "error");
  }
}

jobList.addEventListener("click", handleSavedListingClick);
savedJobList.addEventListener("click", handleSavedListingClick);

document.getElementById("logoutButton").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await apiRequest("/api/user/logout", { method: "POST" });
    window.location.replace("/user-login");
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
  }
});

loadDashboard();
