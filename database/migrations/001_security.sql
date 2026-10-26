-- Additive MySQL migration. Never run db_setup.sql against an existing database.
CREATE TABLE IF NOT EXISTS omega_accounts (
    profile_id VARCHAR(36) PRIMARY KEY,
    login VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    auth_version INT UNSIGNED NOT NULL DEFAULT 1,
    disabled TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
