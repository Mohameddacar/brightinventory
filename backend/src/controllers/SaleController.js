const saleService = require('../services/SaleServices');

const createSale = async (req, res) => {
  try {
    await saleService.createSale(req.body);
    return res.status(201).json({ message: 'Sale created successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create sale', error: error.message });
  }
};

const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    await saleService.updateSale(id, req.body);
    return res.status(200).json({ message: 'Sale updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update sale', error: error.message });
  }
};

const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    await saleService.deleteSale(id);
    return res.status(200).json({ message: 'Sale deleted successfully' });
  } catch (error) {
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

module.exports = {
  createSale,
  updateSale,
  deleteSale,
  getSales,
  getSale,
};
