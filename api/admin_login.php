<?php
/**
 * Codeloop - Admin Login API
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['error' => 'Method not allowed.'], 405);
}

$input = getJsonInput();
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    sendJsonResponse(['error' => 'Admin ID and password are required.'], 400);
}

if (verifyAdminCredentials($username, $password)) {
    loginAdmin($username);
    sendJsonResponse(['authenticated' => true]);
} else {
    sendJsonResponse(['error' => 'Invalid admin ID or password.'], 401);
}
