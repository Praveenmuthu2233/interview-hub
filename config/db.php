<?php
/**
 * Codeloop - Database Connection & Auto-Setup
 * Configured for XAMPP Apache & MySQL
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

// Database configuration
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'interviewedge');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : '');

/**
 * Returns a PDO database connection instance.
 * Automatically initializes database, tables, and missing columns.
 *
 * @return PDO
 */
function getDB() {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $charset = 'utf8mb4';
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . $charset;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        // If database does not exist, auto-create it
        if ($e->getCode() == 1049 || strpos($e->getMessage(), 'Unknown database') !== false) {
            try {
                $serverDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=" . $charset;
                $serverPdo = new PDO($serverDsn, DB_USER, DB_PASS, $options);
                $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $serverPdo = null;

                $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                initializeDatabaseSchema($pdo);
            } catch (PDOException $createEx) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'error' => 'Database connection failed. Ensure MySQL is running in XAMPP: ' . $createEx->getMessage()
                ]);
                exit;
            }
        } else {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'error' => 'Cannot connect to MySQL database: ' . $e->getMessage() . '. Please verify MySQL is running in XAMPP Control Panel.'
            ]);
            exit;
        }
    }

    ensureTablesExist($pdo);
    syncInterviewsSchema($pdo);

    return $pdo;
}

/**
 * Ensures required tables exist. If missing, creates and seeds initial data.
 */
function ensureTablesExist($pdo) {
    try {
        $check = $pdo->query("SHOW TABLES LIKE 'interviews'")->fetch();
        if (!$check) {
            initializeDatabaseSchema($pdo);
        }
    } catch (PDOException $e) {
        initializeDatabaseSchema($pdo);
    }
}

/**
 * Automatically detects and synchronizes column differences in existing databases.
 * Fixes: Unknown column 'i.interview_type', 'i.interview_date', 'i.apply_link', etc.
 */
function syncInterviewsSchema($pdo) {
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `interviews`");
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        $colMap = array_flip($cols);

        // 1. Sync interview_type vs type
        if (!isset($colMap['interview_type'])) {
            if (isset($colMap['type'])) {
                $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `interview_type` VARCHAR(50) NOT NULL DEFAULT 'online'");
                $pdo->exec("UPDATE `interviews` SET `interview_type` = `type` WHERE `type` IS NOT NULL AND `type` != ''");
            } else {
                $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `interview_type` VARCHAR(50) NOT NULL DEFAULT 'online'");
            }
        }

        // 2. Sync interview_date vs date
        if (!isset($colMap['interview_date'])) {
            if (isset($colMap['date'])) {
                $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `interview_date` DATE NOT NULL DEFAULT '2026-01-01'");
                $pdo->exec("UPDATE `interviews` SET `interview_date` = `date` WHERE `date` IS NOT NULL");
            } else {
                $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `interview_date` DATE NOT NULL DEFAULT '2026-01-01'");
            }
        }

        // 3. Sync apply_link vs applyLink / link
        if (!isset($colMap['apply_link'])) {
            $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `apply_link` VARCHAR(2048) NOT NULL DEFAULT ''");
            if (isset($colMap['applyLink'])) {
                $pdo->exec("UPDATE `interviews` SET `apply_link` = `applyLink` WHERE `applyLink` IS NOT NULL");
            } elseif (isset($colMap['link'])) {
                $pdo->exec("UPDATE `interviews` SET `apply_link` = `link` WHERE `link` IS NOT NULL");
            }
        }

        // 4. Ensure skills column exists
        if (!isset($colMap['skills'])) {
            $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `skills` JSON NULL");
        }

        // 5. Ensure category_id exists
        if (!isset($colMap['category_id'])) {
            $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `category_id` BIGINT UNSIGNED NULL");
        }

        // 6. Ensure created_at & updated_at exist
        if (!isset($colMap['created_at'])) {
            $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
        }
        if (!isset($colMap['updated_at'])) {
            $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }

        // 7. Ensure created_by & updated_by exist on interviews
        if (!isset($colMap['created_by'])) {
            $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `created_by` VARCHAR(100) NOT NULL DEFAULT 'admin'");
        }
        if (!isset($colMap['updated_by'])) {
            $pdo->exec("ALTER TABLE `interviews` ADD COLUMN `updated_by` VARCHAR(100) NULL DEFAULT NULL");
        }

        // 8. Ensure admins table has created_by
        try {
            $adminCols = array_flip($pdo->query("SHOW COLUMNS FROM `admins`")->fetchAll(PDO::FETCH_COLUMN, 0));
            if (!isset($adminCols['created_by'])) {
                $pdo->exec("ALTER TABLE `admins` ADD COLUMN `created_by` VARCHAR(100) NOT NULL DEFAULT 'system'");
            }
        } catch (Exception $e) {}

        // 9. Ensure admin_activity_logs table exists
        try {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS `admin_activity_logs` (
                  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  `admin_username` VARCHAR(100) NOT NULL,
                  `action_type` VARCHAR(50) NOT NULL,
                  `entity_type` VARCHAR(50) NOT NULL DEFAULT 'listing',
                  `entity_id` VARCHAR(100) DEFAULT NULL,
                  `item_title` VARCHAR(255) DEFAULT '',
                  `details` TEXT DEFAULT NULL,
                  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (`id`),
                  KEY `idx_activity_created` (`created_at` DESC),
                  KEY `idx_activity_admin` (`admin_username`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
        } catch (Exception $e) {}
    } catch (Exception $e) {
        // Silently continue if ALTER operations fail due to permissions
    }
}

/**
 * Initializes the schema and seed data
 */
function initializeDatabaseSchema($pdo) {
    $schemaSql = "
    CREATE TABLE IF NOT EXISTS categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(140) NOT NULL,
      category_type ENUM('listing', 'question') NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_categories_type_slug (category_type, slug),
      UNIQUE KEY uq_categories_type_name (category_type, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS interviews (
      id CHAR(36) NOT NULL,
      company VARCHAR(160) NOT NULL,
      role VARCHAR(160) NOT NULL,
      interview_type ENUM('online', 'offline', 'walkin') NOT NULL DEFAULT 'online',
      interview_date DATE NOT NULL,
      location VARCHAR(240) NOT NULL DEFAULT '',
      experience VARCHAR(120) NOT NULL DEFAULT '',
      salary VARCHAR(120) NOT NULL DEFAULT '',
      apply_link VARCHAR(2048) NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      skills JSON NOT NULL,
      category_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_interviews_date (interview_date DESC),
      KEY idx_interviews_created (created_at DESC),
      KEY idx_interviews_category (category_id),
      CONSTRAINT fk_interviews_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS questions (
      id CHAR(36) NOT NULL,
      category_id BIGINT UNSIGNED NOT NULL,
      question TEXT NOT NULL,
      answer MEDIUMTEXT NOT NULL,
      difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_questions_category_published (category_id, is_published),
      KEY idx_questions_created (created_at DESC),
      CONSTRAINT fk_questions_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      email VARCHAR(200) DEFAULT '',
      created_by VARCHAR(100) NOT NULL DEFAULT 'system',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      admin_username VARCHAR(100) NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL DEFAULT 'listing',
      entity_id VARCHAR(100) DEFAULT NULL,
      item_title VARCHAR(255) DEFAULT '',
      details TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_activity_created (created_at DESC),
      KEY idx_activity_admin (admin_username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($schemaSql);

    // Seed default Categories if empty
    $catCount = $pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn();
    if ($catCount == 0) {
        $categories = [
            ['IT & Software', 'it-software', 'listing'],
            ['Core Engineering', 'core-engineering', 'listing'],
            ['Management Trainee', 'management-trainee', 'listing'],
            ['Off-Campus Drive', 'off-campus-drive', 'listing'],
            ['Walk-in Interview', 'walk-in-interview', 'listing'],
            ['HR Interview', 'hr-interview', 'question'],
            ['Technical Java', 'technical-java', 'question'],
            ['Aptitude & Reasoning', 'aptitude-reasoning', 'question']
        ];
        $catStmt = $pdo->prepare("INSERT IGNORE INTO categories (name, slug, category_type) VALUES (?, ?, ?)");
        foreach ($categories as $cat) {
            $catStmt->execute($cat);
        }
    }

    // Seed default Admin if empty (username: admin, password: admin123)
    $adminCount = $pdo->query("SELECT COUNT(*) FROM admins")->fetchColumn();
    if ($adminCount == 0) {
        $adminHash = password_hash('admin123', PASSWORD_BCRYPT, ['cost' => 12]);
        $pdo->prepare("INSERT INTO admins (username, password_hash, email) VALUES (?, ?, ?)")
            ->execute(['admin', $adminHash, 'admin@interviewedge.com']);
    }

    // Seed initial interview listings if empty
    $interviewCount = $pdo->query("SELECT COUNT(*) FROM interviews")->fetchColumn();
    if ($interviewCount == 0) {
        $today = date('Y-m-d');
        $seedInterviews = [
            [
                'id' => '11111111-1111-1111-1111-111111111101',
                'company' => 'Tata Consultancy Services (TCS)',
                'role' => 'Systems Engineer (Ninja & Digital Drive)',
                'interview_type' => 'online',
                'interview_date' => date('Y-m-d', strtotime('+3 days')),
                'location' => 'Pan India / Remote Assessment',
                'experience' => '0 - 1 years (2024, 2025, 2026 Batch)',
                'salary' => '₹3.6 LPA - ₹7.2 LPA',
                'apply_link' => 'https://www.tcs.com/careers/india',
                'description' => "TCS is conducting an all-India National Qualifier Drive for engineering freshers. The selection process consists of an online cognitive & coding assessment followed by technical and managerial interviews.\n\nEligibility:\n- B.E / B.Tech / M.E / M.Tech / MCA / M.Sc\n- Minimum 60% or 6.0 CGPA throughout academics\n- Highest package up to 7.2 LPA for Digital profiles.",
                'skills' => json_encode(['Python', 'Java', 'Data Structures', 'SQL', 'C++']),
                'category_id' => 1
            ],
            [
                'id' => '11111111-1111-1111-1111-111111111102',
                'company' => 'Infosys',
                'role' => 'Specialist Programmer & DSE',
                'interview_type' => 'online',
                'interview_date' => date('Y-m-d', strtotime('+5 days')),
                'location' => 'Bangalore / Hyderabad / Pune / Chennai',
                'experience' => '0 - 2 years',
                'salary' => '₹6.25 LPA - ₹9.5 LPA',
                'apply_link' => 'https://www.infosys.com/careers.html',
                'description' => "Infosys recruitment drive for high-potential programmers. Candidates with strong competitive programming knowledge and algorithmic problem-solving will be evaluated through HackWithInfy challenge rounds.\n\nAssessment Pattern:\n- 3 Coding Problems (Hands-on)\n- System Architecture & Clean Code verification\n- Direct Technical Interview with Principal Architect.",
                'skills' => json_encode(['Algorithms', 'Java', 'Spring Boot', 'Problem Solving', 'React']),
                'category_id' => 1
            ],
            [
                'id' => '11111111-1111-1111-1111-111111111103',
                'company' => 'Wipro Limited',
                'role' => 'Project Engineer (Elite Fresher Walk-in)',
                'interview_type' => 'walkin',
                'interview_date' => $today,
                'location' => 'Chennai - Sholinganallur Campus',
                'experience' => 'Freshers (2025/2026 Batch)',
                'salary' => '₹3.5 LPA + Joining Bonus',
                'apply_link' => 'https://careers.wipro.com/',
                'description' => "Direct walk-in interview for graduates at Wipro Sholinganallur SEZ Chennai campus. Carry 4 hard copies of resume, government ID proof, and academic marksheets.\n\nTime: 9:00 AM to 3:00 PM\nVenue: Wipro Campus, ELCOT SEZ, Sholinganallur, Chennai - 600119.\nDress Code: Formal attire.",
                'skills' => json_encode(['C', 'Java', 'Networking', 'Communication', 'Database Basics']),
                'category_id' => 5
            ],
            [
                'id' => '11111111-1111-1111-1111-111111111104',
                'company' => 'Zoho Corporation',
                'role' => 'Software Developer / QA Engineer',
                'interview_type' => 'offline',
                'interview_date' => date('Y-m-d', strtotime('+2 days')),
                'location' => 'Chennai (Estancia IT Park, Guduvanchery)',
                'experience' => '0 - 3 years',
                'salary' => '₹5.5 LPA - ₹8.5 LPA',
                'apply_link' => 'https://www.zoho.com/careers/',
                'description' => "Zoho is hiring passionate programmers who love writing clean code. No college degree or percentage cutoff required! Selection is strictly based on written programming tests, advanced data structure rounds, and app development rounds.",
                'skills' => json_encode(['C', 'C++', 'Java', 'Data Structures', 'OOP']),
                'category_id' => 1
            ],
            [
                'id' => '11111111-1111-1111-1111-111111111105',
                'company' => 'Accenture',
                'role' => 'Associate Software Engineer (ASE)',
                'interview_type' => 'online',
                'interview_date' => date('Y-m-d', strtotime('+7 days')),
                'location' => 'Multiple Locations (Bangalore, Chennai, Gurugram)',
                'experience' => '0 - 1 years',
                'salary' => '₹4.5 LPA - ₹5.4 LPA',
                'apply_link' => 'https://www.accenture.com/in-en/careers',
                'description' => "Accenture off-campus drive for fresh graduates across India. Evaluated on cognitive ability, technical knowledge, coding fundamentals, and communication assessment.",
                'skills' => json_encode(['Cloud Basics', 'Java', 'Python', 'Web Technologies', 'Agile']),
                'category_id' => 4
            ],
            [
                'id' => '11111111-1111-1111-1111-111111111106',
                'company' => 'HCL Technologies',
                'role' => 'Graduate Engineer Trainee (GET)',
                'interview_type' => 'walkin',
                'interview_date' => $today,
                'location' => 'Noida / Chennai (Ambattur Campus)',
                'experience' => 'Freshers',
                'salary' => '₹3.25 LPA - ₹4.2 LPA',
                'apply_link' => 'https://www.hcltech.com/careers',
                'description' => "Walk-in drive for B.E/B.Tech/BCA graduates for Infrastructure Management and Application Support roles. Spot offer letters will be issued for shortlisted candidates.",
                'skills' => json_encode(['Linux', 'Networking', 'SQL', 'ITIL', 'Troubleshooting']),
                'category_id' => 5
            ]
        ];

        $insStmt = $pdo->prepare("
            INSERT INTO interviews 
            (id, company, role, interview_type, interview_date, location, experience, salary, apply_link, description, skills, category_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($seedInterviews as $item) {
            $insStmt->execute([
                $item['id'],
                $item['company'],
                $item['role'],
                $item['interview_type'],
                $item['interview_date'],
                $item['location'],
                $item['experience'],
                $item['salary'],
                $item['apply_link'],
                $item['description'],
                $item['skills'],
                $item['category_id']
            ]);
        }
    }
}
