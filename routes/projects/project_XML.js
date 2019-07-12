/*eslint-disable */

const express = require('express');
const CRMClient = require('../../utils/crm-client');
const postProcess = require('../../utils/post-process');
const fetchXmls = require('../../queries/fetchXmls');
const projectXMLs = require('../../queries/project-xmls');
const responseTemplate = require('../../queries/responseTemplate');
const router = express.Router({ mergeParams: true });
const postFetchEdits = require('../../utils/postFetchEdits');


/* GET /project-xmls/:id */
/* Retreive a single project */
router.get('/', async (req, res) => {
  const { params } = req;
  const { id } = params;

  const {
      getEntity,
      projectPostFetchEdits
  } = postFetchEdits;

  const {
      actionTemplate,
      addressTemplate,
      applicantTeamTemplate,
      fillTemplate,
      milestoneTemplate,
      projectTemplate
  } = responseTemplate;

  try {
    const crmClient = new CRMClient();
    const projectResponse = await crmClient.doGet(`dcp_projects?fetchXml=${projectXMLs.project(id)}`, 1);
    const {value : [project] } = projectResponse;
    postProcess.project(project); 

    const projectId = project.dcp_projectid;
    const projectResult = await Promise.all([
      getChildEntity(crmClient, 'bbl', project),
      getChildEntity(crmClient, 'action', project),
      getChildEntity(crmClient, 'milestone', project),
      getChildEntity(crmClient, 'keyword', project),
      getChildEntity(crmClient, 'applicant', project),
      getChildEntity(crmClient, 'address', project),
    ]);


        res.send({
            "data": { "type": 'projects',
                "id": id,
                "attributes": Object.assign(
                    {},
                    fillTemplate(projectTemplate, project)[0],
                    {
                        bbls: projectResult[0],
                        bbl_multipolygon: {  },
                        actions: fillTemplate(actionTemplate, projectResult[1]),
                        milestones: fillTemplate(milestoneTemplate, projectResult[2]),
                        keywords: projectResult[3],
                        applicantteam: fillTemplate(applicantTeamTemplate, projectResult[4]),
                        addresses: fillTemplate(addressTemplate, projectResult[5]),
                        bbl_featurecollection: {},
                        video_links: []
                    }
                )
            }
        });
  } catch (error) {
    console.log(`Error retrieving project (id: ${id})`, error); // eslint-disable-line
    res.status(404).send({ error: 'Unable to retrieve project' });
  }
});

function pluralizeChildEntity(entityType) {
  if (entityType === 'address') {
    return entityType + 'es'; 
  }

  if (entityType === 'keyword') {
    return entityType + 'ses';
  }

  return entityType + 's';
}

function getChildEntity(crmClient, entityType, project) {
  const projectId = project.dcp_projectid;
  const entityName = `dcp_project${pluralizeChildEntity(entityType)}`;
  const entityXML = projectXMLs[entityType](projectId);

  return crmClient.doGet(`${entityName}?fetchXml=${entityXML}`).then(result => {
    const { value } = result;
    return postProcess[entityType](value, project);
  });
}

module.exports = router;
