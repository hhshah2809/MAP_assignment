-- Migration: 002_create_order_items.sql
-- Table B: order_items
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
  CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
  CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0),
  CONSTRAINT chk_order_items_weight CHECK (weight_kg IS NULL OR weight_kg >= 0),
  CONSTRAINT chk_order_items_length CHECK (length_cm IS NULL OR length_cm >= 0),
  CONSTRAINT chk_order_items_width CHECK (width_cm IS NULL OR width_cm >= 0),
  CONSTRAINT chk_order_items_height CHECK (height_cm IS NULL OR height_cm >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
