const express = require('express');
const shortid = require('shortid');

const dedupeList = require('../utils/dedupe-list');
const { getProjectsEntities } = require('../utils/get-entities');
const { postProcessProjects } = require('../utils/post-process');
const { getProjectsGeo, getRadiusBoundedProjects } = require('../utils/get-geo');
const { allProjectsXML, projectsXML } = require('../queries/projects-xmls');

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
    } = await getAllProjectsMeta(dbClient, crmClient, query, queryCache);

    // Get page of projects
    const projectIds = allProjectIds.slice(page, page * itemsPerPage);
    const { value: projects } = await crmClient.doBatchPost('dcp_projects', projectsXML(projectIds));

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

/**
 * Returns some metadata for the filtered dataset: the total # of results, the queryId to identify
 * the specific query defining this filtered dataset, and the full list of projectIds meeting the
 * criteria of this query.
 *
 * If queryId is present, indicates resources are being requested for a query that has
 * already been set up. In that case, grab the projectIds matching the query from the query
 * cache. If the queryIdHeader is missing, indicates a new query is being requested. In that case,
 * generate a new queryId, generate the list of projectIds matching query from request query params
 * and radius bounded projectIds.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {Object} query The query params from the request
 * @param {NodeCache} queryCache The NodeCache instance used by the app to store projectIds for querys
 * @returns {Object} Object containing totalProjectsCount, queryId, and projectIds
 */
async function getAllProjectsMeta(dbClient, crmClient, query, queryCache) {
  let { queryId } = query;
  // If queryId exists, but does not have a valid entry in the cache, just assume an empty array
  let allProjectIds = queryId ? (queryCache.get(queryId) || []) : [];
  let totalProjectsCount = allProjectIds.length;

  // If no queryId is provided, assume this is a new query search
  if (!queryId) {
    const radiusBoundedProjectIds = await getRadiusBoundedProjects(dbClient, query);
    const { value: allProjects } = await crmClient.doBatchPost('dcp_projects', allProjectsXML(query, radiusBoundedProjectIds));

    // Store projectIds matching this query in the cache
    queryId = shortid.generate();
    allProjectIds = dedupeList(allProjects.map(project => project.dcp_name));
    totalProjectsCount = allProjectIds.length;
    await queryCache.set(queryId, allProjectIds);
  }

  return {
    totalProjectsCount, queryId, allProjectIds,
  };
}
module.exports = router;
