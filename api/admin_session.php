<?php
/**
 * Codeloop - Admin Session Check API
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/helpers.php';

if (isAdminLoggedIn()) {
    $username = $_SESSION['admin_user'] ?? 'admin';
    sendJsonResponse(['authenticated' => true, 'username' => $username]);
} else {
    sendJsonResponse(['error' => 'Authentication required.'], 401);
}
