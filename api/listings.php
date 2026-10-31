<?php
/**
 * Codeloop - Public Listings API
 * Handles listing retrieval (all, single, related)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

$pdo = getDB();
$id = $_GET['id'] ?? null;
$related = isset($_GET['related']) && $_GET['related'] == '1';

// Dynamic query parts that adapt to column names in MySQL
$qp = getListingQueryParts($pdo);

// If related listings requested: /api/listings/{id}/related
if ($id && $related) {
    try {
        $stmt = $pdo->prepare("
            {$qp['select']}
            {$qp['from']}
            WHERE {$qp['dateCol']} >= CURDATE() AND i.id <> ?
            ORDER BY {$qp['dateCol']} DESC 
            LIMIT 6
        ");
        $stmt->execute([$id]);
        $rows = $stmt->fetchAll();
        sendJsonResponse(['listings' => array_map('mapListingRow', $rows)]);
    } catch (PDOException $e) {
        sendJsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

// If single listing requested: /api/listings/{id}
if ($id) {
    try {
        $stmt = $pdo->prepare("
            {$qp['select']}
            {$qp['from']}
            WHERE i.id = ? AND {$qp['dateCol']} >= CURDATE()
            LIMIT 1
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            sendJsonResponse(['error' => 'Job not found.'], 404);
        }
        sendJsonResponse(['listing' => mapListingRow($row)]);
    } catch (PDOException $e) {
        sendJsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

// All listings requested: /api/listings
try {
    $stmt = $pdo->query("
        {$qp['select']}
        {$qp['from']}
        WHERE {$qp['dateCol']} >= CURDATE()
        ORDER BY {$qp['createdCol']} DESC
    ");
    $rows = $stmt->fetchAll();
    sendJsonResponse(['listings' => array_map('mapListingRow', $rows)]);
} catch (PDOException $e) {
    sendJsonResponse(['error' => 'Database query failed: ' . $e->getMessage()], 500);
}
