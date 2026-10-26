"use strict";

const profileContainer = document.getElementById("profileDetails");
const jobList = document.getElementById("jobList");
const portalMessage = document.getElementById("portalMessage");
let currentUser;

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
    window.location.replace("/user-login.html");
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
    </dl>`;
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

  jobList.innerHTML = results.map(({ listing, matchedSkills }) => {
    const type = listing.type === "walkin" ? "Walk-in" : listing.type;
    const skills = listing.skills.length
      ? listing.skills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")
      : '<span class="muted">See role details</span>';
    const applyLink = `<a class="apply-link" href="/detail.html?id=${encodeURIComponent(listing.id)}">Apply now</a>`;
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
      ${applyLink}
    </article>`;
  }).join("");
}

async function loadDashboard() {
  try {
    const [session, dashboard] = await Promise.all([
      apiRequest("/api/user/session"),
      apiRequest("/api/user/dashboard")
    ]);
    renderProfile(session.user);
    renderListings(dashboard.listings || [], currentUser);
  } catch (error) {
    if (error.message) {
      portalMessage.textContent = error.message;
      portalMessage.className = "portal-message show error";
    }
  }
}

document.getElementById("logoutButton").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await apiRequest("/api/user/logout", { method: "POST" });
    window.location.replace("/user-login.html");
  } catch (error) {
    portalMessage.textContent = error.message;
    portalMessage.className = "portal-message show error";
    button.disabled = false;
  }
});

loadDashboard();
