-- =====================================================================
-- Focus Frame Studio — normalized relational schema (MySQL 8 / MariaDB 10.4+)
--
-- Entities
--   categories  1 ──< products      (each product belongs to one category)
--   users       1 ──< loans         (a user can file many borrow requests)
--   products    1 ──< loans         (a product can appear in many loans)
--
-- This file has no CREATE DATABASE / USE statement on purpose, so it can be
-- run against any database: `focus_frame_db` on XAMPP, `defaultdb` on Aiven,
-- the database you created on TiDB Cloud / Railway / Clever Cloud, etc.
-- =====================================================================

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  category_id         INT UNSIGNED  NOT NULL,
  name                VARCHAR(255)  NOT NULL,
  price               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  stock               INT           NOT NULL DEFAULT 0,
  low_stock_threshold INT           NOT NULL DEFAULT 6,
  description         TEXT          NULL,
  image               LONGTEXT      NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category (category_id),
  KEY idx_products_name (name),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_products_price     CHECK (price >= 0),
  CONSTRAINT chk_products_stock     CHECK (stock >= 0),
  CONSTRAINT chk_products_threshold CHECK (low_stock_threshold >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users authenticate with Firebase (Google Sign-In). The backend copies each
-- signed-in account into this table so loans can reference it with a real
-- foreign key and reports can JOIN on it.
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  firebase_uid  VARCHAR(128) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  display_name  VARCHAR(255) NULL,
  role          ENUM('admin','student') NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_firebase_uid (firebase_uid),
  KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A loan is a student's request to borrow equipment.
-- Lifecycle: pending -> approved -> returned
--            pending -> rejected | cancelled
-- Approving a loan subtracts its quantity from products.stock and returning
-- it adds the quantity back (done inside a transaction by the API).
CREATE TABLE IF NOT EXISTS loans (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  product_id   INT UNSIGNED NOT NULL,
  quantity     INT          NOT NULL DEFAULT 1,
  status       ENUM('pending','approved','rejected','returned','cancelled') NOT NULL DEFAULT 'pending',
  purpose      VARCHAR(255) NULL,
  due_date     DATE         NOT NULL,
  admin_note   VARCHAR(255) NULL,
  requested_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at   DATETIME     NULL,
  returned_at  DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_loans_user (user_id),
  KEY idx_loans_product (product_id),
  KEY idx_loans_status (status),
  CONSTRAINT fk_loans_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_loans_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_loans_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
