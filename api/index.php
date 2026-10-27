<?php
/**
 * Codeloop - Master API Router
 * Handles all requests routed through /api/*
 */

// Basic CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalize path: strip base directory if running in subdirectory
// e.g. /api/listings or /interviewedge/api/listings
$pos = strpos($uri, '/api');
if ($pos !== false) {
    $apiPath = substr($uri, $pos + 4); // strip '/api'
} else {
    $apiPath = $uri;
}
$apiPath = trim($apiPath, '/');
$segments = $apiPath !== '' ? explode('/', $apiPath) : [];

// Route dispatching
if (empty($segments)) {
    sendJsonResponse(['status' => 'Codeloop API v1.0', 'endpoints' => ['/api/listings', '/api/categories', '/api/admin/listings']]);
}

$resource = $segments[0] ?? '';

if ($resource === 'listings') {
    $id = $segments[1] ?? null;
    $action = $segments[2] ?? null;

    if ($id && $action === 'related') {
        $_GET['id'] = $id;
        $_GET['related'] = '1';
        require __DIR__ . '/listings.php';
        exit;
    }

    if ($id) {
        $_GET['id'] = $id;
        require __DIR__ . '/listings.php';
        exit;
    }

    require __DIR__ . '/listings.php';
    exit;
}

if ($resource === 'admin') {
    $sub = $segments[1] ?? '';
    $id = $segments[2] ?? null;

    if ($sub === 'login') {
        require __DIR__ . '/admin_login.php';
        exit;
    }

    if ($sub === 'logout') {
        require __DIR__ . '/admin_logout.php';
        exit;
    }

    if ($sub === 'session') {
        require __DIR__ . '/admin_session.php';
        exit;
    }

    if ($sub === 'listings') {
        if ($id) {
            $_GET['id'] = $id;
        }
        require __DIR__ . '/admin_listings.php';
        exit;
    }

    if ($sub === 'categories') {
        if ($id) {
            $_GET['id'] = $id;
        }
        require __DIR__ . '/categories.php';
        exit;
    }

    if ($sub === 'questions') {
        if ($id) {
            $_GET['id'] = $id;
        }
        require __DIR__ . '/questions.php';
        exit;
    }
}

if ($resource === 'categories') {
    $id = $segments[1] ?? null;
    if ($id) $_GET['id'] = $id;
    require __DIR__ . '/categories.php';
    exit;
}

if ($resource === 'questions') {
    $id = $segments[1] ?? null;
    if ($id) $_GET['id'] = $id;
    require __DIR__ . '/questions.php';
    exit;
}

if ($resource === 'healthz') {
    require __DIR__ . '/healthz.php';
    exit;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['error' => 'API endpoint not found: ' . $uri]);
