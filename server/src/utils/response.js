// Success envelope: { success: true, message, data, meta? }
const sendSuccess = (res, status, message, data, meta) =>
  res.status(status).json({
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  });

module.exports = { sendSuccess };
