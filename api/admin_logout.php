<?php
/**
 * Codeloop - Admin Logout API
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/helpers.php';

logoutAdmin();
sendJsonResponse(['authenticated' => false], 200);
