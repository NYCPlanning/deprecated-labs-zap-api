function pluralizeChildEntity(entityType) {
  if (entityType === 'address') {
    return `${entityType}es`;
  }

  if (entityType === 'keyword') {
    return `${entityType}ses`;
  }

  return `${entityType}s`;
}

module.exports = pluralizeChildEntity;
