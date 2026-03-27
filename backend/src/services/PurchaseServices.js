const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { ensureInventorySchema, applyMovementBatch, resolveWarehouseId } = require('./InventoryServices');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

let purchaseSchemaReady = false;

const normalizePurchaseItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitCost = Number(item.unit_cost || 0);
    const tax = Number(item.tax || 0);
    const discount = Number(item.discount || 0);

    return {
      product_id: Number(item.product_id),
      quantity,
      unit_cost: unitCost,
      tax,
      discount,
      subtotal: Math.max(0, quantity * unitCost + tax - discount),
    };
  });
};

const ensurePurchaseSchema = async () => {
  if (purchaseSchemaReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
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

    CREATE TABLE IF NOT EXISTS purchase_payments (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payment_mode VARCHAR(50) NOT NULL DEFAULT 'cash',
      account_name VARCHAR(120),
      amount NUMERIC(18,2) NOT NULL,
      remarks TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase_id ON purchase_payments (purchase_id);

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
  `);

  await ensureInventorySchema();

  purchaseSchemaReady = true;
};

const createPurchase = async (purchaseData) => {
  await ensurePurchaseSchema();

  if (Array.isArray(purchaseData.items)) {
    const normalizedItems = normalizePurchaseItems(purchaseData.items);
    const orderTax = Number(purchaseData.order_tax || 0);
    const shipping = Number(purchaseData.shipping || 0);
    const discountInput = Number(purchaseData.discount || 0);
    const discountType = String(purchaseData.discount_type || 'fixed').toLowerCase() === 'percent' ? 'percent' : 'fixed';
    const itemsTotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const orderDiscount = discountType === 'percent' ? (itemsTotal * discountInput) / 100 : discountInput;
    const grandTotal = Math.max(0, itemsTotal + orderTax + shipping - orderDiscount);
    const paid = Math.max(0, Number(purchaseData.paid ?? 0));
    const rest = Math.max(0, grandTotal - paid);
    const purchaseDate = purchaseData.purchase_date ? new Date(purchaseData.purchase_date) : new Date();
    const purchaseCode = String(purchaseData.purchase_code || '').trim() || `PUR-${Date.now()}`;

    return prisma.$transaction(async (tx) => {
      const warehouseId = await resolveWarehouseId(tx, purchaseData.warehouse_id);

      const createdRows = await tx.$queryRaw`
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
          ${purchaseCode},
          ${purchaseCode},
          ${Number(purchaseData.supplier_id)},
          ${warehouseId},
          ${purchaseDate},
          ${String(purchaseData.payment_mode || 'cash')},
          ${paid},
          ${itemsTotal},
          ${orderTax},
          ${discountInput},
          ${discountType},
          ${shipping},
          ${itemsTotal},
          ${grandTotal},
          ${paid},
          ${rest},
          ${purchaseData.notes ?? null},
          ${purchaseData.created_by ? Number(purchaseData.created_by) : null},
          NOW(),
          NOW()
        ) RETURNING id
      `;

      const purchaseId = Number(createdRows[0].id);

      for (const item of normalizedItems) {
        await tx.$executeRaw`
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
            ${purchaseId},
            ${item.product_id},
            ${item.unit_cost},
            ${item.unit_cost},
            ${item.quantity},
            ${item.unit_cost},
            ${item.subtotal},
            ${item.discount},
            ${item.tax},
            ${item.subtotal},
            NOW(),
            NOW()
          )
        `;
      }

      await applyMovementBatch(
        tx,
        normalizedItems.map((item) => ({
          product_id: item.product_id,
          warehouse_id: warehouseId,
          delta: item.quantity,
          movement_type: 'IN',
          movement_quantity: item.quantity,
          reference_type: 'PURCHASE',
          reference_id: purchaseId,
          note: `Purchase ${purchaseCode}`,
        }))
      );
    });
  }

  const {
    transaction_number,
    supplier_id,
    purchase_date,
    payment_mode,
    cash_amount,
    total,
    discount,
    grand_total,
    paid,
    rest,
  } = purchaseData;

  await prisma.$executeRaw`
    CALL create_purchase(
      ${transaction_number},
      ${Number(supplier_id)},
      ${new Date(purchase_date)},
      ${payment_mode},
      ${Number(cash_amount)},
      ${Number(total)},
      ${Number(discount)},
      ${Number(grand_total)},
      ${Number(paid)},
      ${Number(rest)}
    )
  `;
};

const updatePurchase = async (id, purchaseData) => {
  await ensurePurchaseSchema();

  const purchaseId = Number(id);
  const normalizedItems = normalizePurchaseItems(purchaseData.items || []);

  const itemsTotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const orderTax = Number(purchaseData.order_tax || 0);
  const shipping = Number(purchaseData.shipping || 0);
  const discountInput = Number(purchaseData.discount || 0);
  const discountType = String(purchaseData.discount_type || 'fixed').toLowerCase() === 'percent' ? 'percent' : 'fixed';
  const orderDiscount = discountType === 'percent' ? (itemsTotal * discountInput) / 100 : discountInput;
  const grandTotal = Math.max(0, itemsTotal + orderTax + shipping - orderDiscount);

  await prisma.$transaction(async (tx) => {
    const existingPurchase = await tx.$queryRaw`
      SELECT id, paid, warehouse_id, transaction_number
      FROM purchases
      WHERE id = ${purchaseId}
      LIMIT 1
    `;

    if (!Array.isArray(existingPurchase) || existingPurchase.length === 0) {
      throw new Error('Purchase not found');
    }

    const existingItems = await tx.$queryRaw`
      SELECT product_id, quantity
      FROM purchase_items
      WHERE purchase_id = ${purchaseId}
    `;

    const existingWarehouseId = await resolveWarehouseId(tx, existingPurchase[0].warehouse_id);
    const nextWarehouseId = await resolveWarehouseId(tx, purchaseData.warehouse_id ?? existingWarehouseId);

    const previousQtyByProduct = new Map();
    existingItems.forEach((row) => {
      const productId = Number(row.product_id);
      const qty = Number(row.quantity || 0);
      previousQtyByProduct.set(productId, (previousQtyByProduct.get(productId) || 0) + qty);
    });

    const newQtyByProduct = new Map();
    normalizedItems.forEach((item) => {
      newQtyByProduct.set(item.product_id, (newQtyByProduct.get(item.product_id) || 0) + item.quantity);
    });

    const movementOps = [];
    const productIds = new Set([...previousQtyByProduct.keys(), ...newQtyByProduct.keys()]);

    for (const productId of productIds) {
      const prevQty = previousQtyByProduct.get(productId) || 0;
      const nextQty = newQtyByProduct.get(productId) || 0;

      if (existingWarehouseId === nextWarehouseId) {
        const delta = nextQty - prevQty;
        if (delta !== 0) {
          movementOps.push({
            product_id: productId,
            warehouse_id: nextWarehouseId,
            delta,
            movement_type: delta > 0 ? 'IN' : 'OUT',
            movement_quantity: Math.abs(delta),
            reference_type: 'PURCHASE',
            reference_id: purchaseId,
            note: `Purchase update ${existingPurchase[0].transaction_number}`,
          });
        }
      } else {
        if (prevQty > 0) {
          movementOps.push({
            product_id: productId,
            warehouse_id: existingWarehouseId,
            delta: -prevQty,
            movement_type: 'OUT',
            movement_quantity: prevQty,
            reference_type: 'PURCHASE',
            reference_id: purchaseId,
            note: `Purchase warehouse transfer out ${existingPurchase[0].transaction_number}`,
          });
        }
        if (nextQty > 0) {
          movementOps.push({
            product_id: productId,
            warehouse_id: nextWarehouseId,
            delta: nextQty,
            movement_type: 'IN',
            movement_quantity: nextQty,
            reference_type: 'PURCHASE',
            reference_id: purchaseId,
            note: `Purchase warehouse transfer in ${existingPurchase[0].transaction_number}`,
          });
        }
      }
    }

    await applyMovementBatch(tx, movementOps);

    await tx.$executeRaw`
      DELETE FROM purchase_items
      WHERE purchase_id = ${purchaseId}
    `;

    for (const item of normalizedItems) {
      await tx.$executeRaw`
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
          ${purchaseId},
          ${item.product_id},
          ${item.unit_cost},
          ${item.unit_cost},
          ${item.quantity},
          ${item.unit_cost},
          ${item.subtotal},
          ${item.discount},
          ${item.tax},
          ${item.subtotal},
          NOW(),
          NOW()
        )
      `;
    }

    const paid = Number(purchaseData.paid ?? existingPurchase[0].paid ?? 0);
    const rest = Math.max(0, grandTotal - paid);

    await tx.$executeRaw`
      UPDATE purchases
      SET
        supplier_id = ${Number(purchaseData.supplier_id)},
        warehouse_id = ${nextWarehouseId},
        purchase_date = ${new Date(purchaseData.purchase_date)},
        payment_mode = ${String(purchaseData.payment_mode || 'cash')},
        cash_amount = ${paid},
        total = ${itemsTotal},
        order_tax = ${orderTax},
        discount = ${discountInput},
        discount_type = ${discountType},
        shipping = ${shipping},
        total_amount = ${itemsTotal},
        grand_total = ${grandTotal},
        paid = ${paid},
        rest = ${rest},
        notes = ${purchaseData.notes ?? null},
        updated_at = NOW()
      WHERE id = ${purchaseId}
    `;
  });
};

const deletePurchase = async (id) => {
  await prisma.$executeRaw`CALL delete_purchase(${Number(id)})`;
};

const getAllPurchases = async () => {
  await ensurePurchaseSchema();

  return prisma.$queryRaw`
    SELECT
      p.id,
      COALESCE(NULLIF(p.purchase_code, ''), p.transaction_number) AS transaction_number,
      p.supplier_id,
      COALESCE(NULLIF(s.supplier_name, ''), s.full_name) AS supplier_name,
      p.warehouse_id,
      COALESCE(w.warehouse_name, 'main') AS warehouse_name,
      p.purchase_date,
      p.payment_mode,
      p.cash_amount,
      p.total,
      p.discount,
      p.discount_type,
      p.order_tax,
      p.shipping,
      p.total_amount,
      p.grand_total,
      p.paid,
      p.rest,
      p.notes,
      p.created_at
    FROM purchases p
    JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN warehouses w ON w.id = p.warehouse_id
    ORDER BY p.id DESC
  `;
};

const getPurchaseById = async (id) => {
  await ensurePurchaseSchema();

  const purchases = await prisma.$queryRaw`
    SELECT
      p.id,
      COALESCE(NULLIF(p.purchase_code, ''), p.transaction_number) AS transaction_number,
      p.supplier_id,
      COALESCE(NULLIF(s.supplier_name, ''), s.full_name) AS supplier_name,
      p.warehouse_id,
      COALESCE(w.warehouse_name, 'main') AS warehouse_name,
      p.purchase_date,
      p.payment_mode,
      p.cash_amount,
      p.total,
      p.discount,
      p.discount_type,
      p.order_tax,
      p.shipping,
      p.total_amount,
      p.grand_total,
      p.paid,
      p.rest,
      p.notes,
      p.created_at
    FROM purchases p
    JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN warehouses w ON w.id = p.warehouse_id
    WHERE p.id = ${Number(id)}
    LIMIT 1
  `;

  const purchase = purchases[0] || null;

  if (!purchase) {
    return null;
  }

  const items = await prisma.$queryRaw`
    SELECT
      pi.id,
      pi.purchase_id,
      pi.product_id,
      pr.product_name,
      COALESCE(NULLIF(pr.product_barcode, ''), pr.product_code) AS barcode,
      COALESCE(pi.unit_cost, pi.cost, 0) AS unit_cost,
      COALESCE(pr.current_stock, 0) AS current_stock,
      pi.quantity,
      COALESCE(pi.discount, 0) AS discount,
      COALESCE(pi.tax, 0) AS tax,
      COALESCE(pi.subtotal, pi.amount, 0) AS subtotal
    FROM purchase_items pi
    JOIN products pr ON pr.id = pi.product_id
    WHERE pi.purchase_id = ${Number(id)}
    ORDER BY pi.id ASC
  `;

  return {
    ...purchase,
    items,
  };
};

const getPurchaseItemsByPurchaseId = async (id) => {
  await ensurePurchaseSchema();

  return prisma.$queryRaw`
    SELECT
      pi.id,
      pi.purchase_id,
      pi.product_id,
      pr.product_name,
      COALESCE(NULLIF(pr.product_barcode, ''), pr.product_code) AS barcode,
      COALESCE(pi.unit_cost, pi.cost, 0) AS unit_cost,
      COALESCE(pr.current_stock, 0) AS current_stock,
      pi.quantity,
      COALESCE(pi.discount, 0) AS discount,
      COALESCE(pi.tax, 0) AS tax,
      COALESCE(pi.subtotal, pi.amount, 0) AS subtotal
    FROM purchase_items pi
    JOIN products pr ON pr.id = pi.product_id
    WHERE pi.purchase_id = ${Number(id)}
    ORDER BY pi.id ASC
  `;
};

const getWarehouses = async () => {
  await ensurePurchaseSchema();

  return prisma.$queryRaw`
    SELECT id, warehouse_name, location
    FROM warehouses
    ORDER BY id ASC
  `;
};

const createPurchasePayment = async (id, paymentData) => {
  await ensurePurchaseSchema();

  const purchaseId = Number(id);
  const amount = toNumber(paymentData.amount, 0);

  if (amount <= 0) {
    const error = new Error('Payment amount must be greater than 0');
    error.code = 'INVALID_PAYMENT';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const purchaseRows = await tx.$queryRaw`
      SELECT id, transaction_number, supplier_id, grand_total, paid, rest
      FROM purchases
      WHERE id = ${purchaseId}
      LIMIT 1
    `;

    if (!Array.isArray(purchaseRows) || purchaseRows.length === 0) {
      throw new Error('Purchase not found');
    }

    const purchase = purchaseRows[0];
    const currentDue = toNumber(purchase.rest, 0);

    if (currentDue <= 0) {
      const error = new Error('Payment completed for this purchase');
      error.code = 'PAYMENT_COMPLETED';
      throw error;
    }

    if (amount > currentDue) {
      const error = new Error(`Amount exceeds due. Needed amount is ${currentDue.toFixed(2)}`);
      error.code = 'OVERPAY';
      error.meta = { due: currentDue };
      throw error;
    }

    const nextPaid = toNumber(purchase.paid, 0) + amount;
    const nextRest = Math.max(0, toNumber(purchase.grand_total, 0) - nextPaid);

    await tx.$executeRaw`
      UPDATE purchases
      SET
        paid = ${nextPaid},
        rest = ${nextRest},
        payment_mode = ${String(paymentData.payment_mode || 'cash')},
        cash_amount = ${nextPaid},
        updated_at = NOW()
      WHERE id = ${purchaseId}
    `;

    await tx.$executeRaw`
      INSERT INTO purchase_payments (
        purchase_id,
        payment_date,
        payment_mode,
        account_name,
        amount,
        remarks,
        created_at
      ) VALUES (
        ${purchaseId},
        ${paymentData.payment_date ? new Date(paymentData.payment_date) : new Date()},
        ${String(paymentData.payment_mode || 'cash')},
        ${paymentData.account_name ? String(paymentData.account_name) : null},
        ${amount},
        ${paymentData.remarks ? String(paymentData.remarks) : null},
        NOW()
      )
    `;

    return {
      purchase_id: purchaseId,
      transaction_number: String(purchase.transaction_number),
      paid: nextPaid,
      due: nextRest,
      status: nextRest <= 0 ? 'completed' : 'partial',
    };
  });
};

const getPurchasePaymentsByPurchaseId = async (id) => {
  await ensurePurchaseSchema();

  const purchaseId = Number(id);
  const purchaseRows = await prisma.$queryRaw`
    SELECT id, transaction_number, supplier_id, grand_total, paid, rest, created_at
    FROM purchases
    WHERE id = ${purchaseId}
    LIMIT 1
  `;

  if (!Array.isArray(purchaseRows) || purchaseRows.length === 0) {
    throw new Error('Purchase not found');
  }

  const purchase = purchaseRows[0];

  const paymentRows = await prisma.$queryRaw`
    SELECT
      pp.id,
      pp.purchase_id,
      pp.payment_date,
      CONCAT('REF/PUR-', p.transaction_number) AS reference,
      pp.payment_mode,
      pp.account_name,
      pp.amount,
      pp.remarks,
      pp.created_at
    FROM purchase_payments pp
    JOIN purchases p ON p.id = pp.purchase_id
    WHERE pp.purchase_id = ${purchaseId}
    ORDER BY pp.payment_date DESC, pp.id DESC
  `;

  return {
    purchase: {
      id: Number(purchase.id),
      transaction_number: String(purchase.transaction_number),
      grand_total: toNumber(purchase.grand_total, 0),
      paid: toNumber(purchase.paid, 0),
      due: toNumber(purchase.rest, 0),
      status: toNumber(purchase.rest, 0) <= 0 ? 'paid' : toNumber(purchase.paid, 0) > 0 ? 'partial' : 'unpaid',
    },
    payments: paymentRows,
  };
};

module.exports = {
  createPurchase,
  updatePurchase,
  deletePurchase,
  getAllPurchases,
  getPurchaseById,
  getPurchaseItemsByPurchaseId,
  getWarehouses,
  createPurchasePayment,
  getPurchasePaymentsByPurchaseId,
  ensurePurchaseSchema,
};



