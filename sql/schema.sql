CREATE DATABASE IF NOT EXISTS `interviewedge` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `interviewedge`;

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
  CONSTRAINT fk_interviews_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE SET NULL
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
  CONSTRAINT fk_questions_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
