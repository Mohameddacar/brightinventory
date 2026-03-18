const transferService = require('../services/TransferServices');

const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_/]{1,63}$/;

const validateTransferPayload = (payload) => {
  const errors = [];

  if (!payload?.transfer_date || Number.isNaN(new Date(payload.transfer_date).getTime())) {
    errors.push('transfer_date is required and must be a valid date');
  }

  const referenceNo = String(payload?.reference_no || '').trim();
  if (!referenceNo) {
    errors.push('reference_no is required');
  } else if (!REF_PATTERN.test(referenceNo)) {
    errors.push('reference_no is invalid');
  }

  const fromWarehouse = Number(payload?.from_warehouse_id);
  const toWarehouse = Number(payload?.to_warehouse_id);

  if (!Number.isFinite(fromWarehouse) || fromWarehouse <= 0) {
    errors.push('from_warehouse_id is required');
  }

  if (!Number.isFinite(toWarehouse) || toWarehouse <= 0) {
    errors.push('to_warehouse_id is required');
  }

  if (Number.isFinite(fromWarehouse) && Number.isFinite(toWarehouse) && fromWarehouse === toWarehouse) {
    errors.push('From warehouse and To warehouse cannot be the same');
  }

  const totalProducts = Number(payload?.total_products);
  if (!Number.isFinite(totalProducts) || totalProducts <= 0) {
    errors.push('total_products must be greater than 0');
  }

  const grandTotal = Number(payload?.grand_total);
  if (!Number.isFinite(grandTotal) || grandTotal < 0) {
    errors.push('grand_total must be 0 or greater');
  }

  return errors;
};

const getWarehouses = async (req, res) => {
  try {
    const warehouses = await transferService.getWarehouses();
    return res.status(200).json(warehouses);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch warehouses', error: error.message });
  }
};

const createTransfer = async (req, res) => {
  try {
    const validationErrors = validateTransferPayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    const created = await transferService.createTransfer(req.body);
    return res.status(201).json({ message: 'Transfer created successfully', data: created });
  } catch (error) {
    if (error.code === 'DUPLICATE_TRANSFER_REFERENCE') {
      return res.status(409).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to create transfer', error: error.message });
  }
};

const getTransfers = async (req, res) => {
  try {
    const result = await transferService.getTransfers({
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch transfers', error: error.message });
  }
};

const getTransfer = async (req, res) => {
  try {
    const transfer = await transferService.getTransferById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    return res.status(200).json({ data: transfer });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch transfer', error: error.message });
  }
};

const deleteTransfer = async (req, res) => {
  try {
    const existing = await transferService.getTransferById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    await transferService.deleteTransfer(req.params.id);
    return res.status(200).json({ message: 'Transfer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete transfer', error: error.message });
  }
};

module.exports = {
  getWarehouses,
  createTransfer,
  getTransfers,
  getTransfer,
  deleteTransfer,
};
