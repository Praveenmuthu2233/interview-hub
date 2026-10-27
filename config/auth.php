<?php
/**
 * Codeloop - Authentication Helper
 * Handles session-based and cookie-based authentication for Admin Panel
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

const ADMIN_COOKIE_NAME = 'interviewedge_admin';
const DEFAULT_ADMIN_USER = 'admin';
const ENV_ADMIN_HASH = '$2b$12$HjQ18Iy2cXw3Li/jC9MaOeiylO7bQhOOBrzkl.IDst2nrtd2Ry696';

/**
 * Checks whether the current visitor is an authenticated admin.
 *
 * @return bool
 */
function isAdminLoggedIn() {
    if (!empty($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        return true;
    }

    // Check cookie fallback
    if (!empty($_COOKIE[ADMIN_COOKIE_NAME])) {
        $token = $_COOKIE[ADMIN_COOKIE_NAME];
        if (verifyAdminToken($token)) {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_user'] = DEFAULT_ADMIN_USER;
            return true;
        }
    }

    return false;
}

/**
 * Generates an authentication token for the cookie.
 */
function generateAdminToken($username) {
    $secret = 'interviewedge_secret_salt_' . date('Y-m');
    return base64_encode($username . ':' . hash_hmac('sha256', $username, $secret));
}

/**
 * Verifies the authentication cookie token.
 */
function verifyAdminToken($token) {
    $decoded = base64_decode($token);
    if (!$decoded || strpos($decoded, ':') === false) {
        return false;
    }
    list($username, $hash) = explode(':', $decoded, 2);
    $secret = 'interviewedge_secret_salt_' . date('Y-m');
    $expectedHash = hash_hmac('sha256', $username, $secret);
    return hash_equals($expectedHash, $hash);
}

/**
 * Validates admin credentials against DB, env hash, or default admin password.
 */
function verifyAdminCredentials($username, $password) {
    if (empty($username) || empty($password)) {
        return false;
    }

    // 1. Check against admins table in MySQL
    try {
        $pdo = getDB();
        $stmt = $pdo->prepare("SELECT password_hash FROM admins WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        if ($row && !empty($row['password_hash'])) {
            if (password_verify($password, $row['password_hash'])) {
                return true;
            }
        }
    } catch (Exception $e) {
        // Fallback to static check if database table check throws
    }

    // 2. Check if username matches admin and password is 'admin123' or 'admin'
    if (strtolower(trim($username)) === 'admin') {
        if ($password === 'admin123' || $password === 'admin' || $password === 'password') {
            return true;
        }

        // Check against ENV_ADMIN_HASH
        $hash = str_replace('$2b$', '$2y$', ENV_ADMIN_HASH);
        if (password_verify($password, $hash)) {
            return true;
        }
    }

    return false;
}

/**
 * Logs in the admin, setting session and cookie.
 */
function loginAdmin($username) {
    $_SESSION['admin_logged_in'] = true;
    $_SESSION['admin_user'] = $username;

    $token = generateAdminToken($username);
    setcookie(ADMIN_COOKIE_NAME, $token, [
        'expires' => time() + 3600 * 24, // 24 hours
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

/**
 * Logs out the admin.
 */
function logoutAdmin() {
    $_SESSION = [];
    if (session_id() !== '') {
        session_destroy();
    }
    setcookie(ADMIN_COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

/**
 * Enforces admin login for protected PHP pages.
 */
function requireAdminPage() {
    if (!isAdminLoggedIn()) {
        header('Location: /admin-login');
        exit;
    }
}

/**
 * Enforces admin login for protected JSON API endpoints.
 */
function requireAdminApi() {
    if (!isAdminLoggedIn()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Authentication required. Your admin session may have expired.']);
        exit;
    }
}
