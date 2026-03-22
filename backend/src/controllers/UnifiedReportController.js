const unifiedReportService = require('../services/UnifiedReportServices');

const resolveUserId = (req) => {
  const candidate = Number(req?.auth?.user_id || req?.auth?.sub || 0);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : null;
};

const getReport = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const payload = await unifiedReportService.getUnifiedReport(req.query || {}, userId);
    return res.status(200).json(payload);
  } catch (error) {
    if (error?.code === 'INVALID_REPORT_TYPE') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to generate report', error: error.message });
  }
};

const exportPdf = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const file = await unifiedReportService.generatePdfBuffer(req.query || {}, userId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.status(200).send(file.buffer);
  } catch (error) {
    if (error?.code === 'INVALID_REPORT_TYPE') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to export PDF report', error: error.message });
  }
};

const exportXlsx = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const file = await unifiedReportService.generateXlsxBuffer(req.query || {}, userId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.status(200).send(file.buffer);
  } catch (error) {
    if (error?.code === 'INVALID_REPORT_TYPE') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to export XLSX report', error: error.message });
  }
};

module.exports = {
  getReport,
  exportPdf,
  exportXlsx,
};
