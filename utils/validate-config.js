/**
 * Validates that all properties on the config object are set (not null or undefined)
 */
function validateConfig(cfg) {
  const missingProps = Object.keys(cfg).filter(prop => cfg[prop] === undefined || cfg[prop] === null); 
  if (!missingProps.length) return cfg;
  throw new TypeError(`Values expected for config variables: ${missingProps.join(', ')}`);
}

module.exports = validateConfig;
