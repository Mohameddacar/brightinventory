const paymentMethodService = require('../services/PaymentMethodServices');

const validateType = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return 'type is required';
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9\s&'().+-]{1,98}$/.test(normalized)) {
    return 'type is invalid';
  }

  return null;
};

const createPaymentMethod = async (req, res) => {
  try {
    const validationError = validateType(req.body?.type);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const created = await paymentMethodService.createPaymentMethod(req.body || {});
    return res.status(201).json({ message: 'Payment method created successfully', data: created });
  } catch (error) {
    if (error.code === 'DUPLICATE_PAYMENT_METHOD_TYPE') {
      return res.status(409).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to create payment method', error: error.message });
  }
};

const getPaymentMethods = async (req, res) => {
  try {
    const result = await paymentMethodService.getPaymentMethods({
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch payment methods', error: error.message });
  }
};

const getPaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await paymentMethodService.getPaymentMethodById(req.params.id);
    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    return res.status(200).json({ data: paymentMethod });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch payment method', error: error.message });
  }
};

const updatePaymentMethod = async (req, res) => {
  try {
    const validationError = validateType(req.body?.type);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existing = await paymentMethodService.getPaymentMethodById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    const updated = await paymentMethodService.updatePaymentMethod(req.params.id, req.body || {});
    return res.status(200).json({ message: 'Payment method updated successfully', data: updated });
  } catch (error) {
    if (error.code === 'DUPLICATE_PAYMENT_METHOD_TYPE') {
      return res.status(409).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to update payment method', error: error.message });
  }
};

const deletePaymentMethod = async (req, res) => {
  try {
    const existing = await paymentMethodService.getPaymentMethodById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    await paymentMethodService.deletePaymentMethod(req.params.id);
    return res.status(200).json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete payment method', error: error.message });
  }
};

module.exports = {
  createPaymentMethod,
  getPaymentMethods,
  getPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
};
