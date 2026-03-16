const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const express = require('express');
const cors = require('cors');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const saleRoutes = require('./routes/saleRoutes');
const customerRoutes = require('./routes/customerRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const stockAdjustmentRoutes = require('./routes/stockAdjustmentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const rolePermissionRoutes = require('./routes/rolePermissionRoutes');
const supplierPaymentRoutes = require('./routes/supplierPaymentRoutes');
const sponsorRoutes = require('./routes/sponsorRoutes');
const customerReceiptRoutes = require('./routes/customerReceiptRoutes');
const purchaseItemRoutes = require('./routes/purchaseItemRoutes');
const purchaseReturnRoutes = require('./routes/purchaseReturnRoutes');
const purchaseReturnItemRoutes = require('./routes/purchaseReturnItemRoutes');
const saleItemRoutes = require('./routes/saleItemRoutes');
const salesReturnRoutes = require('./routes/salesReturnRoutes');
const salesReturnItemRoutes = require('./routes/salesReturnItemRoutes');
const expenseTypeRoutes = require('./routes/expenseTypeRoutes');
const expensePaymentRoutes = require('./routes/expensePaymentRoutes');
const transactionClosingRoutes = require('./routes/transactionClosingRoutes');
const cashDepositRoutes = require('./routes/cashDepositRoutes');
const reportLogRoutes = require('./routes/reportLogRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Core catalog modules
app.use('/api', categoryRoutes);
app.use('/api', productRoutes);
app.use('/api', stockAdjustmentRoutes);

// Supplier and purchase modules
app.use('/api', supplierRoutes);
app.use('/api', supplierPaymentRoutes);
app.use('/api', purchaseRoutes);
app.use('/api', purchaseItemRoutes);
app.use('/api', purchaseReturnRoutes);
app.use('/api', purchaseReturnItemRoutes);

// Customer and sales modules
app.use('/api', customerRoutes);
app.use('/api', sponsorRoutes);
app.use('/api', customerReceiptRoutes);
app.use('/api', saleRoutes);
app.use('/api', saleItemRoutes);
app.use('/api', salesReturnRoutes);
app.use('/api', salesReturnItemRoutes);

// Expense and finance modules
app.use('/api', expenseRoutes);
app.use('/api', expenseTypeRoutes);
app.use('/api', expensePaymentRoutes);
app.use('/api', transactionClosingRoutes);
app.use('/api', cashDepositRoutes);

// Access and system modules
app.use('/api', companyRoutes);
app.use('/api', userRoutes);
app.use('/api', roleRoutes);
app.use('/api', permissionRoutes);
app.use('/api', rolePermissionRoutes);
app.use('/api', reportLogRoutes);
app.use('/api', auditLogRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});