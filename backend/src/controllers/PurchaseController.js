const purchaseService = require('../services/PurchaseServices');

const parseNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : NaN;
};

const validatePurchasePayload = (payload) => {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Request payload is invalid'];
  }

  if (!payload.supplier_id || Number(payload.supplier_id) <= 0) {
    errors.push('supplier_id is required');
  }

  if (!payload.warehouse_id || Number(payload.warehouse_id) <= 0) {
    errors.push('warehouse_id is required');
  }

  if (!payload.purchase_date || Number.isNaN(new Date(payload.purchase_date).getTime())) {
    errors.push('purchase_date is required and must be a valid date');
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('At least one product item is required');
    return errors;
  }

  payload.items.forEach((item, index) => {
    if (!item.product_id || Number(item.product_id) <= 0) {
      errors.push(`items[${index}].product_id is required`);
    }

    const quantity = parseNumber(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`items[${index}].quantity must be greater than 0`);
    }

    const unitCost = parseNumber(item.unit_cost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      errors.push(`items[${index}].unit_cost must be a non-negative number`);
    }
  });

  return errors;
};

const createPurchase = async (req, res) => {
  try {
    const validationErrors = validatePurchasePayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    await purchaseService.createPurchase(req.body);
    return res.status(201).json({ message: 'Purchase created successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create purchase', error: error.message });
  }
};

const updatePurchase = async (req, res) => {
  try {
    const validationErrors = validatePurchasePayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    const { id } = req.params;
    await purchaseService.updatePurchase(id, req.body);
    return res.status(200).json({ message: 'Purchase updated successfully' });
  } catch (error) {
    if (error.code === 'LOW_STOCK') {
      return res.status(400).json({ message: error.message, ...(error.meta || {}) });
    }

    if (error.message === 'Purchase not found') {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to update purchase', error: error.message });
  }
};

const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    await purchaseService.deletePurchase(id);
    return res.status(200).json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete purchase', error: error.message });
  }
};

const getPurchases = async (req, res) => {
  try {
    const purchases = await purchaseService.getAllPurchases();
    return res.status(200).json(purchases);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch purchases', error: error.message });
  }
};

const getPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await purchaseService.getPurchaseById(id);

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    return res.status(200).json(purchase);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch purchase', error: error.message });
  }
};

const getPurchaseItems = async (req, res) => {
  try {
    const { id } = req.params;
    const items = await purchaseService.getPurchaseItemsByPurchaseId(id);
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch purchase items', error: error.message });
  }
};

const getWarehouses = async (req, res) => {
  try {
    const warehouses = await purchaseService.getWarehouses();
    return res.status(200).json(warehouses);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch warehouses', error: error.message });
  }
};

const createPurchasePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await purchaseService.createPurchasePayment(id, req.body || {});
    return res.status(201).json({ message: 'Payment recorded successfully', ...result });
  } catch (error) {
    if (error.message === 'Purchase not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.code === 'PAYMENT_COMPLETED' || error.code === 'OVERPAY' || error.code === 'INVALID_PAYMENT') {
      return res.status(400).json({ message: error.message, ...(error.meta || {}) });
    }

    return res.status(500).json({ message: 'Failed to create purchase payment', error: error.message });
  }
};

const getPurchasePayments = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await purchaseService.getPurchasePaymentsByPurchaseId(id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Purchase not found') {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to fetch purchase payments', error: error.message });
  }
};

module.exports = {
  createPurchase,
  updatePurchase,
  deletePurchase,
  getPurchases,
  getPurchase,
  getPurchaseItems,
  getWarehouses,
  createPurchasePayment,
  getPurchasePayments,
};
