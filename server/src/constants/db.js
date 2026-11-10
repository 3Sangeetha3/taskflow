const DB_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  // Fail queries immediately while disconnected instead of queueing them.
  bufferCommands: false,
};

// Driver error names that mean "database unreachable" -> 503.
const DB_UNAVAILABLE_ERRORS = [
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
];

module.exports = { DB_OPTIONS, DB_UNAVAILABLE_ERRORS };
