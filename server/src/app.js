const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const taskRoutes = require('./routes/taskRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { responseLogger } = require('./middleware/responseLogger');
const { sendSuccess } = require('./utils/response');
const HTTP = require('./constants/http');
const { MESSAGES } = require('./constants/messages');
const { JSON_BODY_LIMIT_BYTES, DEFAULT_CLIENT_ORIGIN } = require('./constants/request');

// App is created here and exported WITHOUT listening, so tests can import it.
const app = express();

app.use(responseLogger); // first, so every response (including parse errors) is logged
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || DEFAULT_CLIENT_ORIGIN }));
app.use(express.json({ limit: JSON_BODY_LIMIT_BYTES }));

app.get('/api/health', (req, res) => {
  sendSuccess(res, HTTP.OK, MESSAGES.HEALTH_OK);
});

app.use('/api/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
