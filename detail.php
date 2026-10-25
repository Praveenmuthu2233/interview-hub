<?php
/**
 * InterviewEdge - Interview Detail Page (PHP + MySQL + Apache)
 */
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

$pdo = getDB();
$id = $_GET['id'] ?? null;
$listing = null;
$relatedListings = [];
$qp = getListingQueryParts($pdo);

if ($id) {
    try {
        $stmt = $pdo->prepare("
            {$qp['select']}
            {$qp['from']}
            WHERE i.id = ? 
            LIMIT 1
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            $listing = mapListingRow($row);

            // Fetch related listings
            $relStmt = $pdo->prepare("
                {$qp['select']}
                {$qp['from']}
                WHERE i.id <> ? 
                ORDER BY {$qp['dateCol']} DESC 
                LIMIT 6
            ");
            $relStmt->execute([$id]);
            $relRows = $relStmt->fetchAll();
            $relatedListings = array_map('mapListingRow', $relRows);
        }
    } catch (Exception $e) {
        $listing = null;
    }
}

function formatDetailDate($dateStr) {
    if (!$dateStr) return 'N/A';
    $time = strtotime($dateStr);
    return $time ? date('j F Y', $time) : $dateStr;
}

$pageTitle = $listing ? htmlspecialchars($listing['role'] . ' at ' . $listing['company'] . ' – InterviewEdge') : 'Interview Details – InterviewEdge';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<link rel="stylesheet" href="light-theme.css"/>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title><?= $pageTitle ?></title>
<link rel="stylesheet" href="detail.css"/>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2328429365429845" crossorigin="anonymous"></script>
<script src="ads.js" defer></script>
</head>
<body>

<header>
  <div class="header-inner">
    <a href="index.php" class="logo">Interview<span>Edge</span></a>
    <a href="index.php" class="back-btn">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      Back to Listings
    </a>
  </div>
</header>

<div class="page-wrap">
  <main id="mainContent">
    <?php if (!$listing): ?>
      <div class="not-found">
        <h2>Listing Not Found</h2>
        <p>This interview listing may have been removed or the link is incorrect.</p>
        <a class="back-home" href="index.php">← Back to Home</a>
      </div>
    <?php else: 
      $type = in_array($listing['type'], ['online', 'offline', 'walkin']) ? $listing['type'] : 'other';
      $typeLabel = $type === 'walkin' ? 'Walk-in' : ucfirst($type);
    ?>
      <div class="breadcrumb">
        <a href="index.php">Home</a><span>›</span>
        <a href="index.php">Listings</a><span>›</span>
        <span><?= htmlspecialchars($listing['company']) ?></span>
      </div>

      <div class="ad-banner">
        <div class="ad-label">Advertisement</div>
        <ins class="adsbygoogle" data-ad-client="ca-pub-2328429365429845" data-ad-slot="2233445566" data-ad-format="auto" data-full-width-responsive="true"></ins>
      </div>

      <div class="detail-card">
        <div class="detail-hero">
          <div class="detail-badges">
            <span class="badge badge-company"><?= htmlspecialchars($listing['company']) ?></span>
            <span class="badge badge-type-<?= htmlspecialchars($type) ?>"><?= htmlspecialchars($typeLabel) ?></span>
          </div>
          <div class="detail-title"><?= htmlspecialchars($listing['role']) ?></div>
          <div class="detail-company"><?= htmlspecialchars($listing['company']) ?></div>
        </div>

        <div class="detail-meta-grid">
          <div class="meta-item">
            <div class="meta-label">📅 Interview Date</div>
            <div class="meta-value accent"><?= formatDetailDate($listing['date']) ?></div>
          </div>
          <div class="meta-item">
            <div class="meta-label">📍 Location</div>
            <div class="meta-value"><?= htmlspecialchars($listing['location'] ?: 'N/A') ?></div>
          </div>
          <div class="meta-item">
            <div class="meta-label">💼 Experience</div>
            <div class="meta-value"><?= htmlspecialchars($listing['experience'] ?: 'N/A') ?></div>
          </div>
          <div class="meta-item">
            <div class="meta-label">💰 Salary / Package</div>
            <div class="meta-value accent"><?= htmlspecialchars($listing['salary'] ?: 'Not disclosed') ?></div>
          </div>
          <div class="meta-item">
            <div class="meta-label">🏷️ Interview Type</div>
            <div class="meta-value"><?= htmlspecialchars($typeLabel) ?></div>
          </div>
        </div>

        <?php if (!empty($listing['skills'])): ?>
          <div class="detail-section">
            <div class="detail-section-title">🛠 Skills Required</div>
            <div class="skills-wrap">
              <?php foreach ($listing['skills'] as $skill): ?>
                <span class="skill-tag"><?= htmlspecialchars($skill) ?></span>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endif; ?>

        <div class="detail-section">
          <div class="detail-section-title">📄 About This Interview</div>
          <div class="desc-text"><?= nl2br(htmlspecialchars($listing['description'] ?: 'No description available.')) ?></div>
        </div>

        <div class="detail-section">
          <div class="apply-box">
            <h3>Ready to Apply?</h3>
            <p>Click below to visit the official application page for this position at <?= htmlspecialchars($listing['company']) ?>.</p>
            <?php if (!empty($listing['applyLink'])): ?>
              <a class="btn-apply" href="<?= htmlspecialchars($listing['applyLink']) ?>" target="_blank" rel="noopener">🚀 Apply Now on Official Site</a>
            <?php else: ?>
              <span class="apply-unavailable">No direct link available. Contact the company directly.</span>
            <?php endif; ?>
            <button class="btn-share" id="shareJobButton" type="button">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share this Job
            </button>
          </div>
        </div>
      </div>
    <?php endif; ?>
  </main>

  <aside class="sidebar">
    <div class="ad-banner">
      <div class="ad-label">Advertisement</div>
      <ins class="adsbygoogle" data-ad-client="ca-pub-2328429365429845" data-ad-slot="1122334455" data-ad-format="auto" data-full-width-responsive="true"></ins>
    </div>
    <div class="sidebar-widget">
      <div class="widget-header">🔗 Related Listings</div>
      <div class="widget-body" id="relatedList">
        <?php if (!empty($relatedListings)): ?>
          <?php foreach ($relatedListings as $rel): ?>
            <div class="related-item" data-id="<?= htmlspecialchars($rel['id']) ?>" role="button" tabindex="0" onclick="window.location.href='detail.php?id=<?= urlencode($rel['id']) ?>'">
              <div class="related-company"><?= htmlspecialchars($rel['company']) ?></div>
              <div class="related-role"><?= htmlspecialchars($rel['role']) ?></div>
              <div class="related-date"><?= formatDetailDate($rel['date']) ?></div>
            </div>
          <?php endforeach; ?>
        <?php else: ?>
          <p class="empty-related">No related listings.</p>
        <?php endif; ?>
      </div>
    </div>
    <div class="ad-banner">
      <div class="ad-label">Advertisement</div>
      <ins class="adsbygoogle" data-ad-client="ca-pub-2328429365429845" data-ad-slot="5566778899" data-ad-format="auto" data-full-width-responsive="true"></ins>
    </div>
  </aside>
</div>

<footer>
  <div class="footer-bottom">
    <div class="footer-copy">© 2026 InterviewEdge · Built with PHP &amp; MySQL in Chennai, Tamil Nadu</div>
    <div class="footer-links-row">
      <a href="index.php">Home</a>
      <a href="about.html">About</a>
      <a href="contact.php">Contact</a>
      <a href="privacy.html">Privacy</a>
      <a href="terms.html">Terms</a>
      <a href="disclaimer.html">Disclaimer</a>
    </div>
  </div>
</footer>

<a href="https://wa.me/919500206518" class="wa-float" target="_blank" title="Chat on WhatsApp">
  <svg width="25" height="25" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
</a>

<script>
document.getElementById('shareJobButton')?.addEventListener('click', async () => {
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.error(err);
  }
});
</script>
</body>
</html>
