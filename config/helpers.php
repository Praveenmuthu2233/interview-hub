<?php
/**
 * InterviewEdge - Data Mapping & Utility Helpers
 */

/**
 * Returns dynamic query parts matching the actual columns in the `interviews` table.
 * Solves: SQLSTATE[42S22]: Column not found: 1054 Unknown column 'i.interview_type'
 */
function getListingQueryParts($pdo) {
    static $parts = null;
    if ($parts !== null) {
        return $parts;
    }

    $cols = [];
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `interviews`");
        $cols = array_flip($stmt->fetchAll(PDO::FETCH_COLUMN, 0));
    } catch (Exception $e) {
        $cols = [];
    }

    // Type column
    if (isset($cols['interview_type'])) {
        $typeField = "i.interview_type";
        $typeCol = "i.interview_type";
    } elseif (isset($cols['type'])) {
        $typeField = "i.type AS interview_type";
        $typeCol = "i.type";
    } else {
        $typeField = "'online' AS interview_type";
        $typeCol = "'online'";
    }

    // Date column
    if (isset($cols['interview_date'])) {
        $dateField = "DATE_FORMAT(i.interview_date, '%Y-%m-%d') AS interview_date";
        $dateCol = "i.interview_date";
    } elseif (isset($cols['date'])) {
        $dateField = "DATE_FORMAT(i.date, '%Y-%m-%d') AS interview_date";
        $dateCol = "i.date";
    } else {
        $dateField = "CURDATE() AS interview_date";
        $dateCol = "CURDATE()";
    }

    // Apply link column
    if (isset($cols['apply_link'])) {
        $linkField = "i.apply_link";
    } elseif (isset($cols['applyLink'])) {
        $linkField = "i.applyLink AS apply_link";
    } elseif (isset($cols['link'])) {
        $linkField = "i.link AS apply_link";
    } else {
        $linkField = "'' AS apply_link";
    }

    // Skills column
    $skillsField = isset($cols['skills']) ? "i.skills" : "'[]' AS skills";

    // Category ID column
    $catIdField = isset($cols['category_id']) ? "i.category_id" : (isset($cols['categoryId']) ? "i.categoryId AS category_id" : "NULL AS category_id");

    // Location, experience, salary, description
    $locField = isset($cols['location']) ? "i.location" : "'' AS location";
    $expField = isset($cols['experience']) ? "i.experience" : "'' AS experience";
    $salField = isset($cols['salary']) ? "i.salary" : "'' AS salary";
    $descField = isset($cols['description']) ? "i.description" : "'' AS description";
    $createdField = isset($cols['created_at']) ? "i.created_at" : "NOW() AS created_at";
    $updatedField = isset($cols['updated_at']) ? "i.updated_at" : "NOW() AS updated_at";
    $createdCol = isset($cols['created_at']) ? "i.created_at" : "i.id";

    // Check if categories table exists
    $hasCategories = false;
    try {
        $hasCategories = (bool)$pdo->query("SHOW TABLES LIKE 'categories'")->fetch();
    } catch (Exception $e) {}

    $catJoin = ($hasCategories && isset($cols['category_id'])) ? "LEFT JOIN categories c ON c.id = i.category_id" : "";
    $catNameField = $hasCategories ? "c.name AS category_name" : "NULL AS category_name";

    $select = "SELECT i.id, i.company, i.role, {$typeField}, {$dateField}, {$locField}, {$expField}, {$salField}, {$linkField}, {$descField}, {$skillsField}, {$catIdField}, {$catNameField}, {$createdField}, {$updatedField}";
    $from = "FROM interviews i {$catJoin}";

    $parts = [
        'select'     => $select,
        'from'       => $from,
        'typeCol'    => $typeCol,
        'dateCol'    => $dateCol,
        'createdCol' => $createdCol,
        'hasCols'    => $cols
    ];

    return $parts;
}

/**
 * Format a database interview row into the API response format expected by the frontend.
 */
function mapListingRow($row) {
    if (!$row) return null;

    $skills = [];
    if (!empty($row['skills'])) {
        if (is_array($row['skills'])) {
            $skills = $row['skills'];
        } else {
            $decoded = json_decode($row['skills'], true);
            $skills = is_array($decoded) ? $decoded : [];
        }
    }

    $type = $row['interview_type'] ?? ($row['type'] ?? 'online');
    $date = $row['interview_date'] ?? ($row['date'] ?? '');
    $applyLink = $row['apply_link'] ?? ($row['applyLink'] ?? ($row['link'] ?? ''));

    return [
        'id'           => $row['id'],
        'company'      => $row['company'],
        'role'         => $row['role'],
        'type'         => $type,
        'date'         => $date,
        'location'     => $row['location'] ?? '',
        'experience'   => $row['experience'] ?? '',
        'salary'       => $row['salary'] ?? '',
        'applyLink'    => $applyLink,
        'description'  => $row['description'] ?? '',
        'skills'       => $skills,
        'categoryId'   => !empty($row['category_id']) ? (int)$row['category_id'] : null,
        'categoryName' => $row['category_name'] ?? null,
        'createdAt'    => $row['created_at'] ?? null,
        'updatedAt'    => $row['updated_at'] ?? null
    ];
}

/**
 * Format a database question row into the API response format.
 */
function mapQuestionRow($row) {
    if (!$row) return null;
    return [
        'id'          => $row['id'],
        'categoryId'  => (int)$row['category_id'],
        'category'    => $row['category_name'] ?? '',
        'question'    => $row['question'],
        'answer'      => $row['answer'],
        'difficulty'  => $row['difficulty'],
        'isPublished' => (bool)$row['is_published'],
        'createdAt'   => $row['created_at'] ?? null,
        'updatedAt'   => $row['updated_at'] ?? null
    ];
}

/**
 * Generates a standard UUID v4 string.
 */
function generateUuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Reads JSON input from php://input.
 */
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return $_POST;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Sends a clean JSON response and exits.
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}
