const accountService = require('../services/AccountServices');

const ACCOUNT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s&'().,-]{1,149}$/;
const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_/]{1,63}$/;
const SUPPORTED_CURRENCIES = new Set(['USD', 'SOS']);

const validateCreatePayload = (payload) => {
  const errors = [];

  const accountName = String(payload?.account_name || '').trim();
  if (!accountName) {
    errors.push('account_name is required');
  } else if (!ACCOUNT_NAME_PATTERN.test(accountName)) {
    errors.push('account_name is invalid');
  }

  const accountNumber = String(payload?.account_number || '').trim();
  if (!accountNumber) {
    errors.push('account_number is required');
  } else if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
    errors.push('account_number is invalid');
  }

  const openingBalance = Number(payload?.opening_balance);
  if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    errors.push('opening_balance must be 0 or greater');
  }

  const currency = String(payload?.currency || 'USD').trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    errors.push('currency must be USD or SOS');
  }

  return errors;
};

const validateUpdatePayload = (payload) => {
  const errors = [];

  if (Object.prototype.hasOwnProperty.call(payload || {}, 'balance')) {
    errors.push('balance cannot be updated directly');
  }

  if (Object.prototype.hasOwnProperty.call(payload || {}, 'opening_balance')) {
    errors.push('opening_balance cannot be updated directly');
  }

  if (Object.prototype.hasOwnProperty.call(payload || {}, 'account_number')) {
    errors.push('account_number cannot be updated');
  }

  const accountName = String(payload?.account_name || '').trim();
  if (!accountName) {
    errors.push('account_name is required');
  } else if (!ACCOUNT_NAME_PATTERN.test(accountName)) {
    errors.push('account_name is invalid');
  }

  if (payload?.remarks != null && typeof payload.remarks !== 'string') {
    errors.push('remarks must be a string');
  }

  return errors;
};

const createAccount = async (req, res) => {
  try {
    const validationErrors = validateCreatePayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    const created = await accountService.createAccount(req.body);
    return res.status(201).json({ message: 'Account created successfully', data: created });
  } catch (error) {
    if (error.code === 'DUPLICATE_ACCOUNT_NUMBER') {
      return res.status(409).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to create account', error: error.message });
  }
};

const getAccounts = async (req, res) => {
  try {
    const result = await accountService.getAccounts({
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch accounts', error: error.message });
  }
};

const getAccount = async (req, res) => {
  try {
    const account = await accountService.getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    return res.status(200).json({ data: account });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch account', error: error.message });
  }
};

const updateAccount = async (req, res) => {
  try {
    const validationErrors = validateUpdatePayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    const existing = await accountService.getAccountById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const updated = await accountService.updateAccount(req.params.id, req.body);
    return res.status(200).json({ message: 'Account updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update account', error: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const existing = await accountService.getAccountById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Account not found' });
    }

    await accountService.deleteAccount(req.params.id);
    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
};

module.exports = {
  createAccount,
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
};
