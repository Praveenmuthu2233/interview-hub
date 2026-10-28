<?php
/**
 * Codeloop - Admin Management API
 * Add, list, and delete admin accounts (with activity auditing)
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/helpers.php';

// Check authorization
requireAdminApi();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$currentAdmin = getCurrentAdminUsername();
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        try {
            // Check if created_by column exists in admins table
            $cols = array_flip($pdo->query("SHOW COLUMNS FROM `admins`")->fetchAll(PDO::FETCH_COLUMN, 0));
            $createdByField = isset($cols['created_by']) ? "created_by" : "'system' AS created_by";

            $stmt = $pdo->query("
                SELECT id, username, email, {$createdByField}, created_at
                FROM `admins`
                ORDER BY id ASC
            ");
            $rows = $stmt->fetchAll();

            $admins = array_map(function($row) use ($currentAdmin) {
                return [
                    'id'         => (int)$row['id'],
                    'username'   => $row['username'],
                    'email'      => $row['email'] ?? '',
                    'createdBy'  => $row['created_by'] ?? 'system',
                    'createdAt'  => $row['created_at'] ?? null,
                    'isCurrent'  => strcasecmp($row['username'], $currentAdmin) === 0
                ];
            }, $rows);

            sendJsonResponse([
                'admins'       => $admins,
                'currentAdmin' => $currentAdmin,
                'total'        => count($admins)
            ]);
        } catch (PDOException $e) {
            sendJsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    case 'POST':
        $input = getJsonInput();
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $email = trim($input['email'] ?? '');

        // Validations
        if (empty($username)) {
            sendJsonResponse(['error' => 'Username is required.'], 400);
        }

        if (strlen($username) < 3 || strlen($username) > 50) {
            sendJsonResponse(['error' => 'Username must be between 3 and 50 characters.'], 400);
        }

        if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $username)) {
            sendJsonResponse(['error' => 'Username may only contain letters, numbers, hyphens, and underscores.'], 400);
        }

        if (empty($password) || strlen($password) < 6) {
            sendJsonResponse(['error' => 'Password must be at least 6 characters long.'], 400);
        }

        if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendJsonResponse(['error' => 'Please provide a valid email address.'], 400);
        }

        // Check if username already exists
        try {
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM `admins` WHERE LOWER(username) = LOWER(?)");
            $checkStmt->execute([$username]);
            if ((int)$checkStmt->fetchColumn() > 0) {
                sendJsonResponse(['error' => "An admin with username '{$username}' already exists."], 409);
            }

            // Hash password securely with bcrypt
            $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

            // Check if created_by column exists
            $cols = array_flip($pdo->query("SHOW COLUMNS FROM `admins`")->fetchAll(PDO::FETCH_COLUMN, 0));
            if (isset($cols['created_by'])) {
                $stmt = $pdo->prepare("INSERT INTO `admins` (username, password_hash, email, created_by, created_at) VALUES (?, ?, ?, ?, NOW())");
                $stmt->execute([$username, $passwordHash, $email, $currentAdmin]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO `admins` (username, password_hash, email, created_at) VALUES (?, ?, ?, NOW())");
                $stmt->execute([$username, $passwordHash, $email]);
            }

            $newAdminId = (int)$pdo->lastInsertId();

            // Record in audit log
            $logDetails = "Added new admin user: '{$username}'" . ($email ? " with email: {$email}" : "");
            logAdminActivity($pdo, $currentAdmin, 'CREATE_ADMIN', 'admin', (string)$newAdminId, $username, $logDetails);

            sendJsonResponse([
                'id'       => $newAdminId,
                'username' => $username,
                'email'    => $email,
                'message'  => "Admin user '{$username}' created successfully."
            ], 201);
        } catch (PDOException $e) {
            sendJsonResponse(['error' => 'Failed to create admin: ' . $e->getMessage()], 500);
        }
        break;

    case 'DELETE':
        if (!$id) {
            sendJsonResponse(['error' => 'Admin ID is required for deletion.'], 400);
        }

        try {
            $stmt = $pdo->prepare("SELECT id, username FROM `admins` WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $target = $stmt->fetch();

            if (!$target) {
                sendJsonResponse(['error' => 'Admin not found.'], 404);
            }

            // Protect against deleting currently logged in account
            if (strcasecmp($target['username'], $currentAdmin) === 0) {
                sendJsonResponse(['error' => 'You cannot delete your own active admin account.'], 400);
            }

            // Protect against deleting the only admin
            $totalCount = (int)$pdo->query("SELECT COUNT(*) FROM `admins`")->fetchColumn();
            if ($totalCount <= 1) {
                sendJsonResponse(['error' => 'Cannot delete the only remaining admin account.'], 400);
            }

            $delStmt = $pdo->prepare("DELETE FROM `admins` WHERE id = ?");
            $delStmt->execute([$id]);

            // Record in audit log
            logAdminActivity($pdo, $currentAdmin, 'DELETE_ADMIN', 'admin', (string)$id, $target['username'], "Deleted admin account: '{$target['username']}'");

            sendJsonResponse(['message' => "Admin '{$target['username']}' deleted successfully."]);
        } catch (PDOException $e) {
            sendJsonResponse(['error' => 'Failed to delete admin: ' . $e->getMessage()], 500);
        }
        break;

    default:
        sendJsonResponse(['error' => 'Method not allowed.'], 405);
}
