-- Migration: 005_create_idempotency_keys.sql
-- Table E: idempotency_keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id CHAR(36) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_status SMALLINT UNSIGNED NULL,
  response_body JSON NULL,
  order_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_idempotency_keys_key (idempotency_key),
  KEY idx_idempotency_keys_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
