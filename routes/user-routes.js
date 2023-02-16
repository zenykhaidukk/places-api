const express = require("express");
const { check } = require("express-validator");

const usersController = require("../controllers/users-controller");
const s3 = require("../middleware/s3");

const router = express.Router();

router.get("/", usersController.getUsers);

router.post(
  "/signup",
  s3.fileUpload.single("image"),
  [
    (check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 })),
  ],
  usersController.signup
);

router.post("/login", usersController.login);

module.exports = router;
