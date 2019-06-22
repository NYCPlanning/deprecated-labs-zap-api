const express = require('express');

const { getProjectsEntities } = require('../utils/projects/get-entities');
const { postProcessProjects } = require('../utils/projects/post-process');
const { getProjectsGeo } = require('../utils/projects/get-geo');
const { getAllProjects } = require('../utils/projects/get-projects');
const { projectsXML } = require('../queries/projects-xmls');

const router = express.Router({ mergeParams: true });

const MAX_PAGE_SIZE = 50;
/**
 * Returns paginated set of projects meeting the defined projects query.
 * To implement the radius filter search, a full set of all project ids within the radius
 * are retrieved from the PostgreSQL geo database, and used as filters in the fetchXML.
 * The resulting fetchXML can be too long to send as a querystring on a GET request, and so
 * projects are fetched using the 'batch operations' POST fetch to execute GETs
 * with long query strings. Pagination requests should include a `queryId` querystring param,
 * to enable id-based queries for pagination.
 *
 * A project resource returned by this route is defined in `/response-templates/projects.js`
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, queryCache, crmClient },
    query,
  } = req;

  const { page = 1, itemsPerPage = MAX_PAGE_SIZE } = query;
  if (itemsPerPage > MAX_PAGE_SIZE) {
    res.status(400).send({ error: 'Maximum allowed "itemsPerPage" is 50' });
    return;
  }

  try {
    // Get project query metadata (total # of projects, all projectIds)
    const {
      totalProjectsCount, queryId, allProjectIds,
    } = await getAllProjects(dbClient, crmClient, query, queryCache);

    // Get page of projects
    const projectIds = allProjectIds.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const { value: projects } = projectIds.length === 0
      ? { value: [] }
      : await crmClient.doBatchPost('dcp_projects', projectsXML(projectIds));

    // Fetch related entities for all projects
    const projectUUIDs = projects.map(project => project.dcp_projectid);
    const entities = await getProjectsEntities(crmClient, projectUUIDs);

    // Get geo data for all projects
    const { projectsCenters, bounds, tiles } = await getProjectsGeo(dbClient, queryId, projectIds);

    // Add entities and geo data to the project objects, and format
    const formattedProjects = postProcessProjects(projects, entities, projectsCenters);

    res.send({
      data: formattedProjects.map(project => ({
        type: 'projects',
        id: project.dcp_name,
        attributes: project,
      })),
      meta: {
        total: totalProjectsCount,
        totalLimitExceeded: totalProjectsCount >= 5000,
        pageTotal: query.itemsPerPage || MAX_PAGE_SIZE,
        tiles,
        bounds,
        queryId,
      },
    });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
});

module.exports = router;
