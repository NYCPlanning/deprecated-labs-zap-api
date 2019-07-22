/**
 * Helper function to pluralize project child entities
 *
 * @param {String} entityType The entity type string to pluralize
 * @returns {String} The pluralized entity type string
 */
function pluralizeChildEntity(entityType) {
  if (entityType === 'address') {
    return `${entityType}es`;
  }

  // Yes, the pluralized version of 'keyword' is 'keywordses'
  if (entityType === 'keyword') {
    return `${entityType}ses`;
  }

  return `${entityType}s`;
}

module.exports = pluralizeChildEntity;
