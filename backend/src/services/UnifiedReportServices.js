const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const { ensurePurchaseSchema } = require('./PurchaseServices');
const { ensureSaleSchema } = require('./SaleServices');
const transferService = require('./TransferServices');
const reportLogService = require('./ReportLogServices');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const REPORT_TYPES = new Set([
  'sales',
  'purchases',
  'customers',
  'suppliers',
  'products',
  'expenses',
  'inventory',
  'company',
  'deposits',
  'transactions',
  'closing',
]);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asDateString = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const inDateRange = (value, fromDate, toDate) => {
  if (!fromDate && !toDate) {
    return true;
  }

  const current = asDateString(value);
  if (!current) {
    return false;
  }

  if (fromDate && current < fromDate) {
    return false;
  }

  if (toDate && current > toDate) {
    return false;
  }

  return true;
};

const paymentStatusByDue = (due) => (toNumber(due) <= 0 ? 'Paid' : 'Due');

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(toNumber(value));
};

const formatCompactCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(toNumber(value));
};

const formatInteger = (value) => {
  return new Intl.NumberFormat('en-US').format(toNumber(value));
};

const parseDepositAccount = (remarks) => {
  const content = String(remarks || '');
  const match = content.match(/account\s*[:=-]\s*([^,;]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  return 'Cash';
};

const reportTitle = (reportType) => {
  const map = {
    sales: 'Sales Report',
    purchases: 'Purchases Report',
    customers: 'Customer Report',
    suppliers: 'Supplier Report',
    products: 'Product Report',
    expenses: 'Expense Report',
    inventory: 'Inventory Report',
    company: 'Company Report',
    deposits: 'Deposit Report',
    transactions: 'Transaction Report',
    closing: 'Closing Report',
  };

  return map[reportType] || 'Report';
};

const normalizeQueryOptions = (query) => {
  const reportType = String(query?.reportType || 'sales').trim().toLowerCase();

  if (!REPORT_TYPES.has(reportType)) {
    const error = new Error(`Unsupported reportType: ${reportType}`);
    error.code = 'INVALID_REPORT_TYPE';
    throw error;
  }

  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query?.limit) || 10));

  const normalized = {
    reportType,
    fromDate: String(query?.fromDate || '').trim(),
    toDate: String(query?.toDate || '').trim(),
    search: String(query?.search || '').trim().toLowerCase(),
    sortKey: String(query?.sortKey || '').trim(),
    sortDir: String(query?.sortDir || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc',
    page,
    limit,
    filters: {
      customer: String(query?.customer || '').trim(),
      paymentStatus: String(query?.paymentStatus || '').trim(),
      supplier: String(query?.supplier || '').trim(),
      status: String(query?.status || '').trim(),
      category: String(query?.category || '').trim(),
      expenseType: String(query?.expenseType || '').trim(),
      warehouse: String(query?.warehouse || '').trim(),
      account: String(query?.account || '').trim(),
      type: String(query?.type || '').trim(),
      period: String(query?.period || '').trim(),
    },
  };

  return normalized;
};

const fetchStore = async () => {
  await ensurePurchaseSchema();
  await ensureSaleSchema();
  await transferService.getWarehouses();

  const [
    sales,
    purchases,
    customers,
    suppliers,
    products,
    categories,
    expenses,
    expenseTypes,
    accounts,
    companies,
    deposits,
    closings,
    warehouses,
  ] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        s.id,
        s.invoice_no,
        s.customer_id,
        COALESCE(c.full_name, 'Walk-in Customer') AS customer_name,
        s.invoice_date,
        s.total,
        s.discount,
        s.grand_total,
        s.paid,
        s.rest
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      ORDER BY s.id DESC
    `,
    prisma.$queryRaw`
      SELECT
        p.id,
        p.transaction_number,
        p.supplier_id,
        COALESCE(sp.full_name, sp.supplier_name, 'Supplier') AS supplier_name,
        p.purchase_date,
        p.total,
        p.grand_total,
        p.paid,
        p.rest
      FROM purchases p
      LEFT JOIN suppliers sp ON sp.id = p.supplier_id
      ORDER BY p.id DESC
    `,
    prisma.$queryRaw`
      SELECT
        id,
        full_name,
        mobile_no,
        opening_balance,
        balance_type,
        registered_date
      FROM customers
      ORDER BY id DESC
    `,
    prisma.$queryRaw`
      SELECT
        id,
        full_name,
        supplier_name,
        mobile_no,
        email,
        opening_balance,
        balance_type,
        registered_date
      FROM suppliers
      ORDER BY id DESC
    `,
    prisma.$queryRaw`
      SELECT
        p.id,
        p.category_id,
        c.category_name,
        p.product_code,
        p.product_name,
        p.opening_quantity,
        COALESCE(p.current_stock, p.opening_quantity, 0) AS current_stock,
        COALESCE(p.selling_price, p.sale_cost, 0) AS selling_price,
        COALESCE(p.cost_price, p.purchase_cost, 0) AS cost_price,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.id DESC
    `,
    prisma.$queryRaw`
      SELECT id, category_name
      FROM categories
      ORDER BY category_name ASC
    `,
    prisma.$queryRaw`
      SELECT
        eb.id,
        eb.expense_type_id,
        eb.receiver_name,
        eb.amount,
        eb.invoice_date
      FROM expense_bills eb
      ORDER BY eb.id DESC
    `,
    prisma.$queryRaw`
      SELECT id, type_name
      FROM expense_types
      ORDER BY type_name ASC
    `,
    prisma.$queryRaw`
      SELECT id, account_name
      FROM accounts
      ORDER BY account_name ASC
    `,
    prisma.$queryRaw`
      SELECT
        id,
        company_name,
        address,
        contact,
        email,
        created_at
      FROM companies
      ORDER BY id DESC
    `,
    prisma.$queryRaw`
      SELECT id, amount, deposit_date, remarks
      FROM cash_deposits
      ORDER BY id DESC
    `,
    prisma.$queryRaw`
      SELECT id, closing_date, total_sales, total_expense, cash_balance
      FROM transaction_closing
      ORDER BY id DESC
    `,
    prisma.$queryRaw`
      SELECT id, warehouse_name
      FROM warehouses
      ORDER BY warehouse_name ASC
    `,
  ]);

  let transfers = [];
  try {
    const transferResult = await transferService.getTransfers({ page: 1, limit: 1000, search: '' });
    transfers = Array.isArray(transferResult?.data) ? transferResult.data : [];
  } catch {
    transfers = [];
  }

  return {
    sales,
    purchases,
    customers,
    suppliers,
    products,
    categories,
    expenses,
    expenseTypes,
    accounts,
    companies,
    deposits,
    closings,
    warehouses,
    transfers,
  };
};

const computeFilterDefinitions = (reportType, store) => {
  switch (reportType) {
    case 'sales':
      return [
        {
          key: 'customer',
          label: 'Customer',
          options: Array.from(new Map(store.sales.map((row) => [String(row.customer_id), String(row.customer_name)])).entries())
            .map(([value, label]) => ({ value, label })),
        },
        {
          key: 'paymentStatus',
          label: 'Payment Status',
          options: [
            { value: 'Paid', label: 'Paid' },
            { value: 'Due', label: 'Due' },
          ],
        },
      ];
    case 'purchases':
      return [
        {
          key: 'supplier',
          label: 'Supplier',
          options: Array.from(new Map(store.purchases.map((row) => [String(row.supplier_id), String(row.supplier_name)])).entries())
            .map(([value, label]) => ({ value, label })),
        },
      ];
    case 'customers':
    case 'suppliers':
      return [
        {
          key: 'status',
          label: 'Status',
          options: [
            { value: 'credit', label: 'Credit' },
            { value: 'debit', label: 'Debit' },
            { value: 'none', label: 'None' },
          ],
        },
      ];
    case 'products':
      return [
        {
          key: 'category',
          label: 'Category',
          options: store.categories.map((row) => ({ value: String(row.id), label: String(row.category_name) })),
        },
      ];
    case 'expenses':
      return [
        {
          key: 'expenseType',
          label: 'Expense Type',
          options: store.expenseTypes.map((row) => ({ value: String(row.id), label: String(row.type_name) })),
        },
      ];
    case 'inventory':
      return [
        {
          key: 'warehouse',
          label: 'Warehouse',
          options: store.warehouses.map((row) => ({ value: String(row.id), label: String(row.warehouse_name) })),
        },
      ];
    case 'deposits':
      return [
        {
          key: 'account',
          label: 'Account',
          options: store.accounts.map((row) => ({ value: String(row.account_name), label: String(row.account_name) })),
        },
      ];
    case 'transactions':
      return [
        {
          key: 'type',
          label: 'Type',
          options: ['Sale', 'Purchase', 'Expense', 'Deposit', 'Transfer'].map((typeValue) => ({ value: typeValue, label: typeValue })),
        },
      ];
    case 'closing':
      return [
        {
          key: 'period',
          label: 'Period',
          options: ['daily', 'monthly', 'yearly'].map((periodValue) => ({
            value: periodValue,
            label: periodValue.charAt(0).toUpperCase() + periodValue.slice(1),
          })),
        },
      ];
    default:
      return [];
  }
};

const buildReportRows = (reportType, store, options) => {
  const { fromDate, toDate, filters } = options;

  if (reportType === 'sales') {
    const rows = store.sales
      .filter((row) => inDateRange(row.invoice_date, fromDate, toDate))
      .filter((row) => (filters.customer && filters.customer !== 'all' ? String(row.customer_id) === filters.customer : true))
      .map((row) => {
        const remaining = toNumber(row.rest);
        return {
          invoiceNumber: row.invoice_no,
          customer: row.customer_name,
          invoiceDate: asDateString(row.invoice_date),
          total: toNumber(row.total),
          discount: toNumber(row.discount),
          grandTotal: toNumber(row.grand_total),
          paid: toNumber(row.paid),
          remaining,
          status: paymentStatusByDue(remaining),
        };
      })
      .filter((row) => (filters.paymentStatus && filters.paymentStatus !== 'all' ? row.status === filters.paymentStatus : true));

    return {
      columns: [
        { key: 'invoiceNumber', label: 'Invoice Number' },
        { key: 'customer', label: 'Customer' },
        { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
        { key: 'total', label: 'Total', type: 'currency' },
        { key: 'discount', label: 'Discount', type: 'currency' },
        { key: 'grandTotal', label: 'Grand Total', type: 'currency' },
        { key: 'paid', label: 'Paid', type: 'currency' },
        { key: 'remaining', label: 'Remaining', type: 'currency' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows,
      summary: [
        { label: 'Total Sales', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.grandTotal), 0)), tone: 'primary' },
        { label: 'Total Paid', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.paid), 0)), tone: 'success' },
        { label: 'Total Due', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.remaining), 0)), tone: 'danger' },
      ],
    };
  }

  if (reportType === 'purchases') {
    const rows = store.purchases
      .filter((row) => inDateRange(row.purchase_date, fromDate, toDate))
      .filter((row) => (filters.supplier && filters.supplier !== 'all' ? String(row.supplier_id) === filters.supplier : true))
      .map((row) => {
        const due = toNumber(row.rest);
        return {
          purchaseId: row.transaction_number,
          supplier: row.supplier_name,
          date: asDateString(row.purchase_date),
          totalCost: toNumber(row.grand_total || row.total),
          paid: toNumber(row.paid),
          due,
          status: paymentStatusByDue(due),
        };
      });

    return {
      columns: [
        { key: 'purchaseId', label: 'Purchase ID' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'totalCost', label: 'Total Cost', type: 'currency' },
        { key: 'paid', label: 'Paid', type: 'currency' },
        { key: 'due', label: 'Due', type: 'currency' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows,
      summary: [
        { label: 'Total Purchases', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.totalCost), 0)), tone: 'primary' },
        { label: 'Paid', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.paid), 0)), tone: 'success' },
        { label: 'Outstanding', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.due), 0)), tone: 'danger' },
      ],
    };
  }

  if (reportType === 'customers') {
    const salesByCustomer = store.sales.reduce((acc, row) => {
      const id = Number(row.customer_id);
      const current = acc[id] || { orders: 0, spent: 0 };
      acc[id] = {
        orders: current.orders + 1,
        spent: current.spent + toNumber(row.grand_total),
      };
      return acc;
    }, {});

    const rows = store.customers
      .filter((row) => inDateRange(row.registered_date, fromDate, toDate))
      .filter((row) => (filters.status && filters.status !== 'all' ? String(row.balance_type || 'none') === filters.status : true))
      .map((row) => {
        const aggregate = salesByCustomer[row.id] || { orders: 0, spent: 0 };
        return {
          customerName: row.full_name,
          phone: row.mobile_no || '-',
          totalOrders: aggregate.orders,
          totalSpent: aggregate.spent,
          balance: toNumber(row.opening_balance),
        };
      });

    return {
      columns: [
        { key: 'customerName', label: 'Customer Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'totalOrders', label: 'Total Orders', type: 'number' },
        { key: 'totalSpent', label: 'Total Spent', type: 'currency' },
        { key: 'balance', label: 'Balance', type: 'currency' },
      ],
      rows,
      summary: [
        { label: 'Total Customers', value: formatInteger(rows.length), tone: 'primary' },
        { label: 'Total Orders', value: formatInteger(rows.reduce((sum, row) => sum + toNumber(row.totalOrders), 0)), tone: 'primary' },
        { label: 'Total Spent', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.totalSpent), 0)), tone: 'success' },
        { label: 'Balance', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.balance), 0)), tone: 'warning' },
      ],
    };
  }

  if (reportType === 'suppliers') {
    const purchasesBySupplier = store.purchases.reduce((acc, row) => {
      const id = Number(row.supplier_id);
      const current = acc[id] || { count: 0, paid: 0, due: 0 };
      acc[id] = {
        count: current.count + 1,
        paid: current.paid + toNumber(row.paid),
        due: current.due + toNumber(row.rest),
      };
      return acc;
    }, {});

    const rows = store.suppliers
      .filter((row) => inDateRange(row.registered_date, fromDate, toDate))
      .filter((row) => (filters.status && filters.status !== 'all' ? String(row.balance_type || 'none') === filters.status : true))
      .map((row) => {
        const aggregate = purchasesBySupplier[row.id] || { count: 0, paid: 0, due: 0 };
        return {
          supplierName: row.full_name || row.supplier_name || `Supplier #${row.id}`,
          contact: row.mobile_no || row.email || '-',
          totalPurchases: aggregate.count,
          amountPaid: aggregate.paid,
          dueAmount: aggregate.due,
        };
      });

    return {
      columns: [
        { key: 'supplierName', label: 'Supplier Name' },
        { key: 'contact', label: 'Contact' },
        { key: 'totalPurchases', label: 'Total Purchases', type: 'number' },
        { key: 'amountPaid', label: 'Amount Paid', type: 'currency' },
        { key: 'dueAmount', label: 'Due Amount', type: 'currency' },
      ],
      rows,
      summary: [
        { label: 'Suppliers', value: formatInteger(rows.length), tone: 'primary' },
        { label: 'Purchases', value: formatInteger(rows.reduce((sum, row) => sum + toNumber(row.totalPurchases), 0)), tone: 'primary' },
        { label: 'Amount Paid', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.amountPaid), 0)), tone: 'success' },
        { label: 'Due Amount', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.dueAmount), 0)), tone: 'danger' },
      ],
    };
  }

  if (reportType === 'products') {
    const categoryNameById = new Map(store.categories.map((row) => [Number(row.id), String(row.category_name)]));

    const rows = store.products
      .filter((row) => inDateRange(row.created_at, fromDate, toDate))
      .filter((row) => (filters.category && filters.category !== 'all' ? String(row.category_id || '') === filters.category : true))
      .map((row) => {
        const stock = toNumber(row.current_stock || row.opening_quantity);
        const price = toNumber(row.selling_price);
        return {
          productName: row.product_name,
          sku: row.product_code || `SKU-${row.id}`,
          category: row.category_name || categoryNameById.get(Number(row.category_id)) || 'Uncategorized',
          stock,
          price,
          value: stock * price,
        };
      });

    return {
      columns: [
        { key: 'productName', label: 'Product Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'category', label: 'Category' },
        { key: 'stock', label: 'Stock', type: 'number' },
        { key: 'price', label: 'Price', type: 'currency' },
        { key: 'value', label: 'Value', type: 'currency' },
      ],
      rows,
      summary: [
        { label: 'Total Products', value: formatInteger(rows.length), tone: 'primary' },
        { label: 'Stock Value', value: formatCompactCurrency(rows.reduce((sum, row) => sum + toNumber(row.value), 0)), tone: 'primary' },
        { label: 'Total Stock', value: formatInteger(rows.reduce((sum, row) => sum + toNumber(row.stock), 0)), tone: 'success' },
      ],
    };
  }

  if (reportType === 'expenses') {
    const typeMap = new Map(store.expenseTypes.map((row) => [Number(row.id), String(row.type_name)]));

    const rows = store.expenses
      .filter((row) => inDateRange(row.invoice_date, fromDate, toDate))
      .filter((row) => (filters.expenseType && filters.expenseType !== 'all' ? String(row.expense_type_id) === filters.expenseType : true))
      .map((row) => ({
        expenseName: row.receiver_name,
        category: typeMap.get(Number(row.expense_type_id)) || 'General',
        amount: toNumber(row.amount),
        date: asDateString(row.invoice_date),
      }));

    return {
      columns: [
        { key: 'expenseName', label: 'Expense Name' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount', type: 'currency' },
        { key: 'date', label: 'Date', type: 'date' },
      ],
      rows,
      summary: [
        { label: 'Total Expenses', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.amount), 0)), tone: 'danger' },
        { label: 'Entries', value: formatInteger(rows.length), tone: 'primary' },
      ],
    };
  }

  if (reportType === 'inventory') {
    const defaultWarehouse = store.warehouses[0] ? store.warehouses[0].warehouse_name : 'Main Hub';
    const selectedWarehouse = filters.warehouse && filters.warehouse !== 'all'
      ? (store.warehouses.find((row) => String(row.id) === filters.warehouse) || {}).warehouse_name || defaultWarehouse
      : defaultWarehouse;

    const rows = store.products
      .filter((row) => inDateRange(row.created_at, fromDate, toDate))
      .map((row) => {
        const stockIn = toNumber(row.opening_quantity);
        const balance = toNumber(row.current_stock || row.opening_quantity);
        return {
          product: row.product_name,
          warehouse: selectedWarehouse,
          stockIn,
          stockOut: Math.max(0, stockIn - balance),
          balance,
        };
      });

    return {
      columns: [
        { key: 'product', label: 'Product' },
        { key: 'warehouse', label: 'Warehouse' },
        { key: 'stockIn', label: 'Stock In', type: 'number' },
        { key: 'stockOut', label: 'Stock Out', type: 'number' },
        { key: 'balance', label: 'Balance', type: 'number' },
      ],
      rows,
      summary: [
        { label: 'Total Products', value: formatInteger(rows.length), tone: 'primary' },
        { label: 'Total Balance', value: formatInteger(rows.reduce((sum, row) => sum + toNumber(row.balance), 0)), tone: 'success' },
        {
          label: 'Total Value',
          value: formatCompactCurrency(store.products.reduce((sum, row) => sum + toNumber(row.current_stock || row.opening_quantity) * toNumber(row.selling_price), 0)),
          tone: 'primary',
        },
      ],
    };
  }

  if (reportType === 'company') {
    const rows = store.companies
      .filter((row) => inDateRange(row.created_at, fromDate, toDate))
      .map((row) => ({
        companyName: row.company_name,
        address: row.address || '-',
        contact: row.contact || '-',
        email: row.email || '-',
        createdDate: asDateString(row.created_at),
      }));

    return {
      columns: [
        { key: 'companyName', label: 'Company Name' },
        { key: 'address', label: 'Address' },
        { key: 'contact', label: 'Contact' },
        { key: 'email', label: 'Email' },
        { key: 'createdDate', label: 'Created', type: 'date' },
      ],
      rows,
      summary: [
        { label: 'Total Companies', value: formatInteger(rows.length), tone: 'primary' },
        { label: 'With Email', value: formatInteger(rows.filter((row) => row.email !== '-').length), tone: 'success' },
        { label: 'With Contact', value: formatInteger(rows.filter((row) => row.contact !== '-').length), tone: 'primary' },
      ],
    };
  }

  if (reportType === 'deposits') {
    const rows = store.deposits
      .filter((row) => inDateRange(row.deposit_date, fromDate, toDate))
      .map((row) => ({
        account: parseDepositAccount(row.remarks),
        amount: toNumber(row.amount),
        date: asDateString(row.deposit_date),
        reference: row.remarks || `DEP-${row.id}`,
      }))
      .filter((row) => (filters.account && filters.account !== 'all' ? row.account === filters.account : true));

    return {
      columns: [
        { key: 'account', label: 'Account' },
        { key: 'amount', label: 'Amount', type: 'currency' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'reference', label: 'Reference' },
      ],
      rows,
      summary: [
        { label: 'Total Deposits', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.amount), 0)), tone: 'success' },
        { label: 'Transactions', value: formatInteger(rows.length), tone: 'primary' },
      ],
    };
  }

  if (reportType === 'transactions') {
    const rows = [
      ...store.sales.map((row) => ({
        transactionId: `SL-${row.id}`,
        type: 'Sale',
        amount: toNumber(row.grand_total),
        date: asDateString(row.invoice_date),
        status: paymentStatusByDue(row.rest),
      })),
      ...store.purchases.map((row) => ({
        transactionId: `PU-${row.id}`,
        type: 'Purchase',
        amount: toNumber(row.grand_total || row.total),
        date: asDateString(row.purchase_date),
        status: paymentStatusByDue(row.rest),
      })),
      ...store.expenses.map((row) => ({
        transactionId: `EX-${row.id}`,
        type: 'Expense',
        amount: toNumber(row.amount),
        date: asDateString(row.invoice_date),
        status: 'Paid',
      })),
      ...store.deposits.map((row) => ({
        transactionId: `DP-${row.id}`,
        type: 'Deposit',
        amount: toNumber(row.amount),
        date: asDateString(row.deposit_date),
        status: 'Paid',
      })),
      ...store.transfers.map((row) => ({
        transactionId: `TR-${row.id}`,
        type: 'Transfer',
        amount: toNumber(row.grand_total),
        date: asDateString(row.transfer_date),
        status: 'Paid',
      })),
    ]
      .filter((row) => inDateRange(row.date, fromDate, toDate))
      .filter((row) => (filters.type && filters.type !== 'all' ? row.type === filters.type : true));

    return {
      columns: [
        { key: 'transactionId', label: 'Transaction ID' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Amount', type: 'currency' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows,
      summary: [
        { label: 'Total Transactions', value: formatInteger(rows.length), tone: 'primary' },
        { label: 'Total Amount', value: formatCompactCurrency(rows.reduce((sum, row) => sum + toNumber(row.amount), 0)), tone: 'primary' },
      ],
    };
  }

  const period = filters.period && filters.period !== 'all' ? String(filters.period).toLowerCase() : 'daily';

  const rawRows = store.closings
    .filter((row) => inDateRange(row.closing_date, fromDate, toDate))
    .map((row) => ({
      date: asDateString(row.closing_date),
      openingBalance: toNumber(row.cash_balance) + toNumber(row.total_expense) - toNumber(row.total_sales),
      closingBalance: toNumber(row.cash_balance),
      totalSales: toNumber(row.total_sales),
      expenses: toNumber(row.total_expense),
    }));

  let rows = rawRows;

  if (period === 'monthly' || period === 'yearly') {
    const grouped = new Map();
    rawRows.forEach((row) => {
      const key = period === 'monthly' ? String(row.date).slice(0, 7) : String(row.date).slice(0, 4);
      const current = grouped.get(key) || { openingBalance: 0, closingBalance: 0, totalSales: 0, expenses: 0 };

      grouped.set(key, {
        openingBalance: current.openingBalance + row.openingBalance,
        closingBalance: current.closingBalance + row.closingBalance,
        totalSales: current.totalSales + row.totalSales,
        expenses: current.expenses + row.expenses,
      });
    });

    rows = Array.from(grouped.entries()).map(([date, values]) => ({ date, ...values }));
  }

  return {
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'openingBalance', label: 'Opening Balance', type: 'currency' },
      { key: 'closingBalance', label: 'Closing Balance', type: 'currency' },
      { key: 'totalSales', label: 'Total Sales', type: 'currency' },
      { key: 'expenses', label: 'Expenses', type: 'currency' },
    ],
    rows,
    summary: [
      { label: 'Closings', value: formatInteger(rows.length), tone: 'primary' },
      { label: 'Total Sales', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.totalSales), 0)), tone: 'success' },
      { label: 'Expenses', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.expenses), 0)), tone: 'danger' },
      { label: 'Closing Balance', value: formatCurrency(rows.reduce((sum, row) => sum + toNumber(row.closingBalance), 0)), tone: 'primary' },
    ],
  };
};

const applySearchAndSort = (rows, columns, options) => {
  const search = options.search || '';
  const sortKey = options.sortKey || columns[0]?.key || '';
  const sortDir = options.sortDir || 'desc';

  let result = rows;

  if (search) {
    result = result.filter((row) => {
      return columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(search));
    });
  }

  const sortAllowed = columns.some((column) => column.key === sortKey);
  const safeSortKey = sortAllowed ? sortKey : (columns[0]?.key || '');

  if (safeSortKey) {
    result = [...result].sort((a, b) => {
      const av = a[safeSortKey];
      const bv = b[safeSortKey];

      const aNum = Number(av);
      const bNum = Number(bv);
      const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum);

      if (bothNumeric) {
        return aNum - bNum;
      }

      return String(av ?? '').localeCompare(String(bv ?? ''));
    });

    if (sortDir === 'desc') {
      result.reverse();
    }
  }

  return {
    rows: result,
    sortKey: safeSortKey,
    sortDir,
  };
};

const paginateRows = (rows, page, limit) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 10));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const offset = (safePage - 1) * safeLimit;

  return {
    rows: rows.slice(offset, offset + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
};

const buildReportResult = async (rawQuery, { exportAll = false } = {}) => {
  const options = normalizeQueryOptions(rawQuery);
  const store = await fetchStore();
  const title = reportTitle(options.reportType);

  const report = buildReportRows(options.reportType, store, options);
  const filtered = applySearchAndSort(report.rows, report.columns, options);
  const availableFilters = computeFilterDefinitions(options.reportType, store);

  const paginated = exportAll
    ? {
      rows: filtered.rows,
      pagination: {
        page: 1,
        limit: filtered.rows.length || 1,
        total: filtered.rows.length,
        totalPages: 1,
      },
    }
    : paginateRows(filtered.rows, options.page, options.limit);

  return {
    reportType: options.reportType,
    title,
    columns: report.columns,
    rows: paginated.rows,
    summary: report.summary,
    pagination: paginated.pagination,
    availableFilters,
    applied: {
      fromDate: options.fromDate,
      toDate: options.toDate,
      search: options.search,
      sortKey: filtered.sortKey,
      sortDir: filtered.sortDir,
      filters: options.filters,
    },
  };
};

const logReportAction = async ({ reportType, action, userId }) => {
  const generatedBy = Number(userId);
  if (!Number.isFinite(generatedBy) || generatedBy <= 0) {
    return;
  }

  const reportName = `${reportTitle(reportType)} - ${String(action || 'generate').toUpperCase()}`;
  await reportLogService.createSystemReportLog({ report_name: reportName, generated_by: generatedBy });
};

const getUnifiedReport = async (rawQuery, userId) => {
  const payload = await buildReportResult(rawQuery);
  await logReportAction({ reportType: payload.reportType, action: 'generate', userId });
  return payload;
};

const generatePdfBuffer = async (rawQuery, userId) => {
  const payload = await buildReportResult(rawQuery, { exportAll: true });

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  const done = new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });

  doc.fontSize(18).fillColor('#0F172A').text(payload.title, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#64748B').text(`Generated: ${new Date().toLocaleString()}`);

  if (payload.applied.fromDate || payload.applied.toDate) {
    doc.text(`Date range: ${payload.applied.fromDate || 'Any'} to ${payload.applied.toDate || 'Any'}`);
  }

  doc.moveDown(0.6);
  doc.fontSize(11).fillColor('#0F172A').text('Summary');
  payload.summary.forEach((item) => {
    doc.fontSize(9).fillColor('#334155').text(`${item.label}: ${item.value}`);
  });

  doc.moveDown(0.7);
  const startX = doc.page.margins.left;
  let y = doc.y;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = Math.max(70, usableWidth / Math.max(1, payload.columns.length));

  const drawHeader = () => {
    let x = startX;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A');
    payload.columns.forEach((column) => {
      doc.text(column.label, x, y, { width: colWidth - 6, ellipsis: true });
      x += colWidth;
    });
    y += 16;
    doc.moveTo(startX, y - 3).lineTo(startX + usableWidth, y - 3).strokeColor('#CBD5E1').stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#334155');
  };

  drawHeader();

  payload.rows.forEach((row) => {
    if (y > doc.page.height - 40) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
      y = doc.page.margins.top;
      drawHeader();
    }

    let x = startX;
    payload.columns.forEach((column) => {
      const raw = row[column.key];
      doc.text(String(raw ?? ''), x, y, { width: colWidth - 6, ellipsis: true });
      x += colWidth;
    });

    y += 14;
  });

  doc.end();
  const buffer = await done;

  await logReportAction({ reportType: payload.reportType, action: 'export-pdf', userId });

  return {
    reportType: payload.reportType,
    filename: `${payload.reportType}-report-${Date.now()}.pdf`,
    buffer,
    contentType: 'application/pdf',
  };
};

const generateXlsxBuffer = async (rawQuery, userId) => {
  const payload = await buildReportResult(rawQuery, { exportAll: true });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(payload.title.substring(0, 31));

  sheet.columns = payload.columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: Math.max(14, Math.min(40, column.label.length + 10)),
  }));

  const titleRow = sheet.insertRow(1, [payload.title]);
  sheet.mergeCells(1, 1, 1, Math.max(1, payload.columns.length));
  titleRow.font = { name: 'Calibri', bold: true, size: 15, color: { argb: '0F172A' } };

  const dateRow = sheet.insertRow(2, [`Generated: ${new Date().toLocaleString()}`]);
  sheet.mergeCells(2, 1, 2, Math.max(1, payload.columns.length));
  dateRow.font = { name: 'Calibri', size: 10, color: { argb: '64748B' } };

  const rangeRow = sheet.insertRow(3, [`Date range: ${payload.applied.fromDate || 'Any'} to ${payload.applied.toDate || 'Any'}`]);
  sheet.mergeCells(3, 1, 3, Math.max(1, payload.columns.length));
  rangeRow.font = { name: 'Calibri', size: 10, color: { argb: '64748B' } };

  let summaryStart = 5;
  payload.summary.forEach((item, index) => {
    const row = sheet.insertRow(summaryStart + index, [`${item.label}: ${item.value}`]);
    sheet.mergeCells(summaryStart + index, 1, summaryStart + index, Math.max(1, payload.columns.length));
    row.font = { name: 'Calibri', size: 10, color: { argb: '334155' } };
  });

  const headerRowNumber = summaryStart + payload.summary.length + 2;
  const headerRow = sheet.insertRow(headerRowNumber, payload.columns.map((column) => column.label));
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, color: { argb: '0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  });

  payload.rows.forEach((data) => {
    const rowValues = payload.columns.map((column) => data[column.key] ?? '');
    const row = sheet.addRow(rowValues);
    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: '334155' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  await logReportAction({ reportType: payload.reportType, action: 'export-xlsx', userId });

  return {
    reportType: payload.reportType,
    filename: `${payload.reportType}-report-${Date.now()}.xlsx`,
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

module.exports = {
  getUnifiedReport,
  generatePdfBuffer,
  generateXlsxBuffer,
};
