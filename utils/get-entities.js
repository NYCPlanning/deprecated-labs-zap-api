const { projectsXMLs } = require('../queries/projects-xmls');
const { projectXMLs } = require('../queries/project-xmls');
const pluralizeProjectEntity = require('./pluralize-project-entity');

/**
 * Cannot always get all entities in a single GET request, because the URL sent to CRM may be 
 * too long (FetchXML query param will include all project UUIDs). Cannot get all entities
 * in a single batch POST request, because for some reason this causes the CRM to fail with
 * HTTP 400 and no error message. Instead, do GET requests in batches of 50 ids (if max URI
 * length is ~2000 characters, and projectUUIDs are 36 chars each, then 50 of them should
 * be safely within the acceptable url length)
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {int[]} projectUUIDs The list of all projectUUIDs in the filtered dataset
 * @returns {Object} Object containing full list of projects entities
 */
async function getProjectsEntities(crmClient, projectUUIDs) {
  if (!projectUUIDs.length) {
    return {};
  }

  const BATCH_SIZE = 50;
  const actionsPromises = [];
  const applicantsPromises = [];
  const batches = Math.ceil(projectUUIDs.length / BATCH_SIZE);
  for (let i = 0; i < batches; i++) { // eslint-disable-line
    const uuidBatch = projectUUIDs.slice(i, i + BATCH_SIZE);
    actionsPromises.push(getProjectsEntity(crmClient, 'action', uuidBatch));
    applicantsPromises.push(getProjectsEntity(crmClient, 'applicant', uuidBatch));
  }

  const actions = await Promise.all(actionsPromises)
    .then((res) => {
      const [ac] = res;
      return ac.reduce((acc, val) => acc.concat(val), []);
    });
  const applicants = await Promise.all(applicantsPromises)
    .then((res) =>{
      const [ap] = res;
      return ap.reduce((acc, val) => acc.concat(val), []);
    });
  return  { actions, applicants };
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
};

module.exports = getEntities;
