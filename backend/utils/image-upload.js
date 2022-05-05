const multer = require('multer');
const fs = require("fs");

    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        if (!fs.existsSync("./backend/uploads/")) {
          fs.mkdirSync("./backend/uploads/")
        }
        cb(null, './backend/uploads/');
      },
      filename: function (req, file, cb) {
        cb(null, new Date().toISOString().replace(/:/g, '-') + " " + file.originalname);
      }
    });

    const fileFilter = (req, file, cb) => {
      // reject a file
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
      } else {
        cb(null, false);
      }
    };

exports.upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter
});
