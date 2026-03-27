const inventoryService = require('../services/InventoryServices');

const getInventoryOverview = async (req, res) => {
  try {
    const rows = await inventoryService.getInventoryOverview({
      search: req.query.search,
      warehouse_id: req.query.warehouse_id,
    });

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch inventory overview', error: error.message });
  }
};

const getStockMovements = async (req, res) => {
  try {
    const result = await inventoryService.getStockMovements({
      page: req.query.page,
      limit: req.query.limit,
      product_id: req.query.product_id,
      type: req.query.type,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch stock movements', error: error.message });
  }
};

const getInventoryByProduct = async (req, res) => {
  try {
    const data = await inventoryService.getProductStockById(req.params.id);
    return res.status(200).json(data);
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('Valid product id')) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to fetch product inventory', error: error.message });
  }
};

module.exports = {
  getInventoryOverview,
  getStockMovements,
  getInventoryByProduct,
};
