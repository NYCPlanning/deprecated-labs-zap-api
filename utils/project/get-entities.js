const { projectXMLs } = require('../../queries/project-xmls');
const pluralizeProjectEntity = require('../pluralize-project-entity');

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

module.exports = {
  getProjectEntities,
};
