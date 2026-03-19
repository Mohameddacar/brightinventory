const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { ensurePurchaseSchema } = require('./PurchaseServices');
const { ensureSaleSchema } = require('./SaleServices');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatTrendPercent = (current, previous) => {
  const currentValue = toNumber(current, 0);
  const previousValue = toNumber(previous, 0);

  if (previousValue === 0) {
    if (currentValue === 0) {
      return '0%';
    }

    return '+100%';
  }

  const diff = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  const rounded = Math.round(diff * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
};

const formatCurrencyCompact = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(toNumber(value, 0));
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(toNumber(value, 0));
};

const formatInteger = (value) => {
  return new Intl.NumberFormat('en-US').format(toNumber(value, 0));
};

const getDashboardOverview = async () => {
  await ensurePurchaseSchema();
  await ensureSaleSchema();

  const [
    salesDailyRows,
    purchaseTrendRows,
    customerTrendRows,
    inventoryRows,
    lowStockRows,
    salesSeriesRows,
    topSellingRows,
    stockByCategoryRows,
    inventoryAlertRows,
    activityRows,
    fallbackActivityRows,
  ] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN DATE(invoice_date) = CURRENT_DATE THEN grand_total END), 0) AS sales_today,
        COALESCE(SUM(CASE WHEN DATE(invoice_date) = CURRENT_DATE - INTERVAL '1 day' THEN grand_total END), 0) AS sales_yesterday,
        COALESCE(SUM(grand_total), 0) AS sales_total
      FROM sales
    `,
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN purchase_date >= CURRENT_DATE - INTERVAL '30 day' THEN 1 END), 0) AS purchases_last_30,
        COALESCE(SUM(CASE WHEN purchase_date >= CURRENT_DATE - INTERVAL '60 day' AND purchase_date < CURRENT_DATE - INTERVAL '30 day' THEN 1 END), 0) AS purchases_prev_30,
        COUNT(*) AS purchases_total
      FROM purchases
    `,
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN registered_date >= CURRENT_DATE - INTERVAL '30 day' THEN 1 END), 0) AS customers_last_30,
        COALESCE(SUM(CASE WHEN registered_date >= CURRENT_DATE - INTERVAL '60 day' AND registered_date < CURRENT_DATE - INTERVAL '30 day' THEN 1 END), 0) AS customers_prev_30,
        COUNT(*) AS customers_total
      FROM customers
    `,
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(COALESCE(p.current_stock, p.opening_quantity, 0) * COALESCE(p.cost_price, p.purchase_cost, 0)), 0) AS inventory_value,
        COALESCE(SUM(COALESCE(p.opening_quantity, 0) * COALESCE(p.cost_price, p.purchase_cost, 0)), 0) AS inventory_opening_value
      FROM products p
    `,
    prisma.$queryRaw`
      SELECT
        COUNT(*) AS low_stock_total,
        COALESCE(SUM(CASE WHEN COALESCE(p.current_stock, p.opening_quantity, 0) <= (GREATEST(COALESCE(NULLIF(p.stock_alert, 0), p.minimum_sale_quantity, p.reorder_level, 0), 1) / 2) THEN 1 ELSE 0 END), 0) AS low_stock_critical
      FROM products p
      WHERE COALESCE(p.current_stock, p.opening_quantity, 0) <= GREATEST(COALESCE(NULLIF(p.stock_alert, 0), p.minimum_sale_quantity, p.reorder_level, 0), 1)
    `,
    prisma.$queryRaw`
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, INTERVAL '1 day')::date AS day
      )
      SELECT
        days.day,
        TO_CHAR(days.day, 'Dy') AS day_label,
        COALESCE(SUM(s.grand_total), 0) AS sales
      FROM days
      LEFT JOIN sales s ON DATE(s.invoice_date) = days.day
      GROUP BY days.day
      ORDER BY days.day ASC
    `,
    prisma.$queryRaw`
      SELECT
        p.product_name,
        COALESCE(SUM(si.quantity), 0) AS quantity_sold
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      GROUP BY p.id, p.product_name
      ORDER BY quantity_sold DESC, p.product_name ASC
      LIMIT 4
    `,
    prisma.$queryRaw`
      SELECT
        COALESCE(c.category_name, 'Uncategorized') AS category_name,
        COALESCE(SUM(COALESCE(p.current_stock, p.opening_quantity, 0)), 0) AS total_items
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      GROUP BY COALESCE(c.category_name, 'Uncategorized')
      ORDER BY total_items DESC, category_name ASC
    `,
    prisma.$queryRaw`
      SELECT
        p.product_name,
        COALESCE(NULLIF(p.product_code, ''), CONCAT('SKU-', p.id::text)) AS sku,
        COALESCE(w.warehouse_name, 'Main Hub') AS warehouse,
        COALESCE(p.current_stock, p.opening_quantity, 0) AS current_stock,
        GREATEST(COALESCE(NULLIF(p.stock_alert, 0), p.minimum_sale_quantity, p.reorder_level, 0), 1) AS threshold
      FROM products p
      LEFT JOIN LATERAL (
        SELECT pu.warehouse_id
        FROM purchase_items pi
        JOIN purchases pu ON pu.id = pi.purchase_id
        WHERE pi.product_id = p.id
        ORDER BY pu.purchase_date DESC, pu.id DESC
        LIMIT 1
      ) pw ON TRUE
      LEFT JOIN warehouses w ON w.id = pw.warehouse_id
      WHERE COALESCE(p.current_stock, p.opening_quantity, 0) <= GREATEST(COALESCE(NULLIF(p.stock_alert, 0), p.minimum_sale_quantity, p.reorder_level, 0), 1)
      ORDER BY (COALESCE(p.current_stock, p.opening_quantity, 0)::numeric / NULLIF(GREATEST(COALESCE(NULLIF(p.stock_alert, 0), p.minimum_sale_quantity, p.reorder_level, 0), 1), 0)) ASC, p.product_name ASC
      LIMIT 8
    `,
    prisma.$queryRaw`
      SELECT
        a.id,
        a.action,
        a.table_name,
        a.record_id,
        a.created_at,
        COALESCE(u.name, 'System') AS user_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 6
    `,
    prisma.$queryRaw`
      (
        SELECT
          'Sale created' AS action,
          'sales' AS table_name,
          s.id AS record_id,
          s.created_at,
          COALESCE(c.full_name, 'Walk-in Customer') AS user_name
        FROM sales s
        LEFT JOIN customers c ON c.id = s.customer_id
        ORDER BY s.created_at DESC
        LIMIT 3
      )
      UNION ALL
      (
        SELECT
          'Purchase created' AS action,
          'purchases' AS table_name,
          p.id AS record_id,
          p.created_at,
          COALESCE(sp.full_name, 'Supplier') AS user_name
        FROM purchases p
        LEFT JOIN suppliers sp ON sp.id = p.supplier_id
        ORDER BY p.created_at DESC
        LIMIT 3
      )
      ORDER BY created_at DESC
      LIMIT 6
    `,
  ]);

  const salesDaily = salesDailyRows[0] || {};
  const purchaseTrend = purchaseTrendRows[0] || {};
  const customerTrend = customerTrendRows[0] || {};
  const inventory = inventoryRows[0] || {};
  const lowStock = lowStockRows[0] || {};

  const salesToday = toNumber(salesDaily.sales_today, 0);
  const salesYesterday = toNumber(salesDaily.sales_yesterday, 0);

  const purchasesLast30 = toNumber(purchaseTrend.purchases_last_30, 0);
  const purchasesPrev30 = toNumber(purchaseTrend.purchases_prev_30, 0);
  const purchasesTotal = toNumber(purchaseTrend.purchases_total, 0);

  const customersLast30 = toNumber(customerTrend.customers_last_30, 0);
  const customersPrev30 = toNumber(customerTrend.customers_prev_30, 0);
  const customersTotal = toNumber(customerTrend.customers_total, 0);

  const inventoryValue = toNumber(inventory.inventory_value, 0);
  const inventoryOpeningValue = toNumber(inventory.inventory_opening_value, 0);

  const lowStockTotal = toNumber(lowStock.low_stock_total, 0);
  const lowStockCritical = toNumber(lowStock.low_stock_critical, 0);

  const totalProfitRows = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM((COALESCE(si.unit_price, si.price, 0) - COALESCE(p.cost_price, p.purchase_cost, 0)) * COALESCE(si.quantity, 0)), 0) AS total_profit,
      COALESCE(SUM(CASE WHEN DATE(s.invoice_date) = CURRENT_DATE THEN (COALESCE(si.unit_price, si.price, 0) - COALESCE(p.cost_price, p.purchase_cost, 0)) * COALESCE(si.quantity, 0) END), 0) AS profit_today,
      COALESCE(SUM(CASE WHEN DATE(s.invoice_date) = CURRENT_DATE - INTERVAL '1 day' THEN (COALESCE(si.unit_price, si.price, 0) - COALESCE(p.cost_price, p.purchase_cost, 0)) * COALESCE(si.quantity, 0) END), 0) AS profit_yesterday
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    JOIN sales s ON s.id = si.sale_id
  `;

  const profitSummary = totalProfitRows[0] || {};
  const totalProfit = toNumber(profitSummary.total_profit, 0);
  const profitToday = toNumber(profitSummary.profit_today, 0);
  const profitYesterday = toNumber(profitSummary.profit_yesterday, 0);

  const summaryCards = [
    {
      key: 'sales_today',
      title: 'Sales Today',
      value: formatCurrency(salesToday),
      trend: formatTrendPercent(salesToday, salesYesterday),
      tone: salesToday >= salesYesterday ? 'success' : 'danger',
    },
    {
      key: 'total_purchases',
      title: 'Total Purchases',
      value: formatInteger(purchasesTotal),
      trend: formatTrendPercent(purchasesLast30, purchasesPrev30),
      tone: purchasesLast30 >= purchasesPrev30 ? 'success' : 'warning',
    },
    {
      key: 'inventory_value',
      title: 'Inventory Value',
      value: formatCurrencyCompact(inventoryValue),
      trend: formatTrendPercent(inventoryValue, inventoryOpeningValue),
      tone: inventoryValue >= inventoryOpeningValue ? 'info' : 'warning',
    },
    {
      key: 'low_stock_items',
      title: 'Low Stock Items',
      value: formatInteger(lowStockTotal),
      trend: `+${formatInteger(lowStockCritical)}`,
      tone: lowStockTotal > 0 ? 'danger' : 'success',
    },
    {
      key: 'total_customers',
      title: 'Total Customers',
      value: formatInteger(customersTotal),
      trend: formatTrendPercent(customersLast30, customersPrev30),
      tone: customersLast30 >= customersPrev30 ? 'success' : 'warning',
    },
    {
      key: 'total_profit',
      title: 'Total Profit',
      value: formatCurrency(totalProfit),
      trend: formatTrendPercent(profitToday, profitYesterday),
      tone: profitToday >= profitYesterday ? 'success' : 'danger',
    },
  ];

  const weeklySales = salesSeriesRows.map((row) => ({
    day: String(row.day_label || '').trim() || 'N/A',
    sales: toNumber(row.sales, 0),
  }));

  const maxTopSellingQuantity = Math.max(...topSellingRows.map((row) => toNumber(row.quantity_sold, 0)), 0);
  const topSellingProducts = topSellingRows.map((row) => {
    const qty = toNumber(row.quantity_sold, 0);
    const percent = maxTopSellingQuantity > 0 ? Math.round((qty / maxTopSellingQuantity) * 100) : 0;
    return {
      name: String(row.product_name || 'Product'),
      quantity: qty,
      percent,
    };
  });

  const stockCategorySource = stockByCategoryRows.map((row) => ({
    name: String(row.category_name || 'Uncategorized'),
    value: Math.max(0, toNumber(row.total_items, 0)),
  }));

  const topCategories = stockCategorySource.slice(0, 3);
  const othersValue = stockCategorySource.slice(3).reduce((sum, item) => sum + item.value, 0);
  if (othersValue > 0) {
    topCategories.push({ name: 'Others', value: othersValue });
  }

  const colorPalette = ['#3B82F6', '#0EA5E9', '#F59E0B', '#94A3B8'];
  const stockDistribution = topCategories.map((item, index) => ({
    ...item,
    fill: colorPalette[index] || '#94A3B8',
  }));

  const totalStockItems = stockDistribution.reduce((sum, item) => sum + item.value, 0);

  const inventoryAlerts = inventoryAlertRows.map((row) => ({
    productName: String(row.product_name || 'Product'),
    sku: String(row.sku || ''),
    warehouse: String(row.warehouse || 'Main Hub'),
    currentStock: `${formatInteger(row.current_stock)} / ${formatInteger(row.threshold)}`,
    status: 'LOW STOCK',
  }));

  const recentActivitySource = activityRows.length > 0 ? activityRows : fallbackActivityRows;
  const recentActivity = recentActivitySource.map((row) => ({
    text: `${String(row.user_name || 'User')} ${String(row.action || 'updated')} ${String(row.table_name || 'record')} #${toNumber(row.record_id, 0)}`,
    time: row.created_at,
    type: /create|add|insert|approve/i.test(String(row.action || '')) ? 'success' : 'info',
  }));

  return {
    summaryCards,
    weeklySales,
    topSellingProducts,
    stockDistribution,
    totalStockItems,
    inventoryAlerts,
    recentActivity,
  };
};

module.exports = {
  getDashboardOverview,
};
