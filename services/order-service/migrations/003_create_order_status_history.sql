-- Migration: 003_create_order_status_history.sql
-- Table C: order_status_history
CREATE TABLE IF NOT EXISTS order_status_history (
  id CHAR(36) NOT NULL,
  order_id CHAR(36) NOT NULL,
  previous_status VARCHAR(30) NULL,
  new_status VARCHAR(30) NOT NULL,
  changed_by VARCHAR(100) NULL,
  reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_status_history_order_created (order_id, created_at),
  CONSTRAINT fk_order_status_history_order_id FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
