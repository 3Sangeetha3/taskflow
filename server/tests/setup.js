// Shared in-memory MongoDB helpers so tests never touch real data.
// Connects through the app's own connectDB so tests exercise the real connection options.
const os = require('node:os');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const connectDB = require('../src/config/db');

let mongod;

// MongoDB driver 7 loads its `os` adapter with a dynamic import(), which Jest's CommonJS VM rejects.
// The handshake then has no client metadata and mongod refuses it. Hand the driver `os` directly.
const TEST_DB_OPTIONS = { runtimeAdapters: { os } };

// First launch of the in-memory mongod (binary check/extract) can exceed Jest's 5s hook default.
exports.DB_HOOK_TIMEOUT_MS = 60000;

exports.connect = async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri(), TEST_DB_OPTIONS);
};

// Reconnect to the same in-memory server after a test deliberately disconnected.
exports.reconnect = () => connectDB(mongod.getUri(), TEST_DB_OPTIONS);

exports.clear = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

exports.disconnect = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};
