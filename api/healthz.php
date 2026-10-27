<?php
/**
 * Codeloop - Health Check API
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

try {
    $pdo = getDB();
    $pdo->query("SELECT 1");
    sendJsonResponse(['status' => 'ok', 'database' => 'connected', 'timestamp' => date('c')]);
} catch (Exception $e) {
    sendJsonResponse(['status' => 'unavailable', 'error' => $e->getMessage()], 503);
}
