/**
 * Validates that all properties on the config object are set, throwing
 * an exception if any are missing, null, or undefined.
 *
 * @param {Object} cfg The config to validate
 * @returns {Object} The validated config
 * @throws {TypeError}
 */
function validateConfig(cfg) {
  const missingProps = Object.keys(cfg).filter(prop => cfg[prop] === undefined || cfg[prop] === null);
  if (!missingProps.length) return cfg;
  throw new TypeError(`Values expected for config variables: ${missingProps.join(', ')}`);
}

module.exports = validateConfig;
