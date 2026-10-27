<?php
/**
 * Codeloop - Admin Dashboard (PHP + MySQL + Apache)
 */
require_once __DIR__ . '/config/auth.php';
require_once __DIR__ . '/config/helpers.php';

// Enforce admin login
requireAdminPage();

$pdo = getDB();

// Fetch initial stats
$today = date('Y-m-d');
$qp = getListingQueryParts($pdo);

try {
    $statTotal = (int)$pdo->query("SELECT COUNT(*) FROM `interviews`")->fetchColumn();
    $statOnline = (int)$pdo->query("SELECT COUNT(*) FROM `interviews` WHERE {$qp['typeCol']} = 'online'")->fetchColumn();
    $statWalkin = (int)$pdo->query("SELECT COUNT(*) FROM `interviews` WHERE {$qp['typeCol']} = 'walkin'")->fetchColumn();
    
    $todayStmt = $pdo->prepare("SELECT COUNT(*) FROM `interviews` WHERE DATE({$qp['dateCol']}) = ?");
    $todayStmt->execute([$today]);
    $statToday = (int)$todayStmt->fetchColumn();
} catch (Exception $e) {
    $statTotal = $statOnline = $statWalkin = $statToday = 0;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Admin Panel – Codeloop</title>
<link rel="icon" type="image/png" href="11zon_cropped.png"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="admin.css"/>
<script src="admin.js" defer></script>
</head>
<body>

<header>
  <div class="header-inner">
    <div style="display:flex;align-items:center;gap:.5rem;">
      <div class="logo">Codeloop</div>
      <span class="badge-admin">Admin</span>
      <span class="fb-badge">⚡ PHP &amp; MySQL Connected</span>
    </div>
    <div class="header-actions">
      <button class="btn-secondary" id="logoutBtn" type="button">Log out</button>
      <a href="index.php" class="back-link">← View Public Site</a>
    </div>
  </div>
</header>

<div class="admin-wrap">
  <div>
    <div class="form-card">
      <div class="form-card-header">
        <div class="form-card-title" id="formTitle">➕ Add Interview Listing</div>
        <div class="form-card-sub" id="formSub">Fill in all the details below</div>
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
            <input id="tagField" class="tag-input-field" placeholder="e.g. Java, Python…"/>
          </div>
        </div>
        <div class="form-group">
          <label>Apply Link (URL)</label>
          <input class="form-control" id="fLink" placeholder="https://company.com/careers"/>
        </div>
        <div class="form-group">
          <label>Description * (full details, eligibility, process)</label>
          <textarea class="form-control" id="fDesc" placeholder="Describe the interview process, eligibility criteria, documents needed, venue details, deadlines…"></textarea>
        </div>
        <div style="display:flex;gap:.5rem;">
          <button class="btn-primary" id="saveBtn" type="button">💾 Save Listing</button>
          <button class="btn-secondary" id="resetBtn" type="button">✕ Reset</button>
        </div>
      </div>
    </div>
  </div>

  <div>
    <div class="stats-bar" id="statsBar">
      <div class="stat-card"><div class="stat-card-label">Total</div><div class="stat-card-val accent"><?= $statTotal ?></div></div>
      <div class="stat-card"><div class="stat-card-label">Online</div><div class="stat-card-val green"><?= $statOnline ?></div></div>
      <div class="stat-card"><div class="stat-card-label">Walk-in</div><div class="stat-card-val blue"><?= $statWalkin ?></div></div>
      <div class="stat-card"><div class="stat-card-label">Today</div><div class="stat-card-val red"><?= $statToday ?></div></div>
    </div>
    <div class="table-card">
      <div class="table-header">
        <div style="display:flex;align-items:center;gap:.65rem;">
          <div class="table-title">All Listings</div>
          <span class="entry-count" id="entryCount"><?= $statTotal ?></span>
        </div>
        <div class="table-search">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" id="adminSearch" placeholder="Search…" aria-label="Search listings"/>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Company</th><th>Role</th><th>Type</th><th>Date</th><th>Location</th><th>Actions</th></tr>
          </thead>
          <tbody id="tableBody"><tr class="empty-row"><td colspan="6">Loading listings from database…</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

</body>
</html>
