"use strict";

const mainContent = document.getElementById("mainContent");
const relatedList = document.getElementById("relatedList");
const listingId = new URLSearchParams(window.location.search).get("id");

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value || "";
  return element.innerHTML;
}

function safeExternalUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "";
  } catch {
    return "";
  }
}

function normalizedType(type) {
  return ["online", "offline", "walkin"].includes(type) ? type : "other";
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatType(type) {
  const normalized = normalizedType(type);
  return normalized === "walkin" ? "Walk-in" : normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function backToHomeLink() {
  return '<a class="back-home" href="/">← Back to Home</a>';
}

function renderSaveAction(isSaved) {
  const saveAction = document.getElementById("detailSaveAction");
  saveAction.innerHTML = `
    <button class="btn-save" id="saveJobButton" type="button" aria-pressed="${isSaved}">
      ${isSaved ? "Remove saved job" : "Save job"}
    </button>`;
  document.getElementById("saveJobButton").addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const response = isSaved
        ? await fetch(`/api/user/saved-listings/${encodeURIComponent(listingId)}`, { method: "DELETE" })
        : await fetch("/api/user/saved-listings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ listingId })
        });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Could not update saved job (status ${response.status}).`);
      }
      renderSaveAction(!isSaved);
    } catch (error) {
      const status = document.getElementById("saveJobStatus");
      status.textContent = error.message;
      console.error("Could not update saved listing:", error);
      button.disabled = false;
    }
  });
}

async function loadSaveAction() {
  try {
    const response = await fetch("/api/user/saved-listings");
    const saveAction = document.getElementById("detailSaveAction");
    if (response.status === 401) {
      saveAction.innerHTML = '<a class="save-sign-in" href="/user-login">Sign in to save this job</a>';
      return;
    }
    if (!response.ok) throw new Error(`Saved listings request failed with status ${response.status}`);
    const result = await response.json();
    renderSaveAction(result.listings.some(listing => listing.id === listingId));
  } catch (error) {
    const status = document.getElementById("saveJobStatus");
    if (status) status.textContent = "Saved jobs are temporarily unavailable.";
    console.error("Could not load saved listing status:", error);
  }
}

relatedList.addEventListener("click", event => {
  const relatedItem = event.target.closest(".related-item[data-id]");
  if (relatedItem) {
    window.location.href = `/detail?id=${encodeURIComponent(relatedItem.dataset.id)}`;
  }
});

async function loadRelated() {
  try {
    const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}/related`);
    if (!response.ok) throw new Error(`Related listings request failed with status ${response.status}`);
    const result = await response.json();
    relatedList.innerHTML = result.listings.length
      ? result.listings.map(item => `
        <div class="related-item" data-id="${escapeHtml(item.id)}">
          <div class="related-company">${escapeHtml(item.company)}</div>
          <div class="related-role">${escapeHtml(item.role)}</div>
          <div class="related-date">${formatDate(item.date)}</div>
        </div>`).join("")
      : '<p class="empty-related">No related listings.</p>';
  } catch (error) {
    relatedList.innerHTML = '<p class="empty-related">Could not load related listings.</p>';
    console.error("Related listing API request failed:", error);
  }
}

async function loadListing() {
  try {
    const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}`);
    if (response.status === 404) {
      mainContent.innerHTML = `<div class="not-found"><h2>Listing Not Found</h2><p>This interview listing may have been removed or the link is incorrect.</p>${backToHomeLink()}</div>`;
      relatedList.innerHTML = '<p class="empty-related">No related listings.</p>';
      return;
    }
    if (!response.ok) throw new Error(`Listing request failed with status ${response.status}`);

    const { listing } = await response.json();
    const type = normalizedType(listing.type);
    const applyLink = safeExternalUrl(listing.applyLink);
    document.title = `${listing.role} at ${listing.company} – Codeloop`;

    mainContent.innerHTML = `
      <div class="breadcrumb">
        <a href="/">Home</a><span>›</span>
        <a href="/">Listings</a><span>›</span>
        <span>${escapeHtml(listing.company)}</span>
      </div>
      <div class="ad-banner">
        <div class="ad-label">Advertisement</div>
        <ins class="adsbygoogle" data-ad-client="ca-pub-4688273676746522" data-ad-slot="2233445566" data-ad-format="auto" data-full-width-responsive="true"></ins>
      </div>
      <div class="detail-card">
        <div class="detail-hero">
          <div class="detail-badges">
            <span class="badge badge-company">${escapeHtml(listing.company)}</span>
            <span class="badge badge-type-${type}">${formatType(type)}</span>
          </div>
          <div class="detail-title">${escapeHtml(listing.role)}</div>
          <div class="detail-company">${escapeHtml(listing.company)}</div>
        </div>
        <div class="detail-meta-grid">
          <div class="meta-item"><div class="meta-label">📅 Interview Date</div><div class="meta-value accent">${formatDate(listing.date)}</div></div>
          <div class="meta-item"><div class="meta-label">📍 Location</div><div class="meta-value">${escapeHtml(listing.location || "N/A")}</div></div>
          <div class="meta-item"><div class="meta-label">💼 Experience</div><div class="meta-value">${escapeHtml(listing.experience || "N/A")}</div></div>
          <div class="meta-item"><div class="meta-label">💰 Salary / Package</div><div class="meta-value accent">${escapeHtml(listing.salary || "Not disclosed")}</div></div>
          <div class="meta-item"><div class="meta-label">🏷️ Interview Type</div><div class="meta-value">${formatType(type)}</div></div>
        </div>
        ${listing.skills && listing.skills.length ? `
        <div class="detail-section">
          <div class="detail-section-title">🛠 Skills Required</div>
          <div class="skills-wrap">${listing.skills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")}</div>
        </div>` : ""}
        <div class="detail-section">
          <div class="detail-section-title">📄 About This Interview</div>
          <div class="desc-text">${escapeHtml(listing.description || "No description available.").replace(/\n/g, "<br/>")}</div>
        </div>
        <div class="detail-section">
          <div class="apply-box">
            <h3>Ready to Apply?</h3>
            <p>Click below to visit the official application page for this position at ${escapeHtml(listing.company)}.</p>
            <div id="detailSaveAction"></div>
            ${applyLink ? `<a class="btn-apply" href="${applyLink}" target="_blank" rel="noopener">🚀 Apply Now on Official Site</a>` : '<span class="apply-unavailable">No direct link available. Contact the company directly.</span>'}
            <p class="save-job-status" id="saveJobStatus" role="status" aria-live="polite"></p>
            <button class="btn-share" id="shareJobButton" type="button">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share this Job
            </button>
          </div>
        </div>
      </div>`;

    const listingAd = mainContent.querySelector(".adsbygoogle");
    window.requestAnimationFrame(() => {
      if (!listingAd || listingAd.getBoundingClientRect().width === 0) {
        console.warn("Listing ad was not initialized because its container has no available width.");
        return;
      }

      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (error) {
        console.error("Listing ad initialization failed:", error);
      }
    });
    loadRelated();
    loadSaveAction();

    document.getElementById("shareJobButton").addEventListener("click", async () => {
      try {
        if (navigator.share) {
          await navigator.share({ title: `${listing.role} at ${listing.company}`, url: window.location.href });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          alert("Link copied to clipboard!");
        }
      } catch (error) {
        if (error.name !== "AbortError") console.error("Could not share listing:", error);
      }
    });
  } catch (error) {
    mainContent.innerHTML = `<div class="not-found"><h2>Error Loading Listing</h2><p>${escapeHtml(error.message)}</p>${backToHomeLink()}</div>`;
    console.error("Listing API request failed:", error);
  }
}

if (!listingId) {
  mainContent.innerHTML = `<div class="not-found"><h2>No Listing ID</h2><p>Please navigate from the home page.</p>${backToHomeLink()}</div>`;
  relatedList.innerHTML = '<p class="empty-related">No related listings.</p>';
} else {
  loadListing();
}
