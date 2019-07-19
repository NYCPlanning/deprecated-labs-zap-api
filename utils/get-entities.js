const { projectsXMLs } = require('../queries/projects-xmls');
const { projectXMLs } = require('../queries/project-xmls');
const pluralizeProjectEntity = require('./pluralize-project-entity');

async function getProjectsEntities(crmClient, projectIds) {
  if (!projectIds.length) {
    return {};
  }

  const [actions, milestones, applicants] = await Promise.all([
    getProjectsEntity(crmClient, 'action', projectIds),
    getProjectsEntity(crmClient, 'milestone', projectIds),
    getProjectsEntity(crmClient, 'applicant', projectIds),
  ]);

  return {
    actions,
    milestones,
    applicants,
  };
}

function getProjectsEntity(crmClient, entityType, projectIds) {
  const entityName = `dcp_project${pluralizeProjectEntity(entityType)}`;
  const entityXML = projectsXMLs[entityType](projectIds);

  return crmClient.doGet(`${entityName}?fetchXml=${entityXML}`).then(result => result.value);
}

async function getProjectEntities(crmClient, project) {
  const [
    bbls,
    actions,
    milestones,
    keywords,
    applicants,
    addresses,
  ] = await Promise.all([
    getProjectEntity(crmClient, 'bbl', project),
    getProjectEntity(crmClient, 'action', project),
    getProjectEntity(crmClient, 'milestone', project),
    getProjectEntity(crmClient, 'keyword', project),
    getProjectEntity(crmClient, 'applicant', project),
    getProjectEntity(crmClient, 'address', project),
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

function getProjectEntity(crmClient, entityType, project) {
  const projectId = project.dcp_projectid;
  const entityName = `dcp_project${pluralizeProjectEntity(entityType)}`;
  const entityXML = projectXMLs[entityType](projectId);

  return crmClient.doGet(`${entityName}?fetchXml=${entityXML}`).then(result => result.value);
}

const getEntities = {
  getProjectsEntities,
  getProjectEntities,
};

module.exports = getEntities;
