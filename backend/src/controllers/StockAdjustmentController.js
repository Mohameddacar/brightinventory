const stockAdjustmentService = require('../services/StockAdjustmentServices');

const createStockAdjustment = async (req, res) => {
  try {
    const result = await stockAdjustmentService.createStockAdjustment(req.body);
    return res.status(201).json({ message: 'Stock adjustment created successfully', data: result });
  } catch (error) {
    if (error.code === 'LOW_STOCK') {
      return res.status(400).json({ message: error.message, ...(error.meta || {}) });
    }

    if (error.message?.includes('required') || error.message?.includes('cannot be 0')) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to create stock adjustment', error: error.message });
  }
};

const updateStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    await stockAdjustmentService.updateStockAdjustment(id, req.body);
    return res.status(200).json({ message: 'Stock adjustment updated successfully' });
  } catch (error) {
    if (error.code === 'IMMUTABLE_STOCK_ADJUSTMENT') {
      return res.status(405).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to update stock adjustment', error: error.message });
  }
};

const deleteStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    await stockAdjustmentService.deleteStockAdjustment(id);
    return res.status(200).json({ message: 'Stock adjustment deleted successfully' });
  } catch (error) {
    if (error.code === 'IMMUTABLE_STOCK_ADJUSTMENT') {
      return res.status(405).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to delete stock adjustment', error: error.message });
  }
};

const getStockAdjustments = async (req, res) => {
  try {
    const adjustments = await stockAdjustmentService.getAllStockAdjustments();
    return res.status(200).json(adjustments);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch stock adjustments', error: error.message });
  }
};

const getStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const adjustment = await stockAdjustmentService.getStockAdjustmentById(id);

    if (!adjustment) {
      return res.status(404).json({ message: 'Stock adjustment not found' });
    }

    return res.status(200).json(adjustment);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch stock adjustment', error: error.message });
  }
};

module.exports = {
  createStockAdjustment,
  updateStockAdjustment,
  deleteStockAdjustment,
  getStockAdjustments,
  getStockAdjustment,
};
