const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

exports.getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (error) {
    return next(new HttpError("Server error while getting users. Try again later", 500));
  }
  res.json({ message: "Success!", users: users.map((place) => place.toObject({ getters: true })) });
};

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(newHttpError("Some input data is not valid, try again.", 422));
  }
  const { name, email, password } = req.body;
  let hasUser;
  try {
    hasUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("Server error while signing up. Try again later.", 500));
  }
  if (hasUser) return next(new HttpError("User already exists.", 400));

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(new HttpError("Server error while signing up. Try again later.", 500));
  }

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    places: [],
    image: req.file.path,
  });

  try {
    await newUser.save();
  } catch (error) {
    return next("Server error while signing up. Try again later.", 500);
  }

  let token;
  try {
    token = jwt.sign({ userId: newUser.id, email: newUser.email }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });
  } catch (error) {
    return next(new HttpError("Server error while signing up. Try again later.", 500));
  }

  res.status(201).json({ message: "Success!", userId: newUser.id, email: newUser, token });
};

exports.login = async (req, res, next) => {
  let hasUser;
  const { email, password } = req.body;
  try {
    hasUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("Server error logging in. Try again later.", 500));
  }
  if (!hasUser) return next(new HttpError("Invalid credentials or this user doesn't exist.", 401));
  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(password, hasUser.password);
  } catch (error) {
    return next(new HttpError("Server error logging in. Try again later.", 500));
  }
  if (!isValidPassword)
    return next(new HttpError("Invalid credentials or this user doesn't exist.", 401));

  let token;
  try {
    token = jwt.sign({ userId: hasUser.id, email: hasUser.email }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });
  } catch (error) {
    return next(new HttpError("Server error logging in. Try again later.", 500));
  }

  res.status(201).json({ message: "Success!", userId: hasUser.id, email: hasUser.email, token });
};
