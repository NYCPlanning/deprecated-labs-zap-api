/*eslint-disable */

const express = require('express');
const crmWebAPI = require('../../utils/crmWebAPI');
const fetchXmls = require('../../queries/fetchXmls');
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
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  get project
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const project = await crmWebAPI.get(`dcp_projects?fetchXml=${fetchXmls.fetchProject(id)}`, 1)
        .then( project => projectPostFetchEdits(project["value"][0]) );

    const bbls = getEntity(project, 'bbl');
    const actions = getEntity(project, 'action');
    const milestones = getEntity(project, 'milestone');
    const keywords = getEntity(project, 'keyword');
    const applicantTeams = getEntity(project, 'applicant');
    const addresses = getEntity(project, 'address');


    const projectResult = await Promise.all([bbls, actions, milestones, keywords, applicantTeams, addresses]);

        res.send({
            "data": {
                "type": 'projects',
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

    // project.bbl_featurecollection = {
    //   type: 'FeatureCollection',
    //   features: [{
    //     type: 'Feature',
    //     geometry: JSON.parse(project.bbl_multipolygon),
    //   }],
    // };
    //
    //
    // await normalizeSupportDocs(project);
    // project.video_links = await getVideoLinks(project.dcp_name);
  } catch (error) {
    console.log(`Error retrieving project (id: ${id})`, error); // eslint-disable-line
    res.status(404).send({ error: 'Unable to retrieve project' });
  }
});

module.exports = router;
