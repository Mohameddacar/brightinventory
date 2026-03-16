const customerService = require('../services/CustomerServices');

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,119}$/;
const MOBILE_PATTERN = /^[+0-9][0-9\-\s]{6,29}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateCustomerPayload = (payload) => {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Request payload is invalid'];
  }

  const fullName = String(payload.full_name || '').trim();
  if (!fullName) {
    errors.push('full_name is required');
  } else if (!NAME_PATTERN.test(fullName)) {
    errors.push('full_name is invalid');
  }

  const mobile = String(payload.mobile_no || '').trim();
  if (!mobile) {
    errors.push('mobile_no is required');
  } else if (!MOBILE_PATTERN.test(mobile)) {
    errors.push('mobile_no is invalid');
  }

  const email = String(payload.email || '').trim();
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.push('email is invalid');
  }

  const gender = String(payload.gender || '').toLowerCase();
  if (gender !== 'male' && gender !== 'female') {
    errors.push('gender must be either male or female');
  }

  const openingBalance = Number(payload.opening_balance ?? 0);
  if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    errors.push('opening_balance must be a non-negative number');
  }

  const balanceType = String(payload.balance_type || '').toLowerCase();
  if (balanceType !== 'credit' && balanceType !== 'debit') {
    errors.push('balance_type must be either credit or debit');
  }

  if (!payload.registered_date || Number.isNaN(new Date(payload.registered_date).getTime())) {
    errors.push('registered_date is required and must be a valid date');
  }

  if (payload.sponsor_id !== undefined && payload.sponsor_id !== null && Number(payload.sponsor_id) <= 0) {
    errors.push('sponsor_id must be a positive integer');
  }

  return errors;
};

const createCustomer = async (req, res) => {
  try {
    const validationErrors = validateCustomerPayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    await customerService.createCustomer(req.body);
    return res.status(201).json({ message: 'Customer created successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create customer', error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const validationErrors = validateCustomerPayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    const { id } = req.params;
    const existing = await customerService.getCustomerById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customerService.updateCustomer(id, req.body);
    return res.status(200).json({ message: 'Customer updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update customer', error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await customerService.getCustomerById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customerService.deleteCustomer(id);
    return res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete customer', error: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers();
    return res.status(200).json(customers);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
  }
};

const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.status(200).json(customer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch customer', error: error.message });
  }
};

module.exports = {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomers,
  getCustomer,
};
