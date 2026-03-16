-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('increase', 'decrease');

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "address" TEXT,
    "contact" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "phone" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "role_name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "module" TEXT NOT NULL,
    "permission_name" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "category_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "has_expire_date" BOOLEAN NOT NULL DEFAULT false,
    "expire_date" TIMESTAMP(3),
    "opening_quantity" INTEGER NOT NULL,
    "purchase_cost" DECIMAL(65,30) NOT NULL,
    "sale_cost" DECIMAL(65,30) NOT NULL,
    "reorder_level" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "address" TEXT,
    "mobile_no" TEXT,
    "email" TEXT,
    "opening_balance" DECIMAL(65,30),
    "balance_type" "BalanceType" NOT NULL,
    "registered_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "purchase_id" INTEGER,
    "payment_mode" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "remarks" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT,
    "address" TEXT,
    "mobile_no" TEXT,
    "email" TEXT,
    "registered_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT,
    "address" TEXT,
    "mobile_no" TEXT,
    "email" TEXT,
    "customer_type" TEXT,
    "sponsor_id" INTEGER,
    "opening_balance" DECIMAL(65,30),
    "balance_type" "BalanceType" NOT NULL,
    "registered_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_receipts" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "invoice_no" INTEGER NOT NULL,
    "payment_mode" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" SERIAL NOT NULL,
    "transaction_number" TEXT NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "payment_mode" TEXT NOT NULL,
    "cash_amount" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL,
    "grand_total" DECIMAL(65,30) NOT NULL,
    "paid" DECIMAL(65,30) NOT NULL,
    "rest" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" SERIAL NOT NULL,
    "purchase_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "expire_date" TIMESTAMP(3),
    "cost" DECIMAL(65,30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" SERIAL NOT NULL,
    "transaction_no" TEXT NOT NULL,
    "purchase_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "return_type" TEXT NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_items" (
    "id" SERIAL NOT NULL,
    "purchase_return_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL,
    "grand_total" DECIMAL(65,30) NOT NULL,
    "paid" DECIMAL(65,30) NOT NULL,
    "rest" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_returns" (
    "id" SERIAL NOT NULL,
    "transaction_no" TEXT NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return_items" (
    "id" SERIAL NOT NULL,
    "sales_return_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_types" (
    "id" SERIAL NOT NULL,
    "type_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_bills" (
    "id" SERIAL NOT NULL,
    "expense_type_id" INTEGER NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "receiver_name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_payments" (
    "id" SERIAL NOT NULL,
    "expense_bill_id" INTEGER NOT NULL,
    "payment_mode" TEXT NOT NULL,
    "cash" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "remarks" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expire_date" TIMESTAMP(3),
    "adjustment_type" "AdjustmentType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_closing" (
    "id" SERIAL NOT NULL,
    "closing_date" TIMESTAMP(3) NOT NULL,
    "total_sales" DECIMAL(65,30) NOT NULL,
    "total_expense" DECIMAL(65,30) NOT NULL,
    "cash_balance" DECIMAL(65,30) NOT NULL,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "transaction_closing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_deposits" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "deposit_date" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "cash_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_logs" (
    "id" SERIAL NOT NULL,
    "report_name" TEXT NOT NULL,
    "generated_by" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_receipts" ADD CONSTRAINT "customer_receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_purchase_return_id_fkey" FOREIGN KEY ("purchase_return_id") REFERENCES "purchase_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_sales_return_id_fkey" FOREIGN KEY ("sales_return_id") REFERENCES "sales_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_bills" ADD CONSTRAINT "expense_bills_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payments" ADD CONSTRAINT "expense_payments_expense_bill_id_fkey" FOREIGN KEY ("expense_bill_id") REFERENCES "expense_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_logs" ADD CONSTRAINT "report_logs_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Category Stored Procedures
CREATE OR REPLACE PROCEDURE create_category(p_category_name TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "categories" ("category_name", "created_at", "updated_at")
    VALUES (p_category_name, NOW(), NOW());
END;
$$;

CREATE OR REPLACE PROCEDURE update_category(p_id INTEGER, p_category_name TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "categories"
    SET "category_name" = p_category_name,
        "updated_at" = NOW()
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_category(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "categories"
    WHERE "id" = p_id;
END;
$$;

-- Product Stored Procedures
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
        "reorder_level",
        "created_at"
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
        p_reorder_level,
        NOW()
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
    p_purchase_cost DECIMAL,
    p_sale_cost DECIMAL,
    p_reorder_level INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "products"
    SET "category_id" = p_category_id,
        "product_code" = p_product_code,
        "product_name" = p_product_name,
        "description" = p_description,
        "image" = p_image,
        "has_expire_date" = p_has_expire_date,
        "expire_date" = p_expire_date,
        "opening_quantity" = p_opening_quantity,
        "purchase_cost" = p_purchase_cost,
        "sale_cost" = p_sale_cost,
        "reorder_level" = p_reorder_level
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_product(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "products"
    WHERE "id" = p_id;
END;
$$;

-- Supplier Stored Procedures
CREATE OR REPLACE PROCEDURE create_supplier(
    p_full_name TEXT,
    p_address TEXT,
    p_mobile_no TEXT,
    p_email TEXT,
    p_opening_balance DECIMAL,
    p_balance_type "BalanceType",
    p_registered_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "suppliers" (
        "full_name",
        "address",
        "mobile_no",
        "email",
        "opening_balance",
        "balance_type",
        "registered_date",
        "created_at"
    )
    VALUES (
        p_full_name,
        p_address,
        p_mobile_no,
        p_email,
        p_opening_balance,
        p_balance_type,
        p_registered_date,
        NOW()
    );
END;
$$;

CREATE OR REPLACE PROCEDURE update_supplier(
    p_id INTEGER,
    p_full_name TEXT,
    p_address TEXT,
    p_mobile_no TEXT,
    p_email TEXT,
    p_opening_balance DECIMAL,
    p_balance_type "BalanceType",
    p_registered_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "suppliers"
    SET "full_name" = p_full_name,
        "address" = p_address,
        "mobile_no" = p_mobile_no,
        "email" = p_email,
        "opening_balance" = p_opening_balance,
        "balance_type" = p_balance_type,
        "registered_date" = p_registered_date
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_supplier(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "suppliers"
    WHERE "id" = p_id;
END;
$$;

-- Purchase Stored Procedures
CREATE OR REPLACE PROCEDURE create_purchase(
    p_transaction_number TEXT,
    p_supplier_id INTEGER,
    p_purchase_date TIMESTAMP,
    p_payment_mode TEXT,
    p_cash_amount DECIMAL,
    p_total DECIMAL,
    p_discount DECIMAL,
    p_grand_total DECIMAL,
    p_paid DECIMAL,
    p_rest DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "purchases" (
        "transaction_number",
        "supplier_id",
        "purchase_date",
        "payment_mode",
        "cash_amount",
        "total",
        "discount",
        "grand_total",
        "paid",
        "rest",
        "created_at"
    )
    VALUES (
        p_transaction_number,
        p_supplier_id,
        p_purchase_date,
        p_payment_mode,
        p_cash_amount,
        p_total,
        p_discount,
        p_grand_total,
        p_paid,
        p_rest,
        NOW()
    );
END;
$$;

CREATE OR REPLACE PROCEDURE update_purchase(
    p_id INTEGER,
    p_transaction_number TEXT,
    p_supplier_id INTEGER,
    p_purchase_date TIMESTAMP,
    p_payment_mode TEXT,
    p_cash_amount DECIMAL,
    p_total DECIMAL,
    p_discount DECIMAL,
    p_grand_total DECIMAL,
    p_paid DECIMAL,
    p_rest DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "purchases"
    SET "transaction_number" = p_transaction_number,
        "supplier_id" = p_supplier_id,
        "purchase_date" = p_purchase_date,
        "payment_mode" = p_payment_mode,
        "cash_amount" = p_cash_amount,
        "total" = p_total,
        "discount" = p_discount,
        "grand_total" = p_grand_total,
        "paid" = p_paid,
        "rest" = p_rest
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_purchase(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "purchases"
    WHERE "id" = p_id;
END;
$$;

-- Sale Stored Procedures
CREATE OR REPLACE PROCEDURE create_sale(
    p_invoice_no TEXT,
    p_customer_id INTEGER,
    p_invoice_date TIMESTAMP,
    p_total DECIMAL,
    p_discount DECIMAL,
    p_grand_total DECIMAL,
    p_paid DECIMAL,
    p_rest DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "sales" (
        "invoice_no",
        "customer_id",
        "invoice_date",
        "total",
        "discount",
        "grand_total",
        "paid",
        "rest",
        "created_at"
    )
    VALUES (
        p_invoice_no,
        p_customer_id,
        p_invoice_date,
        p_total,
        p_discount,
        p_grand_total,
        p_paid,
        p_rest,
        NOW()
    );
END;
$$;

CREATE OR REPLACE PROCEDURE update_sale(
    p_id INTEGER,
    p_invoice_no TEXT,
    p_customer_id INTEGER,
    p_invoice_date TIMESTAMP,
    p_total DECIMAL,
    p_discount DECIMAL,
    p_grand_total DECIMAL,
    p_paid DECIMAL,
    p_rest DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "sales"
    SET "invoice_no" = p_invoice_no,
        "customer_id" = p_customer_id,
        "invoice_date" = p_invoice_date,
        "total" = p_total,
        "discount" = p_discount,
        "grand_total" = p_grand_total,
        "paid" = p_paid,
        "rest" = p_rest
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_sale(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "sales"
    WHERE "id" = p_id;
END;
$$;

-- Customer Stored Procedures
CREATE OR REPLACE PROCEDURE create_customer(
    p_full_name TEXT,
    p_gender TEXT,
    p_address TEXT,
    p_mobile_no TEXT,
    p_email TEXT,
    p_customer_type TEXT,
    p_sponsor_id INTEGER,
    p_opening_balance DECIMAL,
    p_balance_type "BalanceType",
    p_registered_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "customers" (
        "full_name",
        "gender",
        "address",
        "mobile_no",
        "email",
        "customer_type",
        "sponsor_id",
        "opening_balance",
        "balance_type",
        "registered_date",
        "created_at"
    )
    VALUES (
        p_full_name,
        p_gender,
        p_address,
        p_mobile_no,
        p_email,
        p_customer_type,
        p_sponsor_id,
        p_opening_balance,
        p_balance_type,
        p_registered_date,
        NOW()
    );
END;
$$;

CREATE OR REPLACE PROCEDURE update_customer(
    p_id INTEGER,
    p_full_name TEXT,
    p_gender TEXT,
    p_address TEXT,
    p_mobile_no TEXT,
    p_email TEXT,
    p_customer_type TEXT,
    p_sponsor_id INTEGER,
    p_opening_balance DECIMAL,
    p_balance_type "BalanceType",
    p_registered_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "customers"
    SET "full_name" = p_full_name,
        "gender" = p_gender,
        "address" = p_address,
        "mobile_no" = p_mobile_no,
        "email" = p_email,
        "customer_type" = p_customer_type,
        "sponsor_id" = p_sponsor_id,
        "opening_balance" = p_opening_balance,
        "balance_type" = p_balance_type,
        "registered_date" = p_registered_date
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_customer(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "customers"
    WHERE "id" = p_id;
END;
$$;

-- Expense Stored Procedures
CREATE OR REPLACE PROCEDURE create_expense(
    p_expense_type_id INTEGER,
    p_invoice_date TIMESTAMP,
    p_receiver_name TEXT,
    p_amount DECIMAL,
    p_remarks TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "expense_bills" (
        "expense_type_id",
        "invoice_date",
        "receiver_name",
        "amount",
        "remarks",
        "created_at"
    )
    VALUES (
        p_expense_type_id,
        p_invoice_date,
        p_receiver_name,
        p_amount,
        p_remarks,
        NOW()
    );
END;
$$;

CREATE OR REPLACE PROCEDURE update_expense(
    p_id INTEGER,
    p_expense_type_id INTEGER,
    p_invoice_date TIMESTAMP,
    p_receiver_name TEXT,
    p_amount DECIMAL,
    p_remarks TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "expense_bills"
    SET "expense_type_id" = p_expense_type_id,
        "invoice_date" = p_invoice_date,
        "receiver_name" = p_receiver_name,
        "amount" = p_amount,
        "remarks" = p_remarks
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_expense(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "expense_bills"
    WHERE "id" = p_id;
END;
$$;

-- Stock Adjustment Stored Procedures
CREATE OR REPLACE PROCEDURE create_stock_adjustment(
    p_product_id INTEGER,
    p_product_code TEXT,
    p_product_name TEXT,
    p_quantity INTEGER,
    p_expire_date TIMESTAMP,
    p_adjustment_type "AdjustmentType"
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "stock_adjustments" (
        "product_id",
        "product_code",
        "product_name",
        "quantity",
        "expire_date",
        "adjustment_type",
        "created_at"
    )
    VALUES (
        p_product_id,
        p_product_code,
        p_product_name,
        p_quantity,
        p_expire_date,
        p_adjustment_type,
        NOW()
    );
END;
$$;

CREATE OR REPLACE PROCEDURE update_stock_adjustment(
    p_id INTEGER,
    p_product_id INTEGER,
    p_product_code TEXT,
    p_product_name TEXT,
    p_quantity INTEGER,
    p_expire_date TIMESTAMP,
    p_adjustment_type "AdjustmentType"
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "stock_adjustments"
    SET "product_id" = p_product_id,
        "product_code" = p_product_code,
        "product_name" = p_product_name,
        "quantity" = p_quantity,
        "expire_date" = p_expire_date,
        "adjustment_type" = p_adjustment_type
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_stock_adjustment(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "stock_adjustments"
    WHERE "id" = p_id;
END;
$$;

-- Company Stored Procedures
CREATE OR REPLACE PROCEDURE create_company(
    p_company_name TEXT,
    p_address TEXT,
    p_contact TEXT,
    p_email TEXT,
    p_logo TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "companies" ("company_name", "address", "contact", "email", "logo", "created_at", "updated_at")
    VALUES (p_company_name, p_address, p_contact, p_email, p_logo, NOW(), NOW());
END;
$$;

CREATE OR REPLACE PROCEDURE update_company(
    p_id INTEGER,
    p_company_name TEXT,
    p_address TEXT,
    p_contact TEXT,
    p_email TEXT,
    p_logo TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "companies"
    SET "company_name" = p_company_name,
        "address" = p_address,
        "contact" = p_contact,
        "email" = p_email,
        "logo" = p_logo,
        "updated_at" = NOW()
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_company(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "companies" WHERE "id" = p_id;
END;
$$;

-- User Stored Procedures
CREATE OR REPLACE PROCEDURE create_user(
    p_name TEXT,
    p_email TEXT,
    p_password TEXT,
    p_role_id INTEGER,
    p_phone TEXT,
    p_status BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "users" ("name", "email", "password", "role_id", "phone", "status", "created_at")
    VALUES (p_name, p_email, p_password, p_role_id, p_phone, p_status, NOW());
END;
$$;

CREATE OR REPLACE PROCEDURE update_user(
    p_id INTEGER,
    p_name TEXT,
    p_email TEXT,
    p_password TEXT,
    p_role_id INTEGER,
    p_phone TEXT,
    p_status BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "users"
    SET "name" = p_name,
        "email" = p_email,
        "password" = p_password,
        "role_id" = p_role_id,
        "phone" = p_phone,
        "status" = p_status
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_user(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "users" WHERE "id" = p_id;
END;
$$;

-- Role Stored Procedures
CREATE OR REPLACE PROCEDURE create_role(p_role_name TEXT, p_description TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "roles" ("role_name", "description") VALUES (p_role_name, p_description);
END;
$$;

CREATE OR REPLACE PROCEDURE update_role(p_id INTEGER, p_role_name TEXT, p_description TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "roles" SET "role_name" = p_role_name, "description" = p_description WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_role(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "roles" WHERE "id" = p_id;
END;
$$;

-- Permission Stored Procedures
CREATE OR REPLACE PROCEDURE create_permission(p_module TEXT, p_permission_name TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "permissions" ("module", "permission_name") VALUES (p_module, p_permission_name);
END;
$$;

CREATE OR REPLACE PROCEDURE update_permission(p_id INTEGER, p_module TEXT, p_permission_name TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "permissions" SET "module" = p_module, "permission_name" = p_permission_name WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_permission(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "permissions" WHERE "id" = p_id;
END;
$$;

-- Role Permission Stored Procedures
CREATE OR REPLACE PROCEDURE create_role_permission(p_role_id INTEGER, p_permission_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES (p_role_id, p_permission_id);
END;
$$;

CREATE OR REPLACE PROCEDURE update_role_permission(p_id INTEGER, p_role_id INTEGER, p_permission_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "role_permissions" SET "role_id" = p_role_id, "permission_id" = p_permission_id WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_role_permission(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "role_permissions" WHERE "id" = p_id;
END;
$$;

-- Supplier Payment Stored Procedures
CREATE OR REPLACE PROCEDURE create_supplier_payment(
    p_supplier_id INTEGER,
    p_purchase_id INTEGER,
    p_payment_mode TEXT,
    p_amount DECIMAL,
    p_remarks TEXT,
    p_payment_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "supplier_payments" ("supplier_id", "purchase_id", "payment_mode", "amount", "remarks", "payment_date")
    VALUES (p_supplier_id, p_purchase_id, p_payment_mode, p_amount, p_remarks, p_payment_date);
END;
$$;

CREATE OR REPLACE PROCEDURE update_supplier_payment(
    p_id INTEGER,
    p_supplier_id INTEGER,
    p_purchase_id INTEGER,
    p_payment_mode TEXT,
    p_amount DECIMAL,
    p_remarks TEXT,
    p_payment_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "supplier_payments"
    SET "supplier_id" = p_supplier_id,
        "purchase_id" = p_purchase_id,
        "payment_mode" = p_payment_mode,
        "amount" = p_amount,
        "remarks" = p_remarks,
        "payment_date" = p_payment_date
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_supplier_payment(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "supplier_payments" WHERE "id" = p_id;
END;
$$;

-- Sponsor Stored Procedures
CREATE OR REPLACE PROCEDURE create_sponsor(
    p_full_name TEXT,
    p_gender TEXT,
    p_address TEXT,
    p_mobile_no TEXT,
    p_email TEXT,
    p_registered_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "sponsors" ("full_name", "gender", "address", "mobile_no", "email", "registered_date")
    VALUES (p_full_name, p_gender, p_address, p_mobile_no, p_email, p_registered_date);
END;
$$;

CREATE OR REPLACE PROCEDURE update_sponsor(
    p_id INTEGER,
    p_full_name TEXT,
    p_gender TEXT,
    p_address TEXT,
    p_mobile_no TEXT,
    p_email TEXT,
    p_registered_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "sponsors"
    SET "full_name" = p_full_name,
        "gender" = p_gender,
        "address" = p_address,
        "mobile_no" = p_mobile_no,
        "email" = p_email,
        "registered_date" = p_registered_date
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_sponsor(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "sponsors" WHERE "id" = p_id;
END;
$$;

-- Customer Receipt Stored Procedures
CREATE OR REPLACE PROCEDURE create_customer_receipt(
    p_customer_id INTEGER,
    p_invoice_no INTEGER,
    p_payment_mode TEXT,
    p_amount DECIMAL,
    p_remarks TEXT,
    p_created_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "customer_receipts" ("customer_id", "invoice_no", "payment_mode", "amount", "remarks", "created_at")
    VALUES (p_customer_id, p_invoice_no, p_payment_mode, p_amount, p_remarks, p_created_at);
END;
$$;

CREATE OR REPLACE PROCEDURE update_customer_receipt(
    p_id INTEGER,
    p_customer_id INTEGER,
    p_invoice_no INTEGER,
    p_payment_mode TEXT,
    p_amount DECIMAL,
    p_remarks TEXT,
    p_created_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "customer_receipts"
    SET "customer_id" = p_customer_id,
        "invoice_no" = p_invoice_no,
        "payment_mode" = p_payment_mode,
        "amount" = p_amount,
        "remarks" = p_remarks,
        "created_at" = p_created_at
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_customer_receipt(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "customer_receipts" WHERE "id" = p_id;
END;
$$;

-- Purchase Item Stored Procedures
CREATE OR REPLACE PROCEDURE create_purchase_item(
    p_purchase_id INTEGER,
    p_product_id INTEGER,
    p_expire_date TIMESTAMP,
    p_cost DECIMAL,
    p_quantity INTEGER,
    p_price DECIMAL,
    p_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "purchase_items" ("purchase_id", "product_id", "expire_date", "cost", "quantity", "price", "amount")
    VALUES (p_purchase_id, p_product_id, p_expire_date, p_cost, p_quantity, p_price, p_amount);
END;
$$;

CREATE OR REPLACE PROCEDURE update_purchase_item(
    p_id INTEGER,
    p_purchase_id INTEGER,
    p_product_id INTEGER,
    p_expire_date TIMESTAMP,
    p_cost DECIMAL,
    p_quantity INTEGER,
    p_price DECIMAL,
    p_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "purchase_items"
    SET "purchase_id" = p_purchase_id,
        "product_id" = p_product_id,
        "expire_date" = p_expire_date,
        "cost" = p_cost,
        "quantity" = p_quantity,
        "price" = p_price,
        "amount" = p_amount
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_purchase_item(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "purchase_items" WHERE "id" = p_id;
END;
$$;

-- Purchase Return Stored Procedures
CREATE OR REPLACE PROCEDURE create_purchase_return(
    p_transaction_no TEXT,
    p_purchase_id INTEGER,
    p_supplier_id INTEGER,
    p_return_type TEXT,
    p_return_date TIMESTAMP,
    p_total_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "purchase_returns" ("transaction_no", "purchase_id", "supplier_id", "return_type", "return_date", "total_amount")
    VALUES (p_transaction_no, p_purchase_id, p_supplier_id, p_return_type, p_return_date, p_total_amount);
END;
$$;

CREATE OR REPLACE PROCEDURE update_purchase_return(
    p_id INTEGER,
    p_transaction_no TEXT,
    p_purchase_id INTEGER,
    p_supplier_id INTEGER,
    p_return_type TEXT,
    p_return_date TIMESTAMP,
    p_total_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "purchase_returns"
    SET "transaction_no" = p_transaction_no,
        "purchase_id" = p_purchase_id,
        "supplier_id" = p_supplier_id,
        "return_type" = p_return_type,
        "return_date" = p_return_date,
        "total_amount" = p_total_amount
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_purchase_return(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "purchase_returns" WHERE "id" = p_id;
END;
$$;

-- Purchase Return Item Stored Procedures
CREATE OR REPLACE PROCEDURE create_purchase_return_item(
    p_purchase_return_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER,
    p_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "purchase_return_items" ("purchase_return_id", "product_id", "quantity", "amount")
    VALUES (p_purchase_return_id, p_product_id, p_quantity, p_amount);
END;
$$;

CREATE OR REPLACE PROCEDURE update_purchase_return_item(
    p_id INTEGER,
    p_purchase_return_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER,
    p_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "purchase_return_items"
    SET "purchase_return_id" = p_purchase_return_id,
        "product_id" = p_product_id,
        "quantity" = p_quantity,
        "amount" = p_amount
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_purchase_return_item(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "purchase_return_items" WHERE "id" = p_id;
END;
$$;

-- Sale Item Stored Procedures
CREATE OR REPLACE PROCEDURE create_sale_item(
    p_sale_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER,
    p_price DECIMAL,
    p_total DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "sale_items" ("sale_id", "product_id", "quantity", "price", "total")
    VALUES (p_sale_id, p_product_id, p_quantity, p_price, p_total);
END;
$$;

CREATE OR REPLACE PROCEDURE update_sale_item(
    p_id INTEGER,
    p_sale_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER,
    p_price DECIMAL,
    p_total DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "sale_items"
    SET "sale_id" = p_sale_id,
        "product_id" = p_product_id,
        "quantity" = p_quantity,
        "price" = p_price,
        "total" = p_total
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_sale_item(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "sale_items" WHERE "id" = p_id;
END;
$$;

-- Sales Return Stored Procedures
CREATE OR REPLACE PROCEDURE create_sales_return(
    p_transaction_no TEXT,
    p_sale_id INTEGER,
    p_customer_id INTEGER,
    p_return_date TIMESTAMP,
    p_total_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "sales_returns" ("transaction_no", "sale_id", "customer_id", "return_date", "total_amount")
    VALUES (p_transaction_no, p_sale_id, p_customer_id, p_return_date, p_total_amount);
END;
$$;

CREATE OR REPLACE PROCEDURE update_sales_return(
    p_id INTEGER,
    p_transaction_no TEXT,
    p_sale_id INTEGER,
    p_customer_id INTEGER,
    p_return_date TIMESTAMP,
    p_total_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "sales_returns"
    SET "transaction_no" = p_transaction_no,
        "sale_id" = p_sale_id,
        "customer_id" = p_customer_id,
        "return_date" = p_return_date,
        "total_amount" = p_total_amount
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_sales_return(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "sales_returns" WHERE "id" = p_id;
END;
$$;

-- Sales Return Item Stored Procedures
CREATE OR REPLACE PROCEDURE create_sales_return_item(
    p_sales_return_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER,
    p_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "sales_return_items" ("sales_return_id", "product_id", "quantity", "amount")
    VALUES (p_sales_return_id, p_product_id, p_quantity, p_amount);
END;
$$;

CREATE OR REPLACE PROCEDURE update_sales_return_item(
    p_id INTEGER,
    p_sales_return_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER,
    p_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "sales_return_items"
    SET "sales_return_id" = p_sales_return_id,
        "product_id" = p_product_id,
        "quantity" = p_quantity,
        "amount" = p_amount
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_sales_return_item(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "sales_return_items" WHERE "id" = p_id;
END;
$$;

-- Expense Type Stored Procedures
CREATE OR REPLACE PROCEDURE create_expense_type(p_type_name TEXT, p_created_at TIMESTAMP)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "expense_types" ("type_name", "created_at") VALUES (p_type_name, p_created_at);
END;
$$;

CREATE OR REPLACE PROCEDURE update_expense_type(p_id INTEGER, p_type_name TEXT, p_created_at TIMESTAMP)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "expense_types" SET "type_name" = p_type_name, "created_at" = p_created_at WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_expense_type(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "expense_types" WHERE "id" = p_id;
END;
$$;

-- Expense Payment Stored Procedures
CREATE OR REPLACE PROCEDURE create_expense_payment(
    p_expense_bill_id INTEGER,
    p_payment_mode TEXT,
    p_cash DECIMAL,
    p_amount DECIMAL,
    p_remarks TEXT,
    p_payment_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "expense_payments" ("expense_bill_id", "payment_mode", "cash", "amount", "remarks", "payment_date")
    VALUES (p_expense_bill_id, p_payment_mode, p_cash, p_amount, p_remarks, p_payment_date);
END;
$$;

CREATE OR REPLACE PROCEDURE update_expense_payment(
    p_id INTEGER,
    p_expense_bill_id INTEGER,
    p_payment_mode TEXT,
    p_cash DECIMAL,
    p_amount DECIMAL,
    p_remarks TEXT,
    p_payment_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "expense_payments"
    SET "expense_bill_id" = p_expense_bill_id,
        "payment_mode" = p_payment_mode,
        "cash" = p_cash,
        "amount" = p_amount,
        "remarks" = p_remarks,
        "payment_date" = p_payment_date
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_expense_payment(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "expense_payments" WHERE "id" = p_id;
END;
$$;

-- Transaction Closing Stored Procedures
CREATE OR REPLACE PROCEDURE create_transaction_closing(
    p_closing_date TIMESTAMP,
    p_total_sales DECIMAL,
    p_total_expense DECIMAL,
    p_cash_balance DECIMAL,
    p_created_by INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "transaction_closing" ("closing_date", "total_sales", "total_expense", "cash_balance", "created_by")
    VALUES (p_closing_date, p_total_sales, p_total_expense, p_cash_balance, p_created_by);
END;
$$;

CREATE OR REPLACE PROCEDURE update_transaction_closing(
    p_id INTEGER,
    p_closing_date TIMESTAMP,
    p_total_sales DECIMAL,
    p_total_expense DECIMAL,
    p_cash_balance DECIMAL,
    p_created_by INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "transaction_closing"
    SET "closing_date" = p_closing_date,
        "total_sales" = p_total_sales,
        "total_expense" = p_total_expense,
        "cash_balance" = p_cash_balance,
        "created_by" = p_created_by
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_transaction_closing(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "transaction_closing" WHERE "id" = p_id;
END;
$$;

-- Cash Deposit Stored Procedures
CREATE OR REPLACE PROCEDURE create_cash_deposit(p_amount DECIMAL, p_deposit_date TIMESTAMP, p_remarks TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "cash_deposits" ("amount", "deposit_date", "remarks") VALUES (p_amount, p_deposit_date, p_remarks);
END;
$$;

CREATE OR REPLACE PROCEDURE update_cash_deposit(p_id INTEGER, p_amount DECIMAL, p_deposit_date TIMESTAMP, p_remarks TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "cash_deposits" SET "amount" = p_amount, "deposit_date" = p_deposit_date, "remarks" = p_remarks WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_cash_deposit(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "cash_deposits" WHERE "id" = p_id;
END;
$$;

-- Report Log Stored Procedures
CREATE OR REPLACE PROCEDURE create_report_log(p_report_name TEXT, p_generated_by INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "report_logs" ("report_name", "generated_by", "generated_at") VALUES (p_report_name, p_generated_by, NOW());
END;
$$;

CREATE OR REPLACE PROCEDURE update_report_log(p_id INTEGER, p_report_name TEXT, p_generated_by INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "report_logs" SET "report_name" = p_report_name, "generated_by" = p_generated_by WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_report_log(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "report_logs" WHERE "id" = p_id;
END;
$$;

-- Audit Log Stored Procedures
CREATE OR REPLACE PROCEDURE create_audit_log(
    p_user_id INTEGER,
    p_action TEXT,
    p_table_name TEXT,
    p_record_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "audit_logs" ("user_id", "action", "table_name", "record_id", "created_at")
    VALUES (p_user_id, p_action, p_table_name, p_record_id, NOW());
END;
$$;

CREATE OR REPLACE PROCEDURE update_audit_log(
    p_id INTEGER,
    p_user_id INTEGER,
    p_action TEXT,
    p_table_name TEXT,
    p_record_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "audit_logs"
    SET "user_id" = p_user_id,
        "action" = p_action,
        "table_name" = p_table_name,
        "record_id" = p_record_id
    WHERE "id" = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE delete_audit_log(p_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "audit_logs" WHERE "id" = p_id;
END;
$$;
