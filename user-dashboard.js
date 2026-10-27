"use strict";

const profileContainer = document.getElementById("profileDetails");
const jobList = document.getElementById("jobList");
const savedJobList = document.getElementById("savedJobList");
const portalMessage = document.getElementById("portalMessage");
let currentUser;
let currentListings = [];
let savedListings = [];
const savedListingIds = new Set();

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

function profileValue(value) {
  return value ? escapeHtml(value) : '<span class="muted">Not provided</span>';
}

function renderProfile(user) {
  currentUser = user;
  document.getElementById("welcomeName").textContent = `Hello, ${user.fullName}`;
  const skillTags = user.skills.length
    ? user.skills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")
    : '<span class="muted">Not provided</span>';
  profileContainer.innerHTML = `
    <div class="profile-primary">
      <div class="avatar">${escapeHtml((user.fullName || "?").trim().slice(0, 1).toUpperCase())}</div>
      <div><h3>${escapeHtml(user.fullName)}</h3><p>${escapeHtml(user.email)}</p></div>
    </div>
    <dl class="profile-list">
      <div><dt>Phone</dt><dd>${profileValue(user.phone)}</dd></div>
      <div><dt>Education</dt><dd>${profileValue(user.education)}</dd></div>
      <div><dt>Graduation year</dt><dd>${profileValue(user.graduationYear)}</dd></div>
      <div><dt>Experience</dt><dd>${profileValue(user.experience)}</dd></div>
      <div><dt>Preferred location</dt><dd>${profileValue(user.preferredLocation)}</dd></div>
      <div class="skills-field"><dt>Skills</dt><dd class="skill-list">${skillTags}</dd></div>
    </dl>
    <form id="profileEditForm" class="profile-edit-form" hidden>
      <div class="profile-form-grid">
        <div class="portal-field full-width">
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
      </div>
      <div class="profile-edit-actions">
        <button class="portal-button" id="saveProfileButton" type="submit">Save changes</button>
        <button class="portal-button secondary" id="cancelProfileButton" type="button">Cancel</button>
      </div>
    </form>`;
  document.getElementById("editProfileButton").hidden = false;
  document.getElementById("cancelProfileButton").addEventListener("click", closeProfileEditor);
  document.getElementById("profileEditForm").addEventListener("submit", saveProfile);
}

function openProfileEditor() {
  document.getElementById("editFullName").value = currentUser.fullName || "";
  document.getElementById("editPhone").value = currentUser.phone || "";
  document.getElementById("editEducation").value = currentUser.education || "";
  document.getElementById("editGraduationYear").value = currentUser.graduationYear || "";
  document.getElementById("editExperience").value = currentUser.experience || "";
  document.getElementById("editSkills").value = currentUser.skills.join(", ");
  document.getElementById("editPreferredLocation").value = currentUser.preferredLocation || "";
  document.getElementById("profileEditForm").hidden = false;
  document.getElementById("editProfileButton").hidden = true;
}

function closeProfileEditor() {
  document.getElementById("profileEditForm").hidden = true;
  document.getElementById("editProfileButton").hidden = false;
}

document.getElementById("editProfileButton").addEventListener("click", openProfileEditor);

async function saveProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.getElementById("saveProfileButton");
  const values = new FormData(form);
  const profile = Object.fromEntries(values.entries());
  profile.email = currentUser.email;
  profile.skills = String(profile.skills).split(",").map(skill => skill.trim()).filter(Boolean);
  button.disabled = true;
  try {
    const result = await apiRequest("/api/user/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile)
    });
    renderProfile(result.user);
    renderListings(currentListings, currentUser);
    portalMessage.textContent = "Your profile has been updated.";
    portalMessage.className = "portal-message show success";
  } catch (error) {
    portalMessage.textContent = error.message;
    portalMessage.className = "portal-message show error";
    button.disabled = false;
  }
}

function scoreListing(listing, user) {
  const searchText = [
    listing.company,
    listing.role,
    listing.location,
    listing.experience,
    listing.description,
    ...(listing.skills || [])
  ].join(" ").toLowerCase();
  const matchedSkills = user.skills.filter(skill => skill && searchText.includes(skill.toLowerCase()));
  let score = matchedSkills.length;
  if (user.preferredLocation && searchText.includes(user.preferredLocation.toLowerCase())) score += 2;
  if (user.education && searchText.includes(user.education.toLowerCase())) score += 1;
  return { score, matchedSkills };
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Date not available"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function jobCardMarkup(listing, matchedSkills = []) {
  const type = listing.type === "walkin" ? "Walk-in" : listing.type;
  const skills = listing.skills.length
    ? listing.skills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")
    : '<span class="muted">See role details</span>';
  const isSaved = savedListingIds.has(listing.id);
  return `<article class="job-card">
    <div class="job-card-heading">
      <div><p class="company-name">${escapeHtml(listing.company)}</p><h3>${escapeHtml(listing.role)}</h3></div>
      <span class="type-pill">${escapeHtml(type)}</span>
    </div>
    <div class="job-meta">
      <span>📅 ${escapeHtml(formatDate(listing.date))}</span>
      <span>📍 ${escapeHtml(listing.location || "Location not specified")}</span>
      <span>Experience: ${escapeHtml(listing.experience || "Not specified")}</span>
      <span>Salary: ${escapeHtml(listing.salary || "Not specified")}</span>
    </div>
    <div class="requirements"><h4>Skills / requirements</h4><div class="skill-list">${skills}</div></div>
    <details class="job-description"><summary>Read role and eligibility details</summary><p>${escapeHtml(listing.description)}</p></details>
    ${matchedSkills.length ? `<p class="matched-skills">Matches your skills: ${escapeHtml(matchedSkills.join(", "))}</p>` : ""}
    <div class="job-actions">
      <a class="apply-link" href="/detail?id=${encodeURIComponent(listing.id)}">Apply now</a>
      <button class="save-job-button" type="button" data-listing-id="${escapeHtml(listing.id)}" aria-pressed="${isSaved}">
        ${isSaved ? "Remove saved job" : "Save job"}
      </button>
    </div>
  </article>`;
}

function renderListings(listings, user) {
  const scored = listings.map(listing => ({ listing, ...scoreListing(listing, user) }));
  const hasPreferences = Boolean(user.skills.length || user.preferredLocation || user.education);
  const matches = hasPreferences ? scored.filter(item => item.score > 0) : [];
  const results = matches.length ? matches : scored;
  results.sort((first, second) => second.score - first.score);
  document.getElementById("listingCount").textContent = String(results.length);
  document.getElementById("matchNote").textContent = matches.length
    ? `${matches.length} drive${matches.length === 1 ? "" : "s"} matched your skills or location.`
    : "No direct profile matches yet, so here are all current open drives.";

  if (!results.length) {
    jobList.innerHTML = '<div class="empty-state">There are no upcoming interview drives right now. Please check back soon.</div>';
    return;
  }

  jobList.innerHTML = results.map(({ listing, matchedSkills }) => jobCardMarkup(listing, matchedSkills)).join("");
}

function renderSavedListings() {
  document.getElementById("savedListingCount").textContent = String(savedListings.length);
  document.getElementById("savedListingNote").textContent = savedListings.length
    ? "Your bookmarked interview drives are ready whenever you need them."
    : "Save a drive to keep it handy here.";
  savedJobList.innerHTML = savedListings.length
    ? savedListings.map(listing => jobCardMarkup(listing)).join("")
    : '<div class="empty-state">You have no saved jobs yet.</div>';
}

async function toggleSavedListing(listingId, button) {
  button.disabled = true;
  try {
    if (savedListingIds.has(listingId)) {
      await apiRequest(`/api/user/saved-listings/${encodeURIComponent(listingId)}`, { method: "DELETE" });
      savedListingIds.delete(listingId);
      savedListings = savedListings.filter(listing => listing.id !== listingId);
    } else {
      await apiRequest("/api/user/saved-listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId })
      });
      const listing = currentListings.find(item => item.id === listingId);
      if (listing) savedListings.unshift(listing);
      savedListingIds.add(listingId);
    }
    renderListings(currentListings, currentUser);
    renderSavedListings();
  } catch (error) {
    portalMessage.textContent = error.message;
    portalMessage.className = "portal-message show error";
    button.disabled = false;
  }
}

function handleSavedListingClick(event) {
  const button = event.target.closest(".save-job-button[data-listing-id]");
  if (button) toggleSavedListing(button.dataset.listingId, button);
}

async function loadDashboard() {
  try {
    const [session, dashboard] = await Promise.all([
      apiRequest("/api/user/session"),
      apiRequest("/api/user/dashboard")
    ]);
    renderProfile(session.user);
    currentListings = dashboard.listings || [];
    renderListings(currentListings, currentUser);
    try {
      const saved = await apiRequest("/api/user/saved-listings");
      savedListings = saved.listings || [];
      savedListingIds.clear();
      savedListings.forEach(listing => savedListingIds.add(listing.id));
      renderListings(currentListings, currentUser);
      renderSavedListings();
    } catch (error) {
      document.getElementById("savedListingNote").textContent = "Could not load saved jobs. Please refresh to try again.";
      savedJobList.innerHTML = '<div class="empty-state">Saved jobs are temporarily unavailable.</div>';
      portalMessage.textContent = error.message;
      portalMessage.className = "portal-message show error";
      console.error("Could not load saved jobs:", error);
    }
  } catch (error) {
    if (error.message) {
      portalMessage.textContent = error.message;
      portalMessage.className = "portal-message show error";
    }
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
    portalMessage.textContent = error.message;
    portalMessage.className = "portal-message show error";
    button.disabled = false;
  }
});

loadDashboard();
