/**
 * Normalizes prefixed property names, and returns an object containing all properties
 * with correct (either original or normalized) name.
 */
function parsePrefixedProperties(project) {
  const normalizedProject = {};
  Object.keys(project).forEach((propertyName) => {
    const normalizedPropertyName = getNormalizedPropertyName(propertyName);
    normalizedProject[normalizedPropertyName] = project[propertyName];
  });
  return normalizedProject;
}

/**
 * Returns the normalized property name if the name is prefixed with
 * FORMATTED_VALUE prefix, LOGICAL_NAME prefix, or NAVIGATION_PROPERTY prefix;
 * otherwise returns the original property name.
 */
function getNormalizedPropertyName(propertyName) {
  const FORMATTED_VALUE = '@OData.Community.Display.V1.FormattedValue';
  const LOGICAL_NAME = '@Microsoft.Dynamics.CRM.lookuplogicalname';
  const NAVIGATION_PROPERTY = '@Microsoft.Dynamics.CRM.associatednavigationproperty';

  let index;
  let suffix;
  if (propertyName.includes(FORMATTED_VALUE)) {
    index = propertyName.indexOf(FORMATTED_VALUE);
    suffix = '_formatted';
  }

  if (propertyName.includes(LOGICAL_NAME)) {
    index = propertyName.indexOf(LOGICAL_NAME);
    suffix = '_logical';
  }

  if (propertyName.includes(NAVIGATION_PROPERTY)) {
    index = propertyName.indexOf(NAVIGATION_PROPERTY);
    suffix = '_navigationproperty';
  }

  return (index && suffix) ? propertyName.substring(0, index) + suffix : propertyName;
}

module.exports = parsePrefixedProperties;
