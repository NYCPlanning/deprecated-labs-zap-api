const express = require('express');
const CRMClient = require('../../utils/crm-client');
const { projectsPostProcess: postProcess } = require('../../utils/post-process');
const projectsXMLs = require('../../queries/projects-xmls');
const responseTemplate = require('../../queries/responseTemplate');
const pluralizeProjectEntity = require('../../utils/pluralize-project-entity');

const router = express.Router({ mergeParams: true });


/* gets a JSON array of projects that match the query params */
router.get('/', async (req, res) => {
  const { query } = req;
  const { fillProjectsTemplate } = responseTemplate;

  try {
    const crmClient = new CRMClient();
    const {
      value: projects,
      '@Microsoft.Dynamics.CRM.totalrecordcount': totalProjects,
      '@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded': limitExceeded,
    } = await crmClient.doGet(
      `dcp_projects?fetchXml=${projectsXMLs.project(query)}`,
    );

    if (!projects.length) {
      console.log(`No projects found`); // eslint-disable-line
      res.status(404).send({ error: `No projects found` });
      return;
    }

    const projectIds = projects.map(project => project.dcp_projectid);
    const entities = await getEntities(crmClient, projectIds);
    const projectsData = postProcess.project(projects, entities);

    res.send({
      data: fillProjectsTemplate(projectsData),
      meta: {
        total: totalProjects,
        totalLimitExceeded: limitExceeded,
        pageTotal: query.itemsPerPage || 30,
      },
    });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({
      error: e.toString(),
    });
  }
});

async function getEntities(crmClient, projectIds) {
  const [actions, milestones, applicants] = await Promise.all([
    getProjectEntities(crmClient, 'action', projectIds),
    getProjectEntities(crmClient, 'milestone', projectIds),
    getProjectEntities(crmClient, 'applicant', projectIds),
  ]);

  return {
    actions,
    milestones,
    applicants,
  };
}

function getProjectEntities(crmClient, entityType, projectIds) {
  const entityName = `dcp_project${pluralizeProjectEntity(entityType)}`;
  const entityXML = projectsXMLs[entityType](projectIds);

  return crmClient.doGet(`${entityName}?fetchXml=${entityXML}`).then(result => result.value);
}

module.exports = router;
