const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { ensurePurchaseSchema } = require('./PurchaseServices');
const { ensureInventorySchema, applyMovementBatch, resolveWarehouseId } = require('./InventoryServices');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let saleSchemaReady = false;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPositiveInt = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const minimum = fallback <= 0 ? 0 : 1;
  return Math.max(minimum, Math.trunc(parsed));
};

const normalizeSaleItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const quantity = toPositiveInt(item.quantity, 1);
    const unitPrice = toNumber(item.unit_price ?? item.price ?? 0, 0);
    const tax = toNumber(item.tax, 0);
    const discount = toNumber(item.discount, 0);
    const subtotal = Math.max(0, quantity * unitPrice + tax - discount);

    return {
      product_id: Number(item.product_id),
      quantity,
      unit_price: unitPrice,
      tax,
      discount,
      subtotal,
    };
  });
};

const ensureSaleSchema = async () => {
  if (saleSchemaReady) {
    return;
  }

  await ensurePurchaseSchema();

  await prisma.$executeRawUnsafe(`
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS warehouse_id INTEGER;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_tax NUMERIC(18,2) DEFAULT 0;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed';
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping NUMERIC(18,2) DEFAULT 0;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,2) DEFAULT 0;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(40) DEFAULT 'cash';
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    UPDATE sales
    SET
      total_amount = COALESCE(total_amount, total, 0),
      order_tax = COALESCE(order_tax, 0),
      discount_type = COALESCE(NULLIF(discount_type, ''), 'fixed'),
      shipping = COALESCE(shipping, 0),
      payment_mode = COALESCE(NULLIF(payment_mode, ''), 'cash'),
      warehouse_id = COALESCE(warehouse_id, (SELECT id FROM warehouses ORDER BY id LIMIT 1)),
      updated_at = COALESCE(updated_at, created_at, NOW());

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_sales_warehouse_id'
      ) THEN
        ALTER TABLE sales
        ADD CONSTRAINT fk_sales_warehouse_id
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
      END IF;
    END
    $$;

    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,2);
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount NUMERIC(18,2) DEFAULT 0;
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax NUMERIC(18,2) DEFAULT 0;
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(18,2);
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    UPDATE sale_items
    SET
      unit_price = COALESCE(unit_price, price, 0),
      subtotal = COALESCE(subtotal, total, 0),
      updated_at = COALESCE(updated_at, created_at, NOW());

    CREATE TABLE IF NOT EXISTS sale_payments (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payment_mode VARCHAR(40) NOT NULL DEFAULT 'cash',
      account_name VARCHAR(120),
      amount NUMERIC(18,2) NOT NULL,
      remarks TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await ensureInventorySchema();

  saleSchemaReady = true;
};

const validateStock = async (tx, normalizedItems, warehouseId, previousQtyByProduct = new Map()) => {
  const productIds = [...new Set(normalizedItems.map((item) => Number(item.product_id)).filter((value) => Number.isFinite(value) && value > 0))];

  if (productIds.length === 0) {
    throw new Error('At least one valid product is required');
  }

  const products = await tx.$queryRawUnsafe(
    `
      SELECT
        p.id,
        p.product_name,
        COALESCE(i.quantity_on_hand, 0) AS current_stock
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id AND i.warehouse_id = $2
      WHERE p.id = ANY($1::int[])
    `,
    productIds,
    Number(warehouseId)
  );

  const productById = new Map();
  products.forEach((product) => {
    productById.set(Number(product.id), product);
  });

  const stockIssues = [];

  normalizedItems.forEach((item) => {
    const productId = Number(item.product_id);
    const product = productById.get(productId);

    if (!product) {
      stockIssues.push(`Product ${productId} not found`);
      return;
    }

    const available = toNumber(product.current_stock, 0);
    const previousQty = previousQtyByProduct.get(productId) || 0;
    const requiredAdditional = Math.max(0, item.quantity - previousQty);

    if (requiredAdditional > available) {
      stockIssues.push(`${product.product_name}: only ${available} in stock at warehouse ${warehouseId}, requested additional ${requiredAdditional}`);
    }
  });

  if (stockIssues.length > 0) {
    const error = new Error(`Low stock: ${stockIssues.join('; ')}`);
    error.code = 'LOW_STOCK';
    throw error;
  }
};

const upsertSaleItems = async (tx, saleId, normalizedItems) => {
  await tx.$executeRaw`
    DELETE FROM sale_items
    WHERE sale_id = ${saleId}
  `;

  for (const item of normalizedItems) {
    await tx.$executeRaw`
      INSERT INTO sale_items (
        sale_id,
        product_id,
        quantity,
        price,
        total,
        unit_price,
        discount,
        tax,
        subtotal,
        created_at,
        updated_at
      ) VALUES (
        ${saleId},
        ${item.product_id},
        ${item.quantity},
        ${item.unit_price},
        ${item.subtotal},
        ${item.unit_price},
        ${item.discount},
        ${item.tax},
        ${item.subtotal},
        NOW(),
        NOW()
      )
    `;
  }
};

const createSale = async (saleData) => {
  await ensureSaleSchema();

  const normalizedItems = normalizeSaleItems(saleData.items);
  const orderTax = toNumber(saleData.order_tax, 0);
  const shipping = toNumber(saleData.shipping, 0);
  const discountInput = toNumber(saleData.discount, 0);
  const discountType = String(saleData.discount_type || 'fixed').toLowerCase() === 'percent' ? 'percent' : 'fixed';
  const totalAmount = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const orderDiscount = discountType === 'percent' ? (totalAmount * discountInput) / 100 : discountInput;
  const grandTotal = Math.max(0, totalAmount + orderTax + shipping - orderDiscount);
  const paid = Math.max(0, toNumber(saleData.paid, 0));
  const rest = Math.max(0, grandTotal - paid);
  const invoiceDate = saleData.invoice_date ? new Date(saleData.invoice_date) : new Date();
  const invoiceNo = String(saleData.invoice_no || '').trim() || `INV-${Date.now()}`;

  await prisma.$transaction(async (tx) => {
    const warehouseId = await resolveWarehouseId(tx, saleData.warehouse_id);
    await validateStock(tx, normalizedItems, warehouseId, new Map());

    const createdRows = await tx.$queryRaw`
      INSERT INTO sales (
        invoice_no,
        customer_id,
        warehouse_id,
        invoice_date,
        total,
        order_tax,
        discount,
        discount_type,
        shipping,
        total_amount,
        grand_total,
        paid,
        rest,
        payment_mode,
        notes,
        created_at,
        updated_at
      ) VALUES (
        ${invoiceNo},
        ${Number(saleData.customer_id)},
        ${warehouseId},
        ${invoiceDate},
        ${totalAmount},
        ${orderTax},
        ${discountInput},
        ${discountType},
        ${shipping},
        ${totalAmount},
        ${grandTotal},
        ${paid},
        ${rest},
        ${String(saleData.payment_mode || 'cash')},
        ${saleData.notes ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    const saleId = Number(createdRows[0].id);
    await upsertSaleItems(tx, saleId, normalizedItems);

    const nextQtyByProduct = new Map();
    normalizedItems.forEach((item) => {
      nextQtyByProduct.set(item.product_id, (nextQtyByProduct.get(item.product_id) || 0) + item.quantity);
    });

    await applyMovementBatch(
      tx,
      Array.from(nextQtyByProduct.entries()).map(([productId, qty]) => ({
        product_id: Number(productId),
        warehouse_id: warehouseId,
        delta: -Number(qty),
        movement_type: 'OUT',
        movement_quantity: Number(qty),
        reference_type: 'SALE',
        reference_id: saleId,
        note: `Sale ${invoiceNo}`,
      }))
    );
  });
};

const updateSale = async (id, saleData) => {
  await ensureSaleSchema();

  const saleId = Number(id);
  const normalizedItems = normalizeSaleItems(saleData.items);
  const orderTax = toNumber(saleData.order_tax, 0);
  const shipping = toNumber(saleData.shipping, 0);
  const discountInput = toNumber(saleData.discount, 0);
  const discountType = String(saleData.discount_type || 'fixed').toLowerCase() === 'percent' ? 'percent' : 'fixed';
  const totalAmount = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const orderDiscount = discountType === 'percent' ? (totalAmount * discountInput) / 100 : discountInput;
  const grandTotal = Math.max(0, totalAmount + orderTax + shipping - orderDiscount);
  const invoiceDate = saleData.invoice_date ? new Date(saleData.invoice_date) : new Date();
  const invoiceNo = String(saleData.invoice_no || '').trim() || `INV-${Date.now()}`;

  await prisma.$transaction(async (tx) => {
    const warehouseId = await resolveWarehouseId(tx, saleData.warehouse_id);

    const existingRows = await tx.$queryRaw`
      SELECT id, paid, warehouse_id
      FROM sales
      WHERE id = ${saleId}
      LIMIT 1
    `;

    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      throw new Error('Sale not found');
    }

    const existingItems = await tx.$queryRaw`
      SELECT product_id, quantity
      FROM sale_items
      WHERE sale_id = ${saleId}
    `;

    const previousQtyByProduct = new Map();
    existingItems.forEach((item) => {
      const productId = Number(item.product_id);
      const qty = toPositiveInt(item.quantity, 0);
      previousQtyByProduct.set(productId, (previousQtyByProduct.get(productId) || 0) + qty);
    });

    const existingWarehouseId = await resolveWarehouseId(tx, existingRows[0].warehouse_id);

    if (existingWarehouseId === warehouseId) {
      await validateStock(tx, normalizedItems, warehouseId, previousQtyByProduct);
    } else {
      await validateStock(tx, normalizedItems, warehouseId, new Map());
    }

    const nextQtyByProduct = new Map();
    normalizedItems.forEach((item) => {
      nextQtyByProduct.set(item.product_id, (nextQtyByProduct.get(item.product_id) || 0) + item.quantity);
    });

    const movementOps = [];
    const productIds = new Set([...previousQtyByProduct.keys(), ...nextQtyByProduct.keys()]);

    for (const productId of productIds) {
      const previousQty = previousQtyByProduct.get(productId) || 0;
      const nextQty = nextQtyByProduct.get(productId) || 0;

      if (existingWarehouseId === warehouseId) {
        const delta = previousQty - nextQty;
        if (delta !== 0) {
          movementOps.push({
            product_id: productId,
            warehouse_id: warehouseId,
            delta,
            movement_type: delta > 0 ? 'IN' : 'OUT',
            movement_quantity: Math.abs(delta),
            reference_type: 'SALE',
            reference_id: saleId,
            note: `Sale update ${invoiceNo}`,
          });
        }
      } else {
        if (previousQty > 0) {
          movementOps.push({
            product_id: productId,
            warehouse_id: existingWarehouseId,
            delta: previousQty,
            movement_type: 'IN',
            movement_quantity: previousQty,
            reference_type: 'SALE',
            reference_id: saleId,
            note: `Sale warehouse change return ${invoiceNo}`,
          });
        }

        if (nextQty > 0) {
          movementOps.push({
            product_id: productId,
            warehouse_id: warehouseId,
            delta: -nextQty,
            movement_type: 'OUT',
            movement_quantity: nextQty,
            reference_type: 'SALE',
            reference_id: saleId,
            note: `Sale warehouse change issue ${invoiceNo}`,
          });
        }
      }
    }

    await applyMovementBatch(tx, movementOps);
    await upsertSaleItems(tx, saleId, normalizedItems);

    const paid = Math.max(0, toNumber(saleData.paid, toNumber(existingRows[0].paid, 0)));
    const rest = Math.max(0, grandTotal - paid);

    await tx.$executeRaw`
      UPDATE sales
      SET
        invoice_no = ${invoiceNo},
        customer_id = ${Number(saleData.customer_id)},
        warehouse_id = ${warehouseId},
        invoice_date = ${invoiceDate},
        total = ${totalAmount},
        order_tax = ${orderTax},
        discount = ${discountInput},
        discount_type = ${discountType},
        shipping = ${shipping},
        total_amount = ${totalAmount},
        grand_total = ${grandTotal},
        paid = ${paid},
        rest = ${rest},
        payment_mode = ${String(saleData.payment_mode || 'cash')},
        notes = ${saleData.notes ?? null},
        updated_at = NOW()
      WHERE id = ${saleId}
    `;
  });
};

const deleteSale = async (id) => {
  await ensureSaleSchema();

  const saleId = Number(id);

  await prisma.$transaction(async (tx) => {
    const saleRows = await tx.$queryRaw`
      SELECT id, invoice_no, warehouse_id
      FROM sales
      WHERE id = ${saleId}
      LIMIT 1
    `;

    if (!Array.isArray(saleRows) || saleRows.length === 0) {
      throw new Error('Sale not found');
    }

    const itemRows = await tx.$queryRaw`
      SELECT product_id, quantity
      FROM sale_items
      WHERE sale_id = ${saleId}
    `;

    const warehouseId = await resolveWarehouseId(tx, saleRows[0].warehouse_id);

    await applyMovementBatch(
      tx,
      itemRows.map((row) => ({
        product_id: Number(row.product_id),
        warehouse_id: warehouseId,
        delta: toPositiveInt(row.quantity, 0),
        movement_type: 'IN',
        movement_quantity: toPositiveInt(row.quantity, 0),
        reference_type: 'SALE',
        reference_id: saleId,
        note: `Sale deleted ${saleRows[0].invoice_no}`,
      }))
    );

    await tx.$executeRaw`
      DELETE FROM sale_items
      WHERE sale_id = ${saleId}
    `;

    await tx.$executeRaw`
      DELETE FROM sales
      WHERE id = ${saleId}
    `;
  });
};

const getAllSales = async () => {
  await ensureSaleSchema();

  return prisma.$queryRaw`
    SELECT
      s.id,
      s.invoice_no,
      s.customer_id,
      c.full_name AS customer_name,
      s.warehouse_id,
      COALESCE(w.warehouse_name, 'main') AS warehouse_name,
      s.invoice_date,
      s.payment_mode,
      s.total,
      s.discount,
      s.discount_type,
      s.order_tax,
      s.shipping,
      s.total_amount,
      s.grand_total,
      s.paid,
      s.rest,
      s.notes,
      s.created_at
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    LEFT JOIN warehouses w ON w.id = s.warehouse_id
    ORDER BY s.id DESC
  `;
};

const getSaleById = async (id) => {
  await ensureSaleSchema();

  const sales = await prisma.$queryRaw`
    SELECT
      s.id,
      s.invoice_no,
      s.customer_id,
      c.full_name AS customer_name,
      s.warehouse_id,
      COALESCE(w.warehouse_name, 'main') AS warehouse_name,
      s.invoice_date,
      s.payment_mode,
      s.total,
      s.discount,
      s.discount_type,
      s.order_tax,
      s.shipping,
      s.total_amount,
      s.grand_total,
      s.paid,
      s.rest,
      s.notes,
      s.created_at
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    LEFT JOIN warehouses w ON w.id = s.warehouse_id
    WHERE s.id = ${Number(id)}
    LIMIT 1
  `;

  const sale = sales[0] || null;
  if (!sale) {
    return null;
  }

  const items = await getSaleItemsBySaleId(id);

  return {
    ...sale,
    items,
  };
};

const getSaleItemsBySaleId = async (id) => {
  await ensureSaleSchema();

  return prisma.$queryRaw`
    SELECT
      si.id,
      si.sale_id,
      si.product_id,
      p.product_name,
      COALESCE(NULLIF(p.product_barcode, ''), p.product_code) AS barcode,
      COALESCE(si.unit_price, si.price, 0) AS unit_price,
      COALESCE(inv.quantity_on_hand, 0) AS current_stock,
      si.quantity,
      COALESCE(si.discount, 0) AS discount,
      COALESCE(si.tax, 0) AS tax,
      COALESCE(si.subtotal, si.total, 0) AS subtotal
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    JOIN sales s ON s.id = si.sale_id
    LEFT JOIN inventory inv ON inv.product_id = si.product_id AND inv.warehouse_id = s.warehouse_id
    WHERE si.sale_id = ${Number(id)}
    ORDER BY si.id ASC
  `;
};

const createSalePayment = async (id, paymentData) => {
  await ensureSaleSchema();

  const saleId = Number(id);
  const amount = toNumber(paymentData.amount, 0);

  if (amount <= 0) {
    const error = new Error('Payment amount must be greater than 0');
    error.code = 'INVALID_PAYMENT';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const saleRows = await tx.$queryRaw`
      SELECT id, invoice_no, customer_id, grand_total, paid, rest
      FROM sales
      WHERE id = ${saleId}
      LIMIT 1
    `;

    if (!Array.isArray(saleRows) || saleRows.length === 0) {
      throw new Error('Sale not found');
    }

    const sale = saleRows[0];
    const currentDue = toNumber(sale.rest, 0);

    if (currentDue <= 0) {
      const error = new Error('Payment completed for this invoice');
      error.code = 'PAYMENT_COMPLETED';
      throw error;
    }

    if (amount > currentDue) {
      const error = new Error(`Amount exceeds due. Needed amount is ${currentDue.toFixed(2)}`);
      error.code = 'OVERPAY';
      error.meta = { due: currentDue };
      throw error;
    }

    const nextPaid = toNumber(sale.paid, 0) + amount;
    const nextRest = Math.max(0, toNumber(sale.grand_total, 0) - nextPaid);

    await tx.$executeRaw`
      UPDATE sales
      SET
        paid = ${nextPaid},
        rest = ${nextRest},
        payment_mode = ${String(paymentData.payment_mode || 'cash')},
        updated_at = NOW()
      WHERE id = ${saleId}
    `;

    await tx.$executeRaw`
      INSERT INTO sale_payments (
        sale_id,
        payment_date,
        payment_mode,
        account_name,
        amount,
        remarks,
        created_at
      ) VALUES (
        ${saleId},
        ${paymentData.payment_date ? new Date(paymentData.payment_date) : new Date()},
        ${String(paymentData.payment_mode || 'cash')},
        ${paymentData.account_name ? String(paymentData.account_name) : null},
        ${amount},
        ${paymentData.remarks ? String(paymentData.remarks) : null},
        NOW()
      )
    `;

    return {
      sale_id: saleId,
      invoice_no: String(sale.invoice_no),
      paid: nextPaid,
      due: nextRest,
      status: nextRest <= 0 ? 'completed' : 'partial',
    };
  });
};

const getSalePaymentsBySaleId = async (id) => {
  await ensureSaleSchema();

  const saleId = Number(id);
  const saleRows = await prisma.$queryRaw`
    SELECT id, invoice_no, customer_id, grand_total, paid, rest, created_at
    FROM sales
    WHERE id = ${saleId}
    LIMIT 1
  `;

  if (!Array.isArray(saleRows) || saleRows.length === 0) {
    throw new Error('Sale not found');
  }

  const sale = saleRows[0];

  const paymentRows = await prisma.$queryRaw`
    SELECT
      sp.id,
      sp.sale_id,
      sp.payment_date,
      CONCAT('INV/SL-', s.invoice_no) AS reference,
      sp.payment_mode,
      sp.account_name,
      sp.amount,
      sp.remarks,
      sp.created_at
    FROM sale_payments sp
    JOIN sales s ON s.id = sp.sale_id
    WHERE sp.sale_id = ${saleId}
    ORDER BY sp.payment_date DESC, sp.id DESC
  `;

  return {
    sale: {
      id: Number(sale.id),
      invoice_no: String(sale.invoice_no),
      grand_total: toNumber(sale.grand_total, 0),
      paid: toNumber(sale.paid, 0),
      due: toNumber(sale.rest, 0),
      status: toNumber(sale.rest, 0) <= 0 ? 'paid' : toNumber(sale.paid, 0) > 0 ? 'partial' : 'unpaid',
    },
    payments: paymentRows,
  };
};

module.exports = {
  ensureSaleSchema,
  createSale,
  updateSale,
  deleteSale,
  getAllSales,
  getSaleById,
  getSaleItemsBySaleId,
  createSalePayment,
  getSalePaymentsBySaleId,
};



