/**
 * Given an array, returns a deduplicated array of values.
 * Assumes all values in array are of the same type.
 * Primitives or objects are valid value types, but not Arrays.
 * @param {*[]} values The array to be deduplicated
 * @param {String} idField Name of property to use as 'id' when deduplicating array of objects
 * @returns {*[]} The deduplicated array
 */
function dedupeList(values, idField = '') {
  const defined = values.filter(v => !!v && notEmptyObject(v));

  if (!defined.length) return [];

  if (!(defined[0] instanceof Object)) {
    return Array.from(new Set(defined));
  }

  return Array.from(new Set(defined.map(value => value[idField])))
    .map(id => defined.find(value => value[idField] === id));
}

/**
 * Determines if a given variable is an empty object
 *
 * @param {*} variable The variable to check
 * @returns {Boolean}
 */
function notEmptyObject(variable) {
  // Not an object
  if (!(variable instanceof Object)) return true;

  // Object with properties
  if (Object.keys(variable).length) return true;

  // Empty object
  return false;
}
module.exports = dedupeList;
