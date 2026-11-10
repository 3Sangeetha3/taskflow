require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { logger } = require('./utils/logger');
const { LOG_MESSAGES } = require('./constants/logger');
const { DEFAULT_PORT } = require('./constants/env');

const PORT = process.env.PORT || DEFAULT_PORT;

(async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(PORT, () => logger.info(LOG_MESSAGES.SERVER_LISTENING, { port: Number(PORT) }));
  } catch (err) {
    // Fail fast: no point serving requests without a database.
    logger.error(LOG_MESSAGES.SERVER_START_FAILED, { error: err.message });
    process.exit(1);
  }
})();
