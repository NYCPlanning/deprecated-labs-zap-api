const { projectsXMLs } = require('../queries/projects-xmls');
const { projectXMLs } = require('../queries/project-xmls');
const pluralizeProjectEntity = require('./pluralize-project-entity');

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
 * Helper function to get a single entity type for projects.
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {String} entityType The type of entity to fetch
 * @param {String[]} projectIds The projectIds to fetch entities for
 */
function getProjectsEntity(crmClient, entityType, projectIds) {
  const entityName = `dcp_project${pluralizeProjectEntity(entityType)}`;
  const entityXML = projectsXMLs[entityType](projectIds);

  return crmClient.doGet(`${entityName}?fetchXml=${entityXML}`).then(result => result.value);
}

/**
 * Fetch entities for project. Bbls, actions, milestones, keywords, applicants, and addresses are fetched.
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {String} projectId The projectId to fetch entities for
 * @returns {Object} Object containing bbls, actions, milestones, keywords, applicants, and addresses entity arrays
 */
async function getProjectEntities(crmClient, projectId) {
  const [
    bbls,
    actions,
    milestones,
    keywords,
    applicants,
    addresses,
  ] = await Promise.all([
    getProjectEntity(crmClient, 'bbl', projectId),
    getProjectEntity(crmClient, 'action', projectId),
    getProjectEntity(crmClient, 'milestone', projectId),
    getProjectEntity(crmClient, 'keyword', projectId),
    getProjectEntity(crmClient, 'applicant', projectId),
    getProjectEntity(crmClient, 'address', projectId),
  ]);

  return {
    bbls,
    actions,
    milestones,
    keywords,
    applicants,
    addresses,
  };
}

/**
 * Helper function to get a single entity type for project.
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {String} entityType The type of entity to fetch
 * @param {String} The projectId to fetch entities for
 */
function getProjectEntity(crmClient, entityType, projectId) {
  const entityName = `dcp_project${pluralizeProjectEntity(entityType)}`;
  const entityXML = projectXMLs[entityType](projectId);

  return crmClient.doGet(`${entityName}?fetchXml=${entityXML}`).then(result => result.value);
}

const getEntities = {
  getProjectsEntities,
  getProjectEntities,
  getProjectsEntity,
};

module.exports = getEntities;
