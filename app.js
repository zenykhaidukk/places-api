const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const placesRouter = require("./routes/places-routes");
const usersRouter = require("./routes/user-routes");
const s3 = require("./middleware/s3");
const HttpError = require("./models/http-error");

const PORT = 8000;

const app = express();

app.use(bodyParser.json());
app.use("/uploads/images", s3.getFile);
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});
app.use("/api/places", placesRouter);
app.use("/api/users", usersRouter);
app.use((req, res, next) => {
  const error = new HttpError("Invalid route", 404);
  throw error;
});
app.use((error, req, res, next) => {
  if (req.file) {
    s3.deleteFile(req.file.path);
  }
  if (res.headerSent) {
    return next(error);
  }
  res
    .status(error.code || 500)
    .json({ message: error.message || "Server error. Try again later!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@testcluster.w1s7sh8.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => app.listen(process.env.PORT || PORT))
  .catch((err) => console.log(err));
