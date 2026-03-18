const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'companies');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.jpg';
    const fileName = `company_logo_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, fileName);
  },
});

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
    return;
  }

  cb(null, true);
};

const uploadCompanyLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const handleCompanyLogoUpload = (req, res, next) => {
  uploadCompanyLogo.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: err.message || 'Invalid image upload request',
      });
    }

    return next();
  });
};

module.exports = {
  uploadCompanyLogo,
  handleCompanyLogoUpload,
};
