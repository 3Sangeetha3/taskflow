const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const HTTP = require('../constants/http');
const { MESSAGES } = require('../constants/messages');

// Rejects anything but a 24-hex ObjectId before body validation or any DB call.
// (mongoose.isValidObjectId also accepts any 12-char string, so it is not used.)
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next(new AppError(MESSAGES.INVALID_ID, HTTP.BAD_REQUEST));
  req.validated = { ...req.validated, params: { id } };
  return next();
};

module.exports = validateObjectId;
