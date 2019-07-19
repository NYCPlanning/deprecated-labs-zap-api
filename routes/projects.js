const express = require('express');
const shortid = require('shortid');

const { getProjectsEntities } = require('../utils/get-entities');
const { postProcessProjects } = require('../utils/post-process');
const { getProjectsGeo, getRadiusBoundedProjects } = require('../utils/get-geo');
const { projectsXML } = require('../queries/projects-xmls');

const router = express.Router({ mergeParams: true });

/* gets a JSON array of projects that match the query params */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, filterCache, crmClient },
    query,
  } = req;

  try {
    const radiusBoundedProjectIds = await getRadiusBoundedProjects(dbClient, query);
    const { value: projects } = await crmClient.doBatchPost('dcp_projects', projectsXML(query, radiusBoundedProjectIds));

    const projectUUIDs = projects.map(project => project.dcp_projectid);
    const projectIds = projects.map(project => project.dcp_name);
    const filterId = shortid.generate();
    await filterCache.set(filterId, projectIds);

    const entities = await getProjectsEntities(crmClient, projectUUIDs);
    const { projectsCenters, bounds, tiles } = await getProjectsGeo(dbClient, filterId, projectIds);

    const formattedProjects = postProcessProjects(projects, entities, projectsCenters);

    res.send({
      data: formattedProjects.map(project => ({
        type: 'projects',
        id: project.dcp_name,
        attributes: project,
      })),
      meta: {
        total: projects.length,
        totalLimitExceeded: projects.length === 5000,
        pageTotal: query.itemsPerPage || 30,
        tiles,
        bounds,
        filterId,
      },
    });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
});

module.exports = router;
