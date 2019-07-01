/*eslint-disable */

const express = require('express');
const crmWebAPI = require('../../utils/crmWebAPI');
const router = express.Router({ mergeParams: true });
const postFetchEdits = require('../../utils/postFetchEdits');


/* GET /demoGet/:id */
/* Retreive a single project */
router.get('/', async (req, res) => {
  const { params } = req;
  const { id } = params;

  const {
      getEntity,
      projectPostFetchEdits
  } = postFetchEdits;

  try {
    const project = await crmWebAPI.get(`dcp_projects?fetchXml=${fetchDemo(id)}`, 1)
        .then( project => projectPostFetchEdits(project["value"][0]) );

    const milestones = await getEntity(project, 'milestone');


        res.send({
            "data": {
                "type": 'projects',
                "id": id,
                "attributes": Object.assign(
                    {},
                    project,
                    {
                        milestones: milestones
                    }
                )
            }
        });

  } catch (error) {
    console.log(`Error retrieving project (id: ${id})`, error); // eslint-disable-line
    res.status(404).send({ error: 'Unable to retrieve project' });
  }
});

module.exports = router;

const fetchDemo =  projectName => [
  `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true">`,
  `<entity name="dcp_project">`,
  `<attribute name="dcp_name"/>`,
  `<attribute name="statuscode"/>`,
  `<attribute name="dcp_projectname"/>`,
  `<attribute name="dcp_borough"/>`,
  `<attribute name="dcp_certificationtargetdate"/>`,
  `<attribute name="dcp_ulurp_nonulurp"/>`,
  `<attribute name="dcp_leadplanner"/>`,
  `<attribute name="dcp_leadaction"/>`,
  `<attribute name="dcp_currentmilestone"/>`,
  `<attribute name="dcp_projectid"/>`,
  `<link-entity name="dcp_projectmilestone" from="dcp_project" to="dcp_projectid" link-type="inner" alias="ac"/>`,
  `<link-entity name="dcp_projectmilestone" from="dcp_projectmilestoneid" to="dcp_currentmilestone" visible="false" link-type="outer" alias="a_f96bc092c831e811812a1458d04d06c8">`,
  `<attribute name="dcp_plannedcompletiondate"/>`,
  `<attribute name="dcp_goalduration"/>`,
  `<attribute name="dcp_actualstartdate"/>`,
  `<attribute name="dcp_actualenddate"/>`,
  `</link-entity>`,
  `<filter type="and">`,
  `<condition attribute="dcp_name" operator="eq" value="${projectName}" />`,
  `</filter>`,
  `</entity>`,
  `</fetch>`
].join('');
