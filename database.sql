-- Codeloop Database Schema and Seed Data
-- Compatible with XAMPP Apache, MySQL & MariaDB
-- Character set: utf8mb4

CREATE DATABASE IF NOT EXISTS `interviewedge` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `interviewedge`;

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(140) NOT NULL,
  `category_type` ENUM('listing', 'question') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_type_slug` (`category_type`, `slug`),
  UNIQUE KEY `uq_categories_type_name` (`category_type`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Interviews Table
CREATE TABLE IF NOT EXISTS `interviews` (
  `id` CHAR(36) NOT NULL,
  `company` VARCHAR(160) NOT NULL,
  `role` VARCHAR(160) NOT NULL,
  `interview_type` ENUM('online', 'offline', 'walkin') NOT NULL DEFAULT 'online',
  `interview_date` DATE NOT NULL,
  `location` VARCHAR(240) NOT NULL DEFAULT '',
  `experience` VARCHAR(120) NOT NULL DEFAULT '',
  `salary` VARCHAR(120) NOT NULL DEFAULT '',
  `apply_link` VARCHAR(2048) NOT NULL DEFAULT '',
  `description` TEXT NOT NULL,
  `skills` JSON NOT NULL,
  `category_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_interviews_date` (`interview_date` DESC),
  KEY `idx_interviews_created` (`created_at` DESC),
  KEY `idx_interviews_category` (`category_id`),
  CONSTRAINT `fk_interviews_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS `questions` (
  `id` CHAR(36) NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `question` TEXT NOT NULL,
  `answer` MEDIUMTEXT NOT NULL,
  `difficulty` ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
  `is_published` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_questions_category_published` (`category_id`, `is_published`),
  KEY `idx_questions_created` (`created_at` DESC),
  CONSTRAINT `fk_questions_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Admins Table
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `email` VARCHAR(200) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` DATETIME NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(160) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(40) NOT NULL DEFAULT '',
  `education` VARCHAR(180) NOT NULL DEFAULT '',
  `graduation_year` SMALLINT UNSIGNED NULL,
  `skills` JSON NOT NULL,
  `experience` VARCHAR(240) NOT NULL DEFAULT '',
  `preferred_location` VARCHAR(160) NOT NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_saved_listings` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `listing_id` CHAR(36) NOT NULL,
  `saved_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `listing_id`),
  KEY `idx_saved_listings_listing` (`listing_id`),
  CONSTRAINT `fk_saved_listings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_saved_listings_listing`
    FOREIGN KEY (`listing_id`) REFERENCES `interviews` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Categories
INSERT IGNORE INTO `categories` (`id`, `name`, `slug`, `category_type`) VALUES
(1, 'IT & Software', 'it-software', 'listing'),
(2, 'Core Engineering', 'core-engineering', 'listing'),
(3, 'Management Trainee', 'management-trainee', 'listing'),
(4, 'Off-Campus Drive', 'off-campus-drive', 'listing'),
(5, 'Walk-in Interview', 'walk-in-interview', 'listing'),
(6, 'HR Interview', 'hr-interview', 'question'),
(7, 'Technical Java', 'technical-java', 'question'),
(8, 'Aptitude & Reasoning', 'aptitude-reasoning', 'question');

-- Seed Admin (Default credentials: admin / admin123)
INSERT IGNORE INTO `admins` (`id`, `username`, `password_hash`, `email`) VALUES
(1, 'admin', '$2y$12$R.v/X9pQzS9.p8u6fS2m9.4uN2J3QGz2qK5T7s8w0p1L4g6j2eOeq', 'admin@interviewedge.com');

-- Seed Sample Live Interview Listings
INSERT IGNORE INTO `interviews` (`id`, `company`, `role`, `interview_type`, `interview_date`, `location`, `experience`, `salary`, `apply_link`, `description`, `skills`, `category_id`) VALUES
(
  '11111111-1111-1111-1111-111111111101',
  'Tata Consultancy Services (TCS)',
  'Systems Engineer (Ninja & Digital Drive)',
  'online',
  CURDATE() + INTERVAL 3 DAY,
  'Pan India / Remote Assessment',
  '0 - 1 years (2024, 2025, 2026 Batch)',
  '₹3.6 LPA - ₹7.2 LPA',
  'https://www.tcs.com/careers/india',
  'TCS is conducting an all-India National Qualifier Drive for engineering freshers. The selection process consists of an online cognitive & coding assessment followed by technical and managerial interviews.\n\nEligibility:\n- B.E / B.Tech / M.E / M.Tech / MCA / M.Sc\n- Minimum 60% or 6.0 CGPA throughout academics\n- Highest package up to 7.2 LPA for Digital profiles.',
  '["Python", "Java", "Data Structures", "SQL", "C++"]',
  1
),
(
  '11111111-1111-1111-1111-111111111102',
  'Infosys',
  'Specialist Programmer & DSE',
  'online',
  CURDATE() + INTERVAL 5 DAY,
  'Bangalore / Hyderabad / Pune / Chennai',
  '0 - 2 years',
  '₹6.25 LPA - ₹9.5 LPA',
  'https://www.infosys.com/careers.html',
  'Infosys recruitment drive for high-potential programmers. Candidates with strong competitive programming knowledge and algorithmic problem-solving will be evaluated through HackWithInfy challenge rounds.\n\nAssessment Pattern:\n- 3 Coding Problems (Hands-on)\n- System Architecture & Clean Code verification\n- Direct Technical Interview with Principal Architect.',
  '["Algorithms", "Java", "Spring Boot", "Problem Solving", "React"]',
  1
),
(
  '11111111-1111-1111-1111-111111111103',
  'Wipro Limited',
  'Project Engineer (Elite Fresher Walk-in)',
  'walkin',
  CURDATE(),
  'Chennai - Sholinganallur Campus',
  'Freshers (2025/2026 Batch)',
  '₹3.5 LPA + Joining Bonus',
  'https://careers.wipro.com/',
  'Direct walk-in interview for graduates at Wipro Sholinganallur SEZ Chennai campus. Carry 4 hard copies of resume, government ID proof, and academic marksheets.\n\nTime: 9:00 AM to 3:00 PM\nVenue: Wipro Campus, ELCOT SEZ, Sholinganallur, Chennai - 600119.\nDress Code: Formal attire.',
  '["C", "Java", "Networking", "Communication", "Database Basics"]',
  5
),
(
  '11111111-1111-1111-1111-111111111104',
  'Zoho Corporation',
  'Software Developer / QA Engineer',
  'offline',
  CURDATE() + INTERVAL 2 DAY,
  'Chennai (Estancia IT Park, Guduvanchery)',
  '0 - 3 years',
  '₹5.5 LPA - ₹8.5 LPA',
  'https://www.zoho.com/careers/',
  'Zoho is hiring passionate programmers who love writing clean code. No college degree or percentage cutoff required! Selection is strictly based on written programming tests, advanced data structure rounds, and app development rounds.',
  '["C", "C++", "Java", "Data Structures", "OOP"]',
  1
),
(
  '11111111-1111-1111-1111-111111111105',
  'Accenture',
  'Associate Software Engineer (ASE)',
  'online',
  CURDATE() + INTERVAL 7 DAY,
  'Multiple Locations (Bangalore, Chennai, Gurugram)',
  '0 - 1 years',
  '₹4.5 LPA - ₹5.4 LPA',
  'https://www.accenture.com/in-en/careers',
  'Accenture off-campus drive for fresh graduates across India. Evaluated on cognitive ability, technical knowledge, coding fundamentals, and communication assessment.',
  '["Cloud Basics", "Java", "Python", "Web Technologies", "Agile"]',
  4
),
(
  '11111111-1111-1111-1111-111111111106',
  'HCL Technologies',
  'Graduate Engineer Trainee (GET)',
  'walkin',
  CURDATE(),
  'Noida / Chennai (Ambattur Campus)',
  'Freshers',
  '₹3.25 LPA - ₹4.2 LPA',
  'https://www.hcltech.com/careers',
  'Walk-in drive for B.E/B.Tech/BCA graduates for Infrastructure Management and Application Support roles. Spot offer letters will be issued for shortlisted candidates.',
  '["Linux", "Networking", "SQL", "ITIL", "Troubleshooting"]',
  5
);
