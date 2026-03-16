-- Purchase module foundation migration (idempotent-safe)

CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  warehouse_name VARCHAR(120) NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO warehouses (warehouse_name, location)
SELECT 'main', 'main'
WHERE NOT EXISTS (SELECT 1 FROM warehouses);

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE suppliers
SET
  supplier_name = COALESCE(NULLIF(supplier_name, ''), full_name),
  phone = COALESCE(NULLIF(phone, ''), mobile_no),
  updated_at = COALESCE(updated_at, created_at, NOW());

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_barcode VARCHAR(120);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(18,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(18,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE products
SET
  product_barcode = COALESCE(NULLIF(product_barcode, ''), product_code),
  cost_price = COALESCE(cost_price, purchase_cost),
  selling_price = COALESCE(selling_price, sale_cost),
  current_stock = COALESCE(current_stock, opening_quantity, 0),
  updated_at = COALESCE(updated_at, created_at, NOW());

CREATE INDEX IF NOT EXISTS idx_products_product_code ON products (product_code);
CREATE INDEX IF NOT EXISTS idx_products_product_barcode ON products (product_barcode);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_code VARCHAR(120);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS warehouse_id INTEGER;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS order_tax NUMERIC(18,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS shipping NUMERIC(18,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE purchases
SET
  purchase_code = COALESCE(NULLIF(purchase_code, ''), transaction_number),
  total_amount = COALESCE(total_amount, total, 0),
  discount_type = COALESCE(NULLIF(discount_type, ''), 'fixed'),
  warehouse_id = COALESCE(warehouse_id, (SELECT id FROM warehouses ORDER BY id LIMIT 1)),
  updated_at = COALESCE(updated_at, created_at, NOW());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_purchases_warehouse_id'
  ) THEN
    ALTER TABLE purchases
    ADD CONSTRAINT fk_purchases_warehouse_id
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
  END IF;
END
$$;

ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2);
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS discount NUMERIC(18,2) DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS tax NUMERIC(18,2) DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(18,2);
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE purchase_items
SET
  unit_cost = COALESCE(unit_cost, cost, 0),
  subtotal = COALESCE(subtotal, amount, 0),
  updated_at = COALESCE(updated_at, created_at, NOW());

CREATE OR REPLACE PROCEDURE create_purchase_with_items(
  p_supplier_id INTEGER,
  p_warehouse_id INTEGER,
  p_purchase_date TIMESTAMPTZ,
  p_order_tax NUMERIC,
  p_discount NUMERIC,
  p_discount_type TEXT,
  p_shipping NUMERIC,
  p_notes TEXT,
  p_created_by INTEGER,
  p_items JSONB,
  p_purchase_code TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_purchase_id INTEGER;
  v_item JSONB;
  v_qty INTEGER;
  v_unit_cost NUMERIC;
  v_tax NUMERIC;
  v_discount NUMERIC;
  v_subtotal NUMERIC;
  v_items_total NUMERIC := 0;
  v_order_discount NUMERIC := 0;
  v_grand_total NUMERIC := 0;
  v_purchase_code TEXT;
  v_discount_type TEXT;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one product item is required';
  END IF;

  v_discount_type := LOWER(COALESCE(NULLIF(TRIM(p_discount_type), ''), 'fixed'));

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(1, COALESCE((v_item ->> 'quantity')::INTEGER, 1));
    v_unit_cost := COALESCE((v_item ->> 'unit_cost')::NUMERIC, 0);
    v_tax := COALESCE((v_item ->> 'tax')::NUMERIC, 0);
    v_discount := COALESCE((v_item ->> 'discount')::NUMERIC, 0);
    v_subtotal := (v_qty * v_unit_cost) + v_tax - v_discount;

    IF v_subtotal < 0 THEN
      v_subtotal := 0;
    END IF;

    v_items_total := v_items_total + v_subtotal;
  END LOOP;

  IF v_discount_type = 'percent' THEN
    v_order_discount := (v_items_total * COALESCE(p_discount, 0)) / 100;
  ELSE
    v_order_discount := COALESCE(p_discount, 0);
  END IF;

  v_grand_total := v_items_total + COALESCE(p_order_tax, 0) + COALESCE(p_shipping, 0) - v_order_discount;
  IF v_grand_total < 0 THEN
    v_grand_total := 0;
  END IF;

  v_purchase_code := COALESCE(NULLIF(TRIM(p_purchase_code), ''), 'PUR-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISSMS'));

  INSERT INTO purchases (
    transaction_number,
    purchase_code,
    supplier_id,
    warehouse_id,
    purchase_date,
    payment_mode,
    cash_amount,
    total,
    order_tax,
    discount,
    discount_type,
    shipping,
    total_amount,
    grand_total,
    paid,
    rest,
    notes,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_purchase_code,
    v_purchase_code,
    p_supplier_id,
    p_warehouse_id,
    p_purchase_date,
    'cash',
    0,
    v_items_total,
    COALESCE(p_order_tax, 0),
    COALESCE(p_discount, 0),
    v_discount_type,
    COALESCE(p_shipping, 0),
    v_items_total,
    v_grand_total,
    0,
    v_grand_total,
    p_notes,
    p_created_by,
    NOW(),
    NOW()
  ) RETURNING id INTO v_purchase_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(1, COALESCE((v_item ->> 'quantity')::INTEGER, 1));
    v_unit_cost := COALESCE((v_item ->> 'unit_cost')::NUMERIC, 0);
    v_tax := COALESCE((v_item ->> 'tax')::NUMERIC, 0);
    v_discount := COALESCE((v_item ->> 'discount')::NUMERIC, 0);
    v_subtotal := (v_qty * v_unit_cost) + v_tax - v_discount;

    IF v_subtotal < 0 THEN
      v_subtotal := 0;
    END IF;

    INSERT INTO purchase_items (
      purchase_id,
      product_id,
      cost,
      unit_cost,
      quantity,
      price,
      amount,
      discount,
      tax,
      subtotal,
      created_at,
      updated_at
    ) VALUES (
      v_purchase_id,
      (v_item ->> 'product_id')::INTEGER,
      v_unit_cost,
      v_unit_cost,
      v_qty,
      v_unit_cost,
      v_subtotal,
      v_discount,
      v_tax,
      v_subtotal,
      NOW(),
      NOW()
    );

    UPDATE products
    SET
      current_stock = COALESCE(current_stock, 0) + v_qty,
      updated_at = NOW()
    WHERE id = (v_item ->> 'product_id')::INTEGER;
  END LOOP;
END;
$$;
