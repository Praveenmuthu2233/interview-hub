<?php
/**
 * Codeloop - Admin Registered Users API
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/helpers.php';

// Check authorization
requireAdminApi();

$pdo = getDB();

try {
    $hasUsers = (bool)$pdo->query("SHOW TABLES LIKE 'users'")->fetch();
    if (!$hasUsers) {
        sendJsonResponse(['users' => []]);
    }

    $stmt = $pdo->query("
        SELECT id, full_name, email, phone, education, graduation_year, skills, experience, preferred_location, created_at
        FROM `users`
        ORDER BY created_at DESC
    ");
    $rows = $stmt->fetchAll();

    $users = array_map(function($row) {
        $skills = [];
        if (!empty($row['skills'])) {
            if (is_array($row['skills'])) {
                $skills = $row['skills'];
            } else {
                $decoded = json_decode($row['skills'], true);
                $skills = is_array($decoded) ? $decoded : [];
            }
        }

        return [
            'id'                => (int)$row['id'],
            'fullName'          => $row['full_name'],
            'email'             => $row['email'],
            'phone'             => $row['phone'] ?? '',
            'education'         => $row['education'] ?? '',
            'graduationYear'    => $row['graduation_year'] ?? null,
            'skills'            => $skills,
            'experience'        => $row['experience'] ?? '',
            'preferredLocation' => $row['preferred_location'] ?? '',
            'createdAt'         => $row['created_at']
        ];
    }, $rows);

    sendJsonResponse(['users' => $users]);
} catch (PDOException $e) {
    sendJsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
