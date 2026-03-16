DROP PROCEDURE IF EXISTS create_product(INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMP, INTEGER, DECIMAL, DECIMAL, INTEGER);

CREATE OR REPLACE PROCEDURE create_product(
    p_category_id INTEGER,
    p_product_code TEXT,
    p_product_name TEXT,
    p_description TEXT,
    p_image TEXT,
    p_has_expire_date BOOLEAN,
    p_expire_date TIMESTAMP,
    p_opening_quantity INTEGER,
    p_purchase_cost DECIMAL,
    p_sale_cost DECIMAL,
    p_reorder_level INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "products" (
        "category_id",
        "product_code",
        "product_name",
        "description",
        "image",
        "has_expire_date",
        "expire_date",
        "opening_quantity",
        "purchase_cost",
        "sale_cost",
        "reorder_level"
    )
    VALUES (
        p_category_id,
        p_product_code,
        p_product_name,
        p_description,
        p_image,
        p_has_expire_date,
        p_expire_date,
        p_opening_quantity,
        p_purchase_cost,
        p_sale_cost,
        p_reorder_level
    );
END;
$$;
