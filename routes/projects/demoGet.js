/*eslint-disable */

const express = require('express');
const crmWebAPI = require('../../utils/crmWebAPI');
const fetchXmls = require('../../queries/fetchXmls');
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

  try {
    const project = await crmWebAPI.get(`dcp_projects?fetchXml=${fetchXmls.fetchProject(id)}`, 1)
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
