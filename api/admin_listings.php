<?php
/**
 * Codeloop - Admin Listings API (CRUD)
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/helpers.php';

// Check authorization
requireAdminApi();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$input = getJsonInput();
$qp = getListingQueryParts($pdo);
$hasCols = $qp['hasCols'];
$currentAdmin = getCurrentAdminUsername();

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->query("
                {$qp['select']}
                {$qp['from']}
                WHERE {$qp['dateCol']} >= CURDATE()
                ORDER BY {$qp['dateCol']} DESC, {$qp['createdCol']} DESC
            ");
            $rows = $stmt->fetchAll();
            sendJsonResponse(['listings' => array_map('mapListingRow', $rows)]);
        } catch (PDOException $e) {
            sendJsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    case 'POST':
        $company = trim($input['company'] ?? '');
        $role = trim($input['role'] ?? '');
        $type = in_array($input['type'] ?? '', ['online', 'offline', 'walkin']) ? $input['type'] : 'online';
        $date = trim($input['date'] ?? '');
        $location = trim($input['location'] ?? '');
        $experience = trim($input['experience'] ?? '');
        $salary = trim($input['salary'] ?? '');
        $applyLink = trim($input['applyLink'] ?? '');
        $description = trim($input['description'] ?? '');
        $skills = is_array($input['skills'] ?? null) ? $input['skills'] : [];
        $categoryId = !empty($input['categoryId']) ? (int)$input['categoryId'] : null;

        if (!$company || !$role || !$date || !$description) {
            sendJsonResponse(['error' => 'Company, role, interview date, and description are required.'], 400);
        }

        $newId = generateUuid();

        // Build dynamic columns based on table structure
        $fields = ['id', 'company', 'role'];
        $values = [$newId, $company, $role];

        if (isset($hasCols['interview_type'])) {
            $fields[] = 'interview_type';
            $values[] = $type;
        }
        if (isset($hasCols['type'])) {
            $fields[] = 'type';
            $values[] = $type;
        }

        if (isset($hasCols['interview_date'])) {
            $fields[] = 'interview_date';
            $values[] = $date;
        }
        if (isset($hasCols['date'])) {
            $fields[] = 'date';
            $values[] = $date;
        }

        if (isset($hasCols['location'])) {
            $fields[] = 'location';
            $values[] = $location;
        }
        if (isset($hasCols['experience'])) {
            $fields[] = 'experience';
            $values[] = $experience;
        }
        if (isset($hasCols['salary'])) {
            $fields[] = 'salary';
            $values[] = $salary;
        }

        if (isset($hasCols['apply_link'])) {
            $fields[] = 'apply_link';
            $values[] = $applyLink;
        }
        if (isset($hasCols['applyLink'])) {
            $fields[] = 'applyLink';
            $values[] = $applyLink;
        }
        if (isset($hasCols['link'])) {
            $fields[] = 'link';
            $values[] = $applyLink;
        }

        if (isset($hasCols['description'])) {
            $fields[] = 'description';
            $values[] = $description;
        }
        if (isset($hasCols['skills'])) {
            $fields[] = 'skills';
            $values[] = json_encode(array_values($skills));
        }
        if (isset($hasCols['category_id'])) {
            $fields[] = 'category_id';
            $values[] = $categoryId;
        }
        if (isset($hasCols['created_by'])) {
            $fields[] = 'created_by';
            $values[] = $currentAdmin;
        }

        $placeholders = implode(', ', array_fill(0, count($fields), '?'));
        $fieldSql = implode(', ', array_map(function($f) { return "`{$f}`"; }, $fields));

        try {
            $stmt = $pdo->prepare("INSERT INTO `interviews` ({$fieldSql}) VALUES ({$placeholders})");
            $stmt->execute($values);

            // Record in audit log
            $logDetails = "Added {$type} job at {$company} for {$role}. Location: " . ($location ?: 'N/A') . ", Experience: " . ($experience ?: 'N/A') . ", Salary: " . ($salary ?: 'N/A');
            logAdminActivity($pdo, $currentAdmin, 'INSERT_JOB', 'listing', $newId, "{$company} - {$role}", $logDetails);

            sendJsonResponse(['id' => $newId, 'message' => 'Job created successfully.'], 201);
        } catch (PDOException $e) {
            sendJsonResponse(['error' => 'Failed to create job: ' . $e->getMessage()], 500);
        }
        break;

    case 'PUT':
        if (!$id) {
            sendJsonResponse(['error' => 'Job ID is required for update.'], 400);
        }

        $company = trim($input['company'] ?? '');
        $role = trim($input['role'] ?? '');
        $type = in_array($input['type'] ?? '', ['online', 'offline', 'walkin']) ? $input['type'] : 'online';
        $date = trim($input['date'] ?? '');
        $location = trim($input['location'] ?? '');
        $experience = trim($input['experience'] ?? '');
        $salary = trim($input['salary'] ?? '');
        $applyLink = trim($input['applyLink'] ?? '');
        $description = trim($input['description'] ?? '');
        $skills = is_array($input['skills'] ?? null) ? $input['skills'] : [];
        $categoryId = !empty($input['categoryId']) ? (int)$input['categoryId'] : null;

        if (!$company || !$role || !$date || !$description) {
            sendJsonResponse(['error' => 'Company, role, date, and description are required.'], 400);
        }

        $setPairs = ["`company` = ?", "`role` = ?"];
        $values = [$company, $role];

        if (isset($hasCols['interview_type'])) {
            $setPairs[] = "`interview_type` = ?";
            $values[] = $type;
        }
        if (isset($hasCols['type'])) {
            $setPairs[] = "`type` = ?";
            $values[] = $type;
        }

        if (isset($hasCols['interview_date'])) {
            $setPairs[] = "`interview_date` = ?";
            $values[] = $date;
        }
        if (isset($hasCols['date'])) {
            $setPairs[] = "`date` = ?";
            $values[] = $date;
        }

        if (isset($hasCols['location'])) {
            $setPairs[] = "`location` = ?";
            $values[] = $location;
        }
        if (isset($hasCols['experience'])) {
            $setPairs[] = "`experience` = ?";
            $values[] = $experience;
        }
        if (isset($hasCols['salary'])) {
            $setPairs[] = "`salary` = ?";
            $values[] = $salary;
        }

        if (isset($hasCols['apply_link'])) {
            $setPairs[] = "`apply_link` = ?";
            $values[] = $applyLink;
        }
        if (isset($hasCols['applyLink'])) {
            $setPairs[] = "`applyLink` = ?";
            $values[] = $applyLink;
        }
        if (isset($hasCols['link'])) {
            $setPairs[] = "`link` = ?";
            $values[] = $applyLink;
        }

        if (isset($hasCols['description'])) {
            $setPairs[] = "`description` = ?";
            $values[] = $description;
        }
        if (isset($hasCols['skills'])) {
            $setPairs[] = "`skills` = ?";
            $values[] = json_encode(array_values($skills));
        }
        if (isset($hasCols['category_id'])) {
            $setPairs[] = "`category_id` = ?";
            $values[] = $categoryId;
        }
        if (isset($hasCols['updated_by'])) {
            $setPairs[] = "`updated_by` = ?";
            $values[] = $currentAdmin;
        }

        $values[] = $id;
        $setSql = implode(', ', $setPairs);

        try {
            $stmt = $pdo->prepare("UPDATE `interviews` SET {$setSql} WHERE `id` = ?");
            $stmt->execute($values);

            // Record in audit log
            $logDetails = "Updated {$type} job at {$company} for {$role}. Location: " . ($location ?: 'N/A') . ", Experience: " . ($experience ?: 'N/A') . ", Salary: " . ($salary ?: 'N/A');
            logAdminActivity($pdo, $currentAdmin, 'UPDATE_JOB', 'listing', $id, "{$company} - {$role}", $logDetails);

            sendJsonResponse(['id' => $id, 'message' => 'Job updated successfully.']);
        } catch (PDOException $e) {
            sendJsonResponse(['error' => 'Failed to update job: ' . $e->getMessage()], 500);
        }
        break;

    case 'DELETE':
        if (!$id) {
            sendJsonResponse(['error' => 'Job ID is required for deletion.'], 400);
        }

        // Fetch job details before deletion so the audit trail preserves context.
        $existing = null;
        try {
            $fetchStmt = $pdo->prepare("SELECT company, role, location, salary, date_format(created_at, '%Y-%m-%d') as created_date FROM `interviews` WHERE `id` = ? LIMIT 1");
            $fetchStmt->execute([$id]);
            $existing = $fetchStmt->fetch();
        } catch (Exception $e) {}

        $targetTitle = $existing ? "{$existing['company']} - {$existing['role']}" : "Job ID: {$id}";
        $logDetails = $existing
            ? "Deleted job: {$existing['company']} - {$existing['role']} (Location: " . ($existing['location'] ?: 'N/A') . ", Salary: " . ($existing['salary'] ?: 'N/A') . ")"
            : "Deleted job ID: {$id}";

        try {
            $stmt = $pdo->prepare("DELETE FROM `interviews` WHERE `id` = ?");
            $stmt->execute([$id]);
            if ($stmt->rowCount() === 0) {
                sendJsonResponse(['error' => 'Job not found.'], 404);
            }

            // Record in audit log
            logAdminActivity($pdo, $currentAdmin, 'DELETE_JOB', 'listing', $id, $targetTitle, $logDetails);

            sendJsonResponse(['id' => $id, 'message' => 'Job deleted successfully.']);
        } catch (PDOException $e) {
            sendJsonResponse(['error' => 'Failed to delete job: ' . $e->getMessage()], 500);
        }
        break;

    default:
        sendJsonResponse(['error' => 'Method not allowed.'], 405);
}
