const { projectsXMLs } = require('../../queries/projects-xmls');
const pluralizeProjectEntity = require('../pluralize-project-entity');

/**
 * Fetch entities for projects. Actions and applicants are fetched. Assumed that project
 * process is batched, and projectUUIDs will not contain more than 50 items.
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {int[]} projectUUIDs The list of all projectUUIDs in the filtered dataset
 * @returns {Object} Object containing full list of projects entities
 */
async function getProjectsEntities(crmClient, projectUUIDs) {
  if (!projectUUIDs.length) {
    return {};
  }

  const [actions, applicants] = await Promise.all([
    getProjectsEntity(crmClient, 'action', projectUUIDs),
    getProjectsEntity(crmClient, 'applicant', projectUUIDs),
  ]);

  return { actions, applicants };
}

/**
 * Fetch entities for projects in update-geometries route. Bbls are fetched. Assumed that project
 * process is batched, and projectUUIDs will not contain more than 50 items.
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {int[]} projectUUIDs The list of all projectUUIDs in the filtered dataset
 * @returns {Object} Object containing full list of projects entities
 */
async function getProjectsUpdateGeomsEntities(crmClient, projectUUIDs) {
  if (!projectUUIDs.length) {
    return {};
  }

  const [bbl] = await Promise.all([
    getProjectsEntity(crmClient, 'bbl', projectUUIDs),
  ]);

  return { bbl };
}
/**
 * Helper function to get a single entity type for projects.
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {String} entityType The type of entity to fetch
 * @param {String[]} projectIds The projectIds to fetch entities for
 */
async function getProjectsEntity(crmClient, entityType, projectIds) {
  const entityName = `dcp_project${pluralizeProjectEntity(entityType)}`;
  const entityXML = projectsXMLs[entityType](projectIds);

  return crmClient.doGet(`${entityName}?fetchXml=${entityXML}`).then(result => result.value);
}

module.exports = {
  getProjectsEntities,
  getProjectsUpdateGeomsEntities,
};
