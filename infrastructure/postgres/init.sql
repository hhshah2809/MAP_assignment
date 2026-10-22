-- PostgreSQL Initialization for MS2 (Shipment Service)
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY,
  tracking_number VARCHAR(60) NOT NULL UNIQUE,
  order_id UUID NOT NULL,
  carrier_name VARCHAR(120),
  truck_number VARCHAR(60),
  driver_name VARCHAR(120),
  driver_phone VARCHAR(40),
  origin_name VARCHAR(150),
  origin_address VARCHAR(255) NOT NULL,
  origin_city VARCHAR(100) NOT NULL,
  origin_state VARCHAR(100),
  origin_postal_code VARCHAR(20),
  origin_country_code VARCHAR(10) NOT NULL,
  origin_latitude DOUBLE PRECISION NOT NULL DEFAULT 47.6062,
  origin_longitude DOUBLE PRECISION NOT NULL DEFAULT -122.3321,
  destination_name VARCHAR(150),
  destination_address VARCHAR(255) NOT NULL,
  destination_city VARCHAR(100) NOT NULL,
  destination_state VARCHAR(100),
  destination_postal_code VARCHAR(20),
  destination_country_code VARCHAR(10) NOT NULL,
  destination_latitude DOUBLE PRECISION NOT NULL DEFAULT 45.5152,
  destination_longitude DOUBLE PRECISION NOT NULL DEFAULT -122.6784,
  scheduled_pickup TIMESTAMPTZ,
  scheduled_delivery TIMESTAMPTZ,
  actual_pickup TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments (status);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier ON shipments (carrier_name);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments (created_at DESC);

CREATE TABLE IF NOT EXISTS shipment_status_history (
  id UUID PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  previous_status VARCHAR(40),
  new_status VARCHAR(40) NOT NULL,
  changed_by VARCHAR(100),
  reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_history_shipment ON shipment_status_history (shipment_id, created_at ASC);

CREATE TABLE IF NOT EXISTS shipment_outbox (
  id UUID PRIMARY KEY,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_version INT NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shipment_outbox_status_next ON shipment_outbox (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_shipment_outbox_aggregate ON shipment_outbox (aggregate_id);
