const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordinates = require("../util/location");
const Place = require("../models/place");
const s3 = require("../middleware/s3");
const User = require("../models/user");

exports.getPlaceById = async (req, res, next) => {
  let item;
  try {
    item = await Place.findById(req.params.pid);
  } catch (err) {
    return next(new HttpError("Server error while finding place. Try again later.", 500));
  }
  if (!item) {
    return next(new HttpError("Place not found.", 404));
  }
  res.json({ message: "Success!", place: item.toObject({ getters: true }) });
};

exports.getPlacesByUserId = async (req, res, next) => {
  let items;
  try {
    items = await Place.find({ creator: req.params.uid });
  } catch (err) {
    return next(new HttpError("Server error while finding places. Try again later.", 500));
  }
  res.json({
    message: "Success",
    places: !items ? [] : items.map((place) => place.toObject({ getters: true })),
  });
};

exports.createPlace = async (req, res, next) => {
  let location;
  let user;
  const errors = validationResult(req);
  const { title, description, address, creator } = req.body;
  if (!errors.isEmpty())
    return next(new HttpError("Some input data is not valid, try again.", 422));
  try {
    location = await getCoordinates(address);
  } catch (error) {
    return next(error);
  }
  const place = new Place({
    title,
    image: req.file.path,
    description,
    creator,
    address,
    location,
  });

  try {
    user = await User.findById(creator);
  } catch (error) {
    return next(new HttpError("Server error while finding user. Try again later.", 500));
  }
  if (!user) return next(new HttpError("User not found.", 404));
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await place.save({ session });
    user.places.push(place);
    await user.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError("Server error while creating a place. Try again later.", 500));
  }
  res.status(201).json({ message: "Success!" });
};

exports.updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new HttpError("Some input data is not valid, try again.", 422);
  let place;
  const { title, description } = req.body;
  try {
    place = await Place.findById(req.params.pid);
  } catch (error) {
    return next(new HttpError("Server error while finding place. Try again later", 500));
  }
  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You're not allowed to do that.", 401));
  }
  place.title = title;
  place.description = description;
  try {
    await place.save();
  } catch (error) {
    return next(new HttpError("Server error while saving the place. Try again later.", 500));
  }
  res.status(200).json({ message: "Success!", place: place.toObject({ getters: true }) });
};

exports.deletePlace = async (req, res, next) => {
  let place;
  let imagePath;
  try {
    place = await Place.findById(req.params.pid).populate("creator");
    imagePath = place.image;
    if (!place) return next(new HttpError("Place not found.", 404));
    if (place.creator.id !== req.userData.userId) {
      return next(new HttpError("You're not allowed to do that.", 401));
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    await place.remove({ session });
    place.creator.places.pull(place);
    await place.creator.save({ session });
    session.commitTransaction();
  } catch (error) {
    return next(new HttpError("Server error while deleting place. Try again later", "500"));
  }

  s3.deleteFile(imagePath);

  res.status(200).json({ message: "Success!" });
};
