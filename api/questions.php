<?php
/**
 * InterviewEdge - Questions API
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/helpers.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$categoryId = !empty($_GET['categoryId']) ? (int)$_GET['categoryId'] : null;

if ($method === 'GET') {
    if ($id) {
        $stmt = $pdo->prepare("
            SELECT q.id, q.category_id, q.question, q.answer, q.difficulty, q.is_published,
                   q.created_at, q.updated_at, c.name AS category_name
            FROM questions q
            JOIN categories c ON c.id = q.category_id
            WHERE q.id = ? AND q.is_published = TRUE
            LIMIT 1
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) sendJsonResponse(['error' => 'Question not found.'], 404);
        sendJsonResponse(['question' => mapQuestionRow($row)]);
    }

    $where = ["q.is_published = TRUE"];
    $params = [];
    if ($categoryId) {
        $where[] = "q.category_id = ?";
        $params[] = $categoryId;
    }

    $page = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = max(1, min(100, (int)($_GET['pageSize'] ?? 20)));
    $offset = ($page - 1) * $pageSize;

    $whereSql = implode(' AND ', $where);
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM questions q WHERE {$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT q.id, q.category_id, q.question, q.answer, q.difficulty, q.is_published,
               q.created_at, q.updated_at, c.name AS category_name
        FROM questions q
        JOIN categories c ON c.id = q.category_id
        WHERE {$whereSql}
        ORDER BY q.created_at DESC
        LIMIT {$pageSize} OFFSET {$offset}
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    sendJsonResponse([
        'questions' => array_map('mapQuestionRow', $rows),
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize
    ]);
}

// POST/PUT/DELETE require admin auth
requireAdminApi();
$input = getJsonInput();

if ($method === 'POST') {
    $qCatId = !empty($input['categoryId']) ? (int)$input['categoryId'] : 0;
    $question = trim($input['question'] ?? '');
    $answer = trim($input['answer'] ?? '');
    $difficulty = in_array($input['difficulty'] ?? '', ['beginner', 'intermediate', 'advanced']) ? $input['difficulty'] : 'beginner';
    $isPub = isset($input['isPublished']) ? (bool)$input['isPublished'] : true;

    if (!$qCatId || !$question || !$answer) {
        sendJsonResponse(['error' => 'Category, question text, and answer are required.'], 400);
    }

    $newId = generateUuid();
    try {
        $stmt = $pdo->prepare("INSERT INTO questions (id, category_id, question, answer, difficulty, is_published) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$newId, $qCatId, $question, $answer, $difficulty, $isPub ? 1 : 0]);
        sendJsonResponse(['id' => $newId, 'message' => 'Question created successfully.'], 201);
    } catch (PDOException $e) {
        sendJsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}
