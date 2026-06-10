-- ==========================================
-- CineFlow / Omega MySQL Setup Database Script
-- Compatible with Hostinger phpMyAdmin (MySQL)
-- ==========================================

-- Drop tables if they already exist (caution)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS checkouts;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS productions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS profiles;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'crew' CHECK (role IN ('admin', 'crew')),
  avatar_url VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create Productions Table
CREATE TABLE IF NOT EXISTS productions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(30) DEFAULT 'pre-production' CHECK (status IN ('pre-production', 'production', 'post-production', 'wrapped'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100) UNIQUE,
  category_id VARCHAR(36),
  status VARCHAR(30) DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'maintenance', 'lost')),
  current_production_id VARCHAR(36),
  assigned_to_id VARCHAR(36),
  description TEXT,
  image_url VARCHAR(255),
  last_serviced_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (current_production_id) REFERENCES productions(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create Checkouts Table
CREATE TABLE IF NOT EXISTS checkouts (
  id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  production_id VARCHAR(36),
  checked_out_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_at TIMESTAMP NULL DEFAULT NULL,
  returned_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (production_id) REFERENCES productions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36),
  user_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  details TEXT, -- JSON payload stored as serialized string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================
-- 2. Seed Data
-- ==========================================

-- Seed Profiles
INSERT INTO profiles (id, full_name, role, avatar_url) VALUES 
('u1', 'Alex Rivera', 'admin', 'https://picsum.photos/seed/alex/100/100'),
('u2', 'Jordan Smith', 'crew', 'https://picsum.photos/seed/jordan/100/100');

-- Seed Categories
INSERT INTO categories (id, name, icon) VALUES 
('1', 'Cameras', 'Camera'),
('2', 'Lenses', 'Disc'),
('3', 'Lighting', 'Sun'),
('4', 'Audio', 'Mic'),
('5', 'Power', 'Battery');

-- Seed Productions
INSERT INTO productions (id, name, location, start_date, end_date, status) VALUES 
('p1', 'Midnight Streets', 'Downtown LA', '2024-05-01', '2024-05-15', 'production'),
('p2', 'The Silent Cabin', 'Vermont', '2024-06-10', '2024-07-05', 'pre-production');

-- Seed Inventory Items
INSERT INTO inventory_items (id, name, model, serial_number, category_id, status, current_production_id, assigned_to_id, created_at) VALUES 
('i1', 'ARRI Alexa Mini LF', 'Mini LF', 'AX-1203', '1', 'checked_out', 'p1', 'u2', NOW()),
('i2', 'Sony FX6', 'ILME-FX6V', 'SN-4055', '1', 'available', NULL, NULL, NOW()),
('i3', 'Cooke S4/i 35mm', 'S4/i', 'CK-3501', '2', 'checked_out', 'p1', 'u2', NOW()),
('i4', 'Aputure 600d Pro', '600d Pro', 'AP-6001', '3', 'available', NULL, NULL, NOW()),
('i5', 'Sennheiser MKH 416', 'MKH 416', 'SH-4160', '4', 'maintenance', NULL, NULL, NOW());

-- Seed Activity Logs
INSERT INTO activity_logs (id, item_id, user_id, action, details, created_at) VALUES 
('l1', 'i1', 'u2', 'Checkout', '{"production":"Midnight Streets"}', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('l2', 'i3', 'u2', 'Checkout', '{"production":"Midnight Streets"}', DATE_SUB(NOW(), INTERVAL 12 HOUR));
