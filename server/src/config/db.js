const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
const { LOG_MESSAGES } = require('../constants/logger');
const { DB_OPTIONS } = require('../constants/db');

// `overrides` lets callers (e.g. tests) add driver options without changing the defaults.
module.exports = async function connectDB(uri, overrides = {}) {
  if (!uri) throw new Error(LOG_MESSAGES.MONGO_URI_MISSING);
  await mongoose.connect(uri, { ...DB_OPTIONS, ...overrides });
  logger.info(LOG_MESSAGES.DB_CONNECTED);
};
