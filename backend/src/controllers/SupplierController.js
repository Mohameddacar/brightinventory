const supplierService = require('../services/SupplierServices');

const createSupplier = async (req, res) => {
  try {
	await supplierService.createSupplier(req.validated.body);
    return res.status(201).json({ message: 'Supplier created successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create supplier', error: error.message });
  }
};

const updateSupplier = async (req, res) => {
  try {
  const { id } = req.validated.params;
  await supplierService.updateSupplier(id, req.validated.body);
    return res.status(200).json({ message: 'Supplier updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update supplier', error: error.message });
  }
};

const deleteSupplier = async (req, res) => {
  try {
  const { id } = req.validated.params;
    await supplierService.deleteSupplier(id);
    return res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete supplier', error: error.message });
  }
};

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await supplierService.getAllSuppliers();
    return res.status(200).json(suppliers);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch suppliers', error: error.message });
  }
};

const getSupplier = async (req, res) => {
  try {
  const { id } = req.validated.params;
    const supplier = await supplierService.getSupplierById(id);

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    return res.status(200).json(supplier);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch supplier', error: error.message });
  }
};

module.exports = {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSuppliers,
  getSupplier,
};
