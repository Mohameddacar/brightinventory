ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "minimum_sale_quantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stock_alert" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "products_product_code_key" ON "products"("product_code");

CREATE SEQUENCE IF NOT EXISTS "product_barcode_seq" START WITH 100000000001 INCREMENT BY 1;

SELECT setval(
  'product_barcode_seq',
  GREATEST(
    COALESCE((SELECT MAX(CASE WHEN "product_code" ~ '^[0-9]+$' THEN "product_code"::BIGINT ELSE 0 END) FROM "products"), 0),
    100000000000
  )
);

DROP PROCEDURE IF EXISTS create_product(INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMP, INTEGER, DECIMAL, DECIMAL, INTEGER);
DROP PROCEDURE IF EXISTS update_product(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMP, INTEGER, DECIMAL, DECIMAL, INTEGER);

CREATE OR REPLACE PROCEDURE create_product(
    p_category_id INTEGER,
    p_product_code TEXT,
    p_product_name TEXT,
    p_description TEXT,
    p_image TEXT,
    p_has_expire_date BOOLEAN,
    p_expire_date TIMESTAMP,
    p_opening_quantity INTEGER,
    p_minimum_sale_quantity INTEGER,
    p_stock_alert INTEGER,
    p_purchase_cost DECIMAL,
    p_sale_cost DECIMAL,
    p_reorder_level INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    l_product_code TEXT;
    l_candidate BIGINT;
BEGIN
    IF p_product_code IS NULL OR LENGTH(TRIM(p_product_code)) = 0 THEN
        LOOP
            l_candidate := nextval('product_barcode_seq');
            l_product_code := LPAD(l_candidate::TEXT, 12, '0');
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM "products" WHERE "product_code" = l_product_code
            );
        END LOOP;
    ELSE
        l_product_code := TRIM(p_product_code);
    END IF;

    INSERT INTO "products" (
        "category_id",
        "product_code",
        "product_name",
        "description",
        "image",
        "has_expire_date",
        "expire_date",
        "opening_quantity",
        "minimum_sale_quantity",
        "stock_alert",
        "purchase_cost",
        "sale_cost",
        "reorder_level"
    )
    VALUES (
        p_category_id,
        l_product_code,
        p_product_name,
        p_description,
        p_image,
        p_has_expire_date,
        p_expire_date,
        p_opening_quantity,
        COALESCE(p_minimum_sale_quantity, 0),
        COALESCE(p_stock_alert, 0),
        p_purchase_cost,
        p_sale_cost,
        p_reorder_level
    );
END;
$$;

CREATE OR REPLACE PROCEDURE update_product(
    p_id INTEGER,
    p_category_id INTEGER,
    p_product_code TEXT,
    p_product_name TEXT,
    p_description TEXT,
    p_image TEXT,
    p_has_expire_date BOOLEAN,
    p_expire_date TIMESTAMP,
    p_opening_quantity INTEGER,
    p_minimum_sale_quantity INTEGER,
    p_stock_alert INTEGER,
    p_purchase_cost DECIMAL,
    p_sale_cost DECIMAL,
    p_reorder_level INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    l_product_code TEXT;
BEGIN
    l_product_code := COALESCE(NULLIF(TRIM(p_product_code), ''), (
      SELECT "product_code" FROM "products" WHERE "id" = p_id
    ));

    UPDATE "products"
    SET "category_id" = p_category_id,
        "product_code" = l_product_code,
        "product_name" = p_product_name,
        "description" = p_description,
        "image" = p_image,
        "has_expire_date" = p_has_expire_date,
        "expire_date" = p_expire_date,
        "opening_quantity" = p_opening_quantity,
        "minimum_sale_quantity" = COALESCE(p_minimum_sale_quantity, 0),
        "stock_alert" = COALESCE(p_stock_alert, 0),
        "purchase_cost" = p_purchase_cost,
        "sale_cost" = p_sale_cost,
        "reorder_level" = p_reorder_level
    WHERE "id" = p_id;
END;
$$;
