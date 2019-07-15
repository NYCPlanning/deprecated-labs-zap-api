const express = require('express');
const CRMClient = require('../../utils/crm-client');
const { projectPostProcess: postProcess } = require('../../utils/post-process');
const projectXMLs = require('../../queries/project-xmls');
const responseTemplate = require('../../queries/responseTemplate');
const pluralizeProjectEntity = require('../../utils/pluralize-project-entity');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  const { params: { id } } = req; 
  try {
    const crmClient = new CRMClient();
    const { value: [project] } = await crmClient.doGet(`dcp_projects?fetchXml=${projectXMLs.project(id)}`);

    if (!project) {
      console.log(`Project ${id} not found`); // eslint-disable-line
      res.status(404).send({ error: `Project ${id} not found` });
      return;
    }

    const entities = await getEntities(crmClient, project);
    postProcess.project(project);

    res.send({
      data: {
        type: 'projects',
        id,
        attributes: buildAttributes(project, entities),
      },
    });
  } catch (error) {
    console.log(`Error retrieving project (id: ${id})`, error); // eslint-disable-line
    res.status(500).send({ error: 'Unable to retrieve project' });
  }
});

async function getEntities(crmClient, project) {
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

  return crmClient.doGet(`${entityName}?fetchXml=${entityXML}`).then((result) => {
    const { value } = result;
    return postProcess[entityType](value, project);
  });
}

function buildAttributes(project, entities) {
  const {
    projectTemplate,
    actionTemplate,
    addressTemplate,
    applicantTeamTemplate,
    milestoneTemplate,
    fillTemplate,
  } = responseTemplate;

  const [projectAttributes] = fillTemplate(projectTemplate, project);

  return Object.assign(
    {}, {
      ...projectAttributes,
      bbls: entities.bbls,
      bbl_multipolygon: {},
      bbl_featurecollection: {},
      actions: fillTemplate(actionTemplate, entities.actions),
      milestones: fillTemplate(milestoneTemplate, entities.milestones),
      keywords: entities.keywords,
      applicantteam: fillTemplate(applicantTeamTemplate, entities.applicants),
      addresses: fillTemplate(addressTemplate, entities.addresses),
      video_links: [],
    },
  );
}

module.exports = router;
