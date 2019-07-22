const express = require('express');

const { postProcessProject } = require('../utils/post-process');
const { getProjectEntities } = require('../utils/get-entities');
const { getProjectGeo } = require('../utils/get-geo');
const { projectXML } = require('../queries/project-xmls');

const router = express.Router({ mergeParams: true });

/**
 * Returns a single project entity, with child entities and geodata added.
 *
 * A project resource returned by this route is defined in `/response-templates/project.js`
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, crmClient },
    params: { id },
  } = req;

  try {
    // Fetch project
    const { value: [project] } = await crmClient.doGet(`dcp_projects?fetchXml=${projectXML(id)}`);

    if (!project) {
      console.log(`Project ${id} not found`); // eslint-disable-line
      res.status(404).send({ error: `Project ${id} not found` });
      return;
    }

    // Fetch related entities and get geo data
    const entities = await getProjectEntities(crmClient, project.dcp_projectid);
    const geo = await getProjectGeo(dbClient, project.dcp_name);

    // Add entities and geo dat to the project object, and format
    const formattedProject = await postProcessProject(project, entities, geo);

    res.send({
      data: {
        type: 'projects',
        id,
        attributes: formattedProject,
      },
    });
  } catch (error) {
    console.log(`Error retrieving project (id: ${id})`, error); // eslint-disable-line
    res.status(500).send({ error: 'Unable to retrieve project' });
  }
});

module.exports = router;
