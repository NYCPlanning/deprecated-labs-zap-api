/**
 * Helper function to create a formatted project from a template. Template is
 * expected to be a POJO containing at least a 'fields' property, and optionally
 * entities and entity_fields (See `/response-templates`).
 *
 * @param {Object} project The processed project object
 * @param {Object} template The project template
 * @returns {Object} The formatted object, containing exactly the fields defined in template
 */
function projectFromTemplate(project, template) {
  const { fields, entities = [], entity_fields } = template;

  // Create all fields in formatted object from original
  const formatted = objectFromFields(project, fields);

  // Create arrays for each entity type from original entity array
  entities.forEach((entityType) => {
    formatted[entityType] = project[entityType]
      .map(entity => objectFromFields(entity, entity_fields[entityType]));
  });

  return formatted;
}

/**
 * Helper function to make a formatted object from an original, given an array of fields to transfer
 *
 * @param {Object} object The original object to pull field values from
 * @param {String[]} fields The Array of fields to pull into
 * @returns {Object} The formatted object, containing all fields with values from original object
 */
function objectFromFields(object, fields) {
  const formatted = {};
  fields.forEach((field) => {
    formatted[field] = object[field];
  });
  return formatted;
}

module.exports = projectFromTemplate;
