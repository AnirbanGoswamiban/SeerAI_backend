const multer = require("multer");
const path = require('path');
const fs = require('fs');

const baseUploadPath = path.join(__dirname, "../../MockS3");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.session.uniqueId || "admin";
    const userFolder = path.join(baseUploadPath, userId.toString());
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|bmp|tiff|svg/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }

   cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp, bmp, tiff, svg)'));
  },
});

module.exports = { upload };
