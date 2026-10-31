<?php
/**
 * Codeloop - Admin Activity & Audit Logs API
 * Retrieves history of all changes made across the website by any admin
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/helpers.php';

// Check authorization
requireAdminApi();

$pdo = getDB();
$currentAdmin = getCurrentAdminUsername();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed.'], 405);
}

$search = trim($_GET['search'] ?? '');
$adminFilter = trim($_GET['admin'] ?? '');
$actionFilter = trim($_GET['action'] ?? '');
$limit = min(max((int)($_GET['limit'] ?? 100), 10), 300);

try {
    // Check if table exists
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'admin_activity_logs'")->fetch();
    if (!$tableCheck) {
        sendJsonResponse([
            'logs'         => [],
            'stats'        => ['total' => 0, 'inserted' => 0, 'updated' => 0, 'deleted' => 0, 'admins' => 0],
            'currentAdmin' => $currentAdmin
        ]);
    }

    $where = [];
    $params = [];

    if (!empty($search)) {
        $where[] = "(admin_username LIKE ? OR item_title LIKE ? OR details LIKE ?)";
        $term = "%{$search}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }

    if (!empty($adminFilter)) {
        $where[] = "admin_username = ?";
        $params[] = $adminFilter;
    }

    if (!empty($actionFilter)) {
        $where[] = "action_type = ?";
        $params[] = $actionFilter;
    }

    $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $stmt = $pdo->prepare("
        SELECT id, admin_username, action_type, entity_type, entity_id, item_title, details, created_at
        FROM `admin_activity_logs`
        {$whereSql}
        ORDER BY created_at DESC, id DESC
        LIMIT {$limit}
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Compute overview stats
    $statInserted = (int)$pdo->query("SELECT COUNT(*) FROM `admin_activity_logs` WHERE action_type = 'INSERT_JOB'")->fetchColumn();
    $statUpdated = (int)$pdo->query("SELECT COUNT(*) FROM `admin_activity_logs` WHERE action_type = 'UPDATE_JOB'")->fetchColumn();
    $statDeleted = (int)$pdo->query("SELECT COUNT(*) FROM `admin_activity_logs` WHERE action_type = 'DELETE_JOB'")->fetchColumn();
    $statAdminActions = (int)$pdo->query("SELECT COUNT(*) FROM `admin_activity_logs` WHERE action_type IN ('CREATE_ADMIN', 'DELETE_ADMIN')")->fetchColumn();
    $statTotal = (int)$pdo->query("SELECT COUNT(*) FROM `admin_activity_logs`")->fetchColumn();

    $logs = array_map(function($row) {
        return [
            'id'             => (int)$row['id'],
            'adminUsername'  => $row['admin_username'],
            'actionType'     => $row['action_type'],
            'entityType'     => $row['entity_type'],
            'entityId'       => $row['entity_id'],
            'itemTitle'      => $row['item_title'] ?? '',
            'details'        => $row['details'] ?? '',
            'createdAt'      => $row['created_at']
        ];
    }, $rows);

    sendJsonResponse([
        'logs'         => $logs,
        'stats'        => [
            'total'     => $statTotal,
            'inserted'  => $statInserted,
            'updated'   => $statUpdated,
            'deleted'   => $statDeleted,
            'admins'    => $statAdminActions
        ],
        'currentAdmin' => $currentAdmin
    ]);
} catch (PDOException $e) {
    sendJsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
