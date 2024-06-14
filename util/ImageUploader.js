const multer = require('multer');
const path = require('path');
const mime = require('mime-types');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'files'));
  },
  filename: function(req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Check the file size limit
  fileFilter: (req, file, cb) => {
    // Check the file types
    const allowedFileTypes = ['image/jpeg', 'image/jpg', 
    'image/png', 'image/gif', 'application/pdf'];
    const detectedMimeType = mime.lookup(file.originalname);

    if (allowedFileTypes.includes(detectedMimeType)) {
      return cb(null, true);
    }
    const error = new Error('Invalid file format. Allowed formats: JPEG, JPG, PNG, GIF, PDF');
    error.status = 400; // Bad Request
    cb(error);
  }
}).single('file');

module.exports = {
    upload,
}