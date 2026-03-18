const saleService = require('../services/SaleServices');

const parseNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : NaN;
};

const validateSalePayload = (payload) => {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Request payload is invalid'];
  }

  if (!payload.customer_id || Number(payload.customer_id) <= 0) {
    errors.push('customer_id is required');
  }

  if (!payload.warehouse_id || Number(payload.warehouse_id) <= 0) {
    errors.push('warehouse_id is required');
  }

  if (!payload.invoice_date || Number.isNaN(new Date(payload.invoice_date).getTime())) {
    errors.push('invoice_date is required and must be a valid date');
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

    const unitPrice = parseNumber(item.unit_price ?? item.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      errors.push(`items[${index}].unit_price must be a non-negative number`);
    }
  });

  return errors;
};

const createSale = async (req, res) => {
  try {
    const validationErrors = validateSalePayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    await saleService.createSale(req.body);
    return res.status(201).json({ message: 'Sale created successfully' });
  } catch (error) {
    if (error.code === 'LOW_STOCK') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to create sale', error: error.message });
  }
};

const updateSale = async (req, res) => {
  try {
    const validationErrors = validateSalePayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    const { id } = req.params;
    await saleService.updateSale(id, req.body);
    return res.status(200).json({ message: 'Sale updated successfully' });
  } catch (error) {
    if (error.message === 'Sale not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.code === 'LOW_STOCK') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to update sale', error: error.message });
  }
};

const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    await saleService.deleteSale(id);
    return res.status(200).json({ message: 'Sale deleted successfully' });
  } catch (error) {
    if (error.message === 'Sale not found') {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to delete sale', error: error.message });
  }
};

const getSales = async (req, res) => {
  try {
    const sales = await saleService.getAllSales();
    return res.status(200).json(sales);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch sales', error: error.message });
  }
};

const getSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await saleService.getSaleById(id);

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    return res.status(200).json(sale);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch sale', error: error.message });
  }
};

const getSaleItems = async (req, res) => {
  try {
    const { id } = req.params;
    const items = await saleService.getSaleItemsBySaleId(id);
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch sale items', error: error.message });
  }
};

const createSalePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await saleService.createSalePayment(id, req.body || {});
    return res.status(201).json({ message: 'Payment recorded successfully', ...result });
  } catch (error) {
    if (error.message === 'Sale not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.code === 'PAYMENT_COMPLETED' || error.code === 'OVERPAY' || error.code === 'INVALID_PAYMENT') {
      return res.status(400).json({ message: error.message, ...(error.meta || {}) });
    }

    return res.status(500).json({ message: 'Failed to create sale payment', error: error.message });
  }
};

const getSalePayments = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await saleService.getSalePaymentsBySaleId(id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Sale not found') {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to fetch sale payments', error: error.message });
  }
};

module.exports = {
  createSale,
  updateSale,
  deleteSale,
  getSales,
  getSale,
  getSaleItems,
  createSalePayment,
  getSalePayments,
};
