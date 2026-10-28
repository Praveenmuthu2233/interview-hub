<?php
/**
 * Codeloop - Admin Dashboard (PHP + MySQL + Apache)
 */
require_once __DIR__ . '/config/auth.php';
require_once __DIR__ . '/config/helpers.php';

// Enforce admin login
requireAdminPage();

$currentAdmin = getCurrentAdminUsername();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Admin Panel - Codeloop</title>
<link rel="icon" type="image/png" href="11zon_cropped.png"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="admin.css"/>
<script src="admin.js" defer></script>
</head>
<body>

<header>
  <div class="header-inner">
    <div style="display:flex;align-items:center;gap:.65rem;">
      <div class="logo">Code<span style="color: #ff5e00;">Loop</span></div>
      <span class="badge-admin">Admin</span>
      <span class="fb-badge">⚡ PHP &amp; MySQL Connected</span>
    </div>
    <div class="header-actions">
      <div class="admin-user-pill">
        <span class="pill-dot"></span>
        <span>Logged in as: <strong id="headerAdminName"><?= htmlspecialchars($currentAdmin) ?></strong></span>
      </div>
      <button class="btn-secondary" id="logoutBtn" type="button">Log out</button>
      <a href="/" class="back-link">View Public Site</a>
    </div>
  </div>
</header>

<!-- Top Subnavigation Tabs -->
<nav class="admin-subnav" aria-label="Admin Navigation">
  <div class="admin-subnav-inner">
    <div class="admin-nav-tabs" role="tablist">
      <button type="button" class="admin-nav-tab active" data-tab="listings" id="tabListings" role="tab" aria-selected="true">
        <span>📋 Job Listings</span>
        <span class="tab-count" id="tabListingsCount">0</span>
      </button>
      <button type="button" class="admin-nav-tab" data-tab="activity" id="tabActivity" role="tab" aria-selected="false">
        <span>🕒 Activity Log (Audit Trail)</span>
        <span class="tab-count" id="tabActivityCount">0</span>
      </button>
      <button type="button" class="admin-nav-tab" data-tab="admins" id="tabAdmins" role="tab" aria-selected="false">
        <span>👥 Manage Admins</span>
        <span class="tab-count" id="tabAdminsCount">1</span>
      </button>
      <a href="/admin/users" class="admin-nav-tab">
        <span>🎓 Registered Users</span>
      </a>
    </div>
  </div>
</nav>

<!-- ==========================================
     TAB 1: JOB LISTINGS
========================================== -->
<div class="admin-section" id="viewListings">
  <div class="admin-wrap">
    <div>
      <div class="form-card">
        <div class="form-card-header">
          <div class="form-card-title" id="formTitle">➕ Add Interview Listing</div>
          <div class="form-card-sub" id="formSub">Fill in details. All additions and changes will be logged with your admin ID.</div>
        </div>
        <div class="form-body">
          <input type="hidden" id="editId"/>
          <div class="form-row">
            <div class="form-group">
              <label>Company Name *</label>
              <input class="form-control" id="fCompany" placeholder="e.g. Infosys"/>
            </div>
            <div class="form-group">
              <label>Interview Type *</label>
              <select class="form-control" id="fType">
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="walkin">Walk-in</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Job Role / Position *</label>
            <input class="form-control" id="fRole" placeholder="e.g. Software Engineer"/>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Interview Date *</label>
              <input class="form-control" type="date" id="fDate" value="<?= date('Y-m-d') ?>"/>
            </div>
            <div class="form-group">
              <label>Location</label>
              <input class="form-control" id="fLocation" placeholder="e.g. Chennai / Remote"/>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Experience</label>
              <input class="form-control" id="fExperience" placeholder="e.g. 0-2 years"/>
            </div>
            <div class="form-group">
              <label>Salary / Package</label>
              <input class="form-control" id="fSalary" placeholder="e.g. ₹4 LPA"/>
            </div>
          </div>
          <div class="form-group">
            <label>Skills (press Enter or comma)</label>
            <div class="tags-input-wrap" id="tagsWrap">
              <input id="tagField" class="tag-input-field" placeholder="e.g. Java, Python..."/>
            </div>
          </div>
          <div class="form-group">
            <label>Apply Link (URL)</label>
            <input class="form-control" id="fLink" placeholder="https://company.com/careers"/>
          </div>
          <div class="form-group">
            <label>Description * (process, eligibility, details)</label>
            <textarea class="form-control" id="fDesc" placeholder="Describe interview process, eligibility criteria, required documents, venue details, deadlines."></textarea>
          </div>
          <div style="display:flex;gap:.5rem;">
            <button class="btn-primary" id="saveBtn" type="button">💾 Save Listing</button>
            <button class="btn-secondary" id="resetBtn" type="button">Reset</button>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="stats-bar" id="statsBar">
        <div class="stat-card"><div class="stat-card-label">Total Listings</div><div class="stat-card-val accent" id="statTotalVal">-</div></div>
        <div class="stat-card"><div class="stat-card-label">Online</div><div class="stat-card-val green" id="statOnlineVal">-</div></div>
        <div class="stat-card"><div class="stat-card-label">Walk-in</div><div class="stat-card-val blue" id="statWalkinVal">-</div></div>
        <div class="stat-card"><div class="stat-card-label">Today's Drives</div><div class="stat-card-val red" id="statTodayVal">-</div></div>
      </div>
      <div class="table-card">
        <div class="table-header">
          <div style="display:flex;align-items:center;gap:.65rem;">
            <div class="table-title">All Job Listings</div>
            <span class="entry-count" id="entryCount">0</span>
          </div>
          <div class="table-search">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" id="adminSearch" placeholder="Search company, role..." aria-label="Search listings"/>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Type</th>
                <th>Date</th>
                <th>Location</th>
                <th>Added By / Updated By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <tr class="empty-row"><td colspan="7">Loading listings from database...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ==========================================
     TAB 2: ACTIVITY LOG (AUDIT TRAIL)
========================================== -->
<div class="admin-section hidden" id="viewActivity">
  <div class="admin-full-wrap">
    <div class="stats-bar" id="activityStatsBar">
      <div class="stat-card"><div class="stat-card-label">Total Actions Logged</div><div class="stat-card-val accent" id="actStatTotal">0</div></div>
      <div class="stat-card"><div class="stat-card-label">Jobs Added</div><div class="stat-card-val green" id="actStatInserted">0</div></div>
      <div class="stat-card"><div class="stat-card-label">Jobs Updated</div><div class="stat-card-val blue" id="actStatUpdated">0</div></div>
      <div class="stat-card"><div class="stat-card-label">Jobs Deleted</div><div class="stat-card-val red" id="actStatDeleted">0</div></div>
    </div>

    <div class="table-card">
      <div class="table-header">
        <div>
          <div class="table-title">Website Activity &amp; Audit Trail</div>
          <div class="form-card-sub">Every addition, update, or deletion of a job and admin account is permanently recorded with who made the change.</div>
        </div>
        <div class="activity-filter-bar">
          <div class="table-search">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" id="actSearch" placeholder="Filter by admin, job..." aria-label="Filter activity logs"/>
          </div>
          <select class="filter-select" id="actActionFilter" aria-label="Filter by action type">
            <option value="">All Action Types</option>
            <option value="INSERT_JOB">Job Insertions</option>
            <option value="UPDATE_JOB">Job Updates</option>
            <option value="DELETE_JOB">Job Deletions</option>
            <option value="CREATE_ADMIN">Admin Additions</option>
            <option value="DELETE_ADMIN">Admin Deletions</option>
          </select>
          <button type="button" class="btn-refresh" id="refreshActBtn">⟳ Refresh</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Admin (Who Changed)</th>
              <th>Action</th>
              <th>Target Item</th>
              <th>Change Details</th>
            </tr>
          </thead>
          <tbody id="activityTableBody">
            <tr class="empty-row"><td colspan="5">Loading audit trail logs...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- ==========================================
     TAB 3: MANAGE ADMINS
========================================== -->
<div class="admin-section hidden" id="viewAdmins">
  <div class="admin-full-wrap">
    <div class="admin-mgmt-grid">
      <!-- Add New Admin Card -->
      <div class="form-card">
        <div class="form-card-header">
          <div class="form-card-title">➕ Add New Admin</div>
          <div class="form-card-sub">Create a new admin account with full access to manage listings.</div>
        </div>
        <div class="form-body">
          <div class="form-group">
            <label>Admin Username *</label>
            <input class="form-control" id="newAdminUser" placeholder="e.g. sarah_admin" autocomplete="off"/>
          </div>
          <div class="form-group">
            <label>Email Address (Optional)</label>
            <input class="form-control" type="email" id="newAdminEmail" placeholder="e.g. sarah@example.com"/>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Password * (min 6 chars)</label>
              <input class="form-control" type="password" id="newAdminPass" placeholder="••••••••" autocomplete="new-password"/>
            </div>
            <div class="form-group">
              <label>Confirm Password *</label>
              <input class="form-control" type="password" id="newAdminPassConfirm" placeholder="••••••••" autocomplete="new-password"/>
            </div>
          </div>
          <button class="btn-primary" id="createAdminBtn" type="button" style="margin-top:.5rem;">➕ Create Admin Account</button>
          <div class="admin-helper-callout">
            <strong>🔒 Accountability Note:</strong><br/>
            The new admin can log in at <code>/admin-login</code>. Any action they take (adding, updating, or deleting job listings) will be transparently logged under their username in the <strong>Activity Log</strong> so all admins know who made each change.
          </div>
        </div>
      </div>

      <!-- List of Existing Admins Card -->
      <div class="table-card">
        <div class="table-header">
          <div style="display:flex;align-items:center;gap:.65rem;">
            <div class="table-title">Existing Admin Accounts</div>
            <span class="entry-count" id="adminCountBadge">0</span>
          </div>
          <div class="table-search">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" id="adminSearchField" placeholder="Filter admins..." aria-label="Filter admins"/>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Admin Username</th>
                <th>Email</th>
                <th>Created By</th>
                <th>Date Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="adminsTableBody">
              <tr class="empty-row"><td colspan="5">Loading admin accounts...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast" role="status" aria-live="polite"></div>

</body>
</html>
