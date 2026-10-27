<?php
/**
 * Codeloop - Categories API
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/helpers.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? 'listing';

if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT id, name, slug, category_type AS type FROM categories WHERE category_type = ? ORDER BY name");
        $stmt->execute([$type]);
        $rows = $stmt->fetchAll();
        sendJsonResponse(['categories' => $rows]);
    } catch (PDOException $e) {
        sendJsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

// POST/PUT/DELETE require admin auth
requireAdminApi();
$input = getJsonInput();
$id = $_GET['id'] ?? null;

if ($method === 'POST') {
    $name = trim($input['name'] ?? '');
    $catType = in_array($input['type'] ?? '', ['listing', 'question']) ? $input['type'] : 'listing';
    if (!$name) sendJsonResponse(['error' => 'Category name is required.'], 400);
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-'));

    try {
        $stmt = $pdo->prepare("INSERT INTO categories (name, slug, category_type) VALUES (?, ?, ?)");
        $stmt->execute([$name, $slug, $catType]);
        sendJsonResponse(['id' => $pdo->lastInsertId(), 'name' => $name, 'slug' => $slug, 'type' => $catType], 201);
    } catch (PDOException $e) {
        sendJsonResponse(['error' => 'Failed to save category: ' . $e->getMessage()], 500);
    }
}

if ($method === 'DELETE' && $id) {
    try {
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        sendJsonResponse(['message' => 'Category deleted.']);
    } catch (PDOException $e) {
        sendJsonResponse(['error' => 'Failed to delete category: ' . $e->getMessage()], 500);
    }
}
