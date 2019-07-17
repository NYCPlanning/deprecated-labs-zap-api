const express = require('express');
const shortid = require('shortid');

const CRMClient = require('../../utils/crm-client');
const { projectsXML } = require('../../queries/projects-xmls');
const { getProjectsEntities } = require('../../utils/get-entities');
const { postProcessProjects } = require('../../utils/post-process');
const { getProjectsGeo, getRadiusBoundedProjects } = require('../../utils/get-geo');


const router = express.Router({ mergeParams: true });

/* gets a JSON array of projects that match the query params */
router.get('/', async (req, res) => {
  const { app: { db, filterCache }, query } = req;

  try {
    const crmClient = new CRMClient();
    const radiusBoundedProjectIds = await getRadiusBoundedProjects(db, query);
    const { value: projects } = await crmClient.doBatchPost('dcp_projects', projectsXML(query, radiusBoundedProjectIds));

    const projectUUIDs = projects.map(project => project.dcp_projectid);
    const projectIds = projects.map(project => project.dcp_name);

    const entities = await getProjectsEntities(crmClient, projectUUIDs);
    const filterId = shortid.generate();
    await filterCache.set(filterId, projectIds); 
    const { projectsCenters, bounds, tiles } = await getProjectsGeo(db, filterId, projectIds);

    postProcessProjects(projects, entities, projectsCenters);

    res.send({
      data: projects.map((project) => {
        return {
          type: 'projects',
          id: project.dcp_name,
          attributes: project,
        };
      }),
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
