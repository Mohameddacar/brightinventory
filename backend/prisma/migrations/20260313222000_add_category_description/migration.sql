ALTER TABLE "categories"
ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE "categories"
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

DROP PROCEDURE IF EXISTS create_category(TEXT);
CREATE OR REPLACE PROCEDURE create_category(
    p_name TEXT,
    p_description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "categories" ("category_name", "description", "created_at", "updated_at")
    VALUES (p_name, p_description, NOW(), NOW());
END;
$$;

DROP PROCEDURE IF EXISTS update_category(INTEGER, TEXT);
CREATE OR REPLACE PROCEDURE update_category(
    p_id INTEGER,
    p_name TEXT,
    p_description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "categories"
    SET "category_name" = p_name,
        "description" = p_description,
        "updated_at" = NOW()
    WHERE "id" = p_id;
END;
$$;
