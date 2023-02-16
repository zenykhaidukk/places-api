const multer = require("multer");
const multerS3 = require("multer-s3");
const uuid = require("uuid");
const AWS = require("aws-sdk");
const HttpError = require("../models/http-error");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpeg",
};

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: "eu-central-1",
});

const s3 = new AWS.S3();

exports.fileUpload = multer({
  limits: 500000,
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    key: function (req, file, cb) {
      const ext = MIME_TYPE_MAP[file.mimetype];
      const id = uuid.v4();
      file.path = "uploads/images/" + id + "." + ext;
      cb(null, "uploads/images/" + id + "." + ext);
    },
    fileFilter: (req, file, cb) => {
      const isValid = !!MIME_TYPE_MAP[file.mimetype];
      let error = isValid ? null : new Error("Invalid Mime Type");
      cb(error, isValid);
    },
  }),
});

exports.getFile = (req, res, next) => {
  s3.getObject(
    {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: req.originalUrl.replace("/", ""),
    },
    function (err, data) {
      if (err) {
        console.log("Cant get image");
        res.end();
      } else {
        const ext = req.originalUrl.split(".")[1];
        res.writeHead(200, { "Content-Type": `image/${ext}` });
        res.write(data.Body, "binary");
        res.end(null, "binary");
      }
    }
  );
};

exports.deleteFile = async (imagePath) => {
  try {
    await s3.deleteObject(
      {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: imagePath,
      },
      function (err, data) {
        if (err) console.log("Cant get an image");
      }
    );
  } catch (err) {
    return next(new HttpError("Error while deleting. Try again later.", 500));
  }
};
