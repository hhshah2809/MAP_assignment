-- MySQL Initialization for MS1 (Order Service)
CREATE DATABASE IF NOT EXISTS logistics_orders;
USE logistics_orders;

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) NOT NULL,
  order_number VARCHAR(40) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  customer_reference VARCHAR(100) NULL,
  origin_address_line1 VARCHAR(255) NOT NULL,
  origin_address_line2 VARCHAR(255) NULL,
  origin_city VARCHAR(100) NOT NULL,
  origin_state VARCHAR(100) NULL,
  origin_postal_code VARCHAR(20) NULL,
  origin_country_code CHAR(2) NOT NULL,
  destination_address_line1 VARCHAR(255) NOT NULL,
  destination_address_line2 VARCHAR(255) NULL,
  destination_city VARCHAR(100) NOT NULL,
  destination_state VARCHAR(100) NULL,
  destination_postal_code VARCHAR(20) NULL,
  destination_country_code CHAR(2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  subtotal DECIMAL(14, 2) NOT NULL,
  tax_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  shipping_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(14, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  notes TEXT NULL,
  requested_pickup_at DATETIME(3) NULL,
  requested_delivery_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_number (order_number),
  KEY idx_orders_customer_created (customer_id, created_at),
  KEY idx_orders_status_created (status, created_at),
  KEY idx_orders_customer_reference (customer_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id CHAR(36) NOT NULL,
  order_id CHAR(36) NOT NULL,
  line_number INT UNSIGNED NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  sku VARCHAR(100) NULL,
  description VARCHAR(500) NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  unit_of_measure VARCHAR(20) NOT NULL,
  unit_price DECIMAL(14, 2) NOT NULL,
  line_total DECIMAL(14, 2) NOT NULL,
  weight_kg DECIMAL(12, 3) NULL,
  length_cm DECIMAL(12, 2) NULL,
  width_cm DECIMAL(12, 2) NULL,
  height_cm DECIMAL(12, 2) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_items_order_line (order_id, line_number),
  CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
