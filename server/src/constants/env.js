// Recognised NODE_ENV values.
const NODE_ENVS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
};

// Used when PORT is not set.
const DEFAULT_PORT = 5000;

module.exports = { NODE_ENVS, DEFAULT_PORT };
