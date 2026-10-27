<?php
/**
 * Codeloop - Admin Login Page (PHP + MySQL + Apache)
 */
require_once __DIR__ . '/config/auth.php';

$error = '';

// If already logged in, go straight to admin dashboard
if (isAdminLoggedIn()) {
    header('Location: /admin');
    exit;
}

// Support direct HTML Form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $error = 'Admin ID and password are required.';
    } else {
        if (verifyAdminCredentials($username, $password)) {
            loginAdmin($username);
            header('Location: /admin');
            exit;
        } else {
            $error = 'Invalid admin ID or password.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light"/>
  <title>Admin Sign In – Codeloop</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="admin.css"/>
  <script src="admin-login.js" defer></script>
</head>
<body>
  <main class="auth-overlay">
    <form class="auth-box" id="loginForm" method="POST" action="/admin-login">
      <div class="auth-logo">Interview<span>Edge</span></div>
      <div class="auth-sub">Sign in to the authorized admin account</div>

      <?php if (!empty($error)): ?>
        <div style="background: rgba(239,68,68,0.15); color: #dc2626; padding: 0.65rem 0.9rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1rem; border: 1px solid rgba(239,68,68,0.3);">
          <?= htmlspecialchars($error) ?>
        </div>
      <?php endif; ?>

      <label class="auth-hint" for="username">Admin ID</label>
      <input id="username" name="username" type="text" autocomplete="username" required maxlength="128" value="<?= htmlspecialchars($_POST['username'] ?? 'admin') ?>"/>
      
      <label class="auth-hint" for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024" placeholder="Enter password (default: admin123)"/>
      
      <button class="btn-primary" id="loginButton" type="submit">🔓 Sign in</button>
      <div class="auth-hint" style="margin-top: 1rem;">
        Default credentials: <strong>admin</strong> / <strong>admin123</strong><br/>
        Connected to XAMPP MySQL database.
      </div>
      <div style="margin-top: 1.2rem;">
        <a href="/" style="color: var(--muted); text-decoration: none; font-size: 0.8rem;">← Back to Public Website</a>
      </div>
    </form>
  </main>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
</body>
</html>
