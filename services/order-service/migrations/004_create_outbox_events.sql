-- Migration: 004_create_outbox_events.sql
-- Table D: outbox_events
CREATE TABLE IF NOT EXISTS outbox_events (
  id CHAR(36) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id CHAR(36) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_version INT UNSIGNED NOT NULL DEFAULT 1,
  payload JSON NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(3) NULL,
  last_error TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  published_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_outbox_events_status_next_attempt (status, next_attempt_at),
  KEY idx_outbox_events_aggregate_id (aggregate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
