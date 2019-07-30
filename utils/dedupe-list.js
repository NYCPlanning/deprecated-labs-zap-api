/**
 * Given an array, returns a deduplicated array of values.
 * @param {*[]} values The array to be deduplicated
 * @returns {*[]} The deduplicated array
 */
function dedupeList(values) {
  return Array.from(new Set(values.filter(v => !!v)));
}

module.exports = dedupeList;
