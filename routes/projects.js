const express = require('express');
const shortid = require('shortid');

const { getProjectsEntities } = require('../utils/get-entities');
const { postProcessProjects } = require('../utils/post-process');
const { getProjectsGeo, getRadiusBoundedProjects } = require('../utils/get-geo');
const { allProjectsXML, projectsXML } = require('../queries/projects-xmls');

const router = express.Router({ mergeParams: true });

const DEFAULT_PAGE_SIZE = 30;
/**
 * Returns paginated set of projects meeting the defined projects query.
 * To implement the radius filter search, a full set of all project ids within the radius
 * are retrieved from the PostgreSQL geo database, and used as filters in the fetchXML.
 * The resulting fetchXML can be too long to send as a querystring on a GET request, and so
 * projects are fetched using the 'batch operations' POST fetch to execute GETs
 * with long query strings.
 *
 * A project resource returned by this route is defined in `/response-templates/projects.js`
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, queryCache, crmClient },
    query,
  } = req;

  try {
    // Get page of projects
    const {
      totalProjectsCount, queryId, projectIds, projects,
    } = await getProjects(req.get('X-Query-Id'), dbClient, crmClient, query, queryCache);

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
        pageTotal: query.itemsPerPage || DEFAULT_PAGE_SIZE,
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
 * Gets page of projects requested by the response, and returns projects, plus totalProjectsCount,
 * queryId and projectIds.
 *
 * If queryIdHeader is present, indicates resources are being requested for a query that has
 * already been set up. In that case, grab the projectIds matching the query from the query
 * cache. If the queryIdHeader is missing, indicates a new query is being requested. In that case,
 * generate a new queryId, generate the list of projectIds matching query with query params
 * and radius bounded project Ids. Use projectIds to format the XML for projects, which leverages
 * pagination from CRM to paginate results for the frontend.
 *
 * @param {String} queryIdHeader The value of the 'X-Filter-Id' header, or undefined
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {Object} query The query params from the request
 * @param {NodeCache} queryCache The NodeCache instance used by the app to store projectIds for querys
 * @returns {Object} Object containing queryId, projectIds, and project objects
 */
async function getProjects(queryIdHeader, dbClient, crmClient, query, queryCache) {
  let queryId = queryIdHeader;
  let allProjectIds = queryId ? queryCache.get(queryId) : [];
  let totalProjectsCount = allProjectIds.length;
  // If no queryId is provided in headers, assume this is a new query search
  if (!queryId) {
    const radiusBoundedProjectIds = await getRadiusBoundedProjects(dbClient, query);
    const { value: allProjects } = await crmClient.doBatchPost('dcp_projects', allProjectsXML(query, radiusBoundedProjectIds));

    // Store projectIds matching this query in the cache
    queryId = shortid.generate();
    allProjectIds = allProjects.map(project => project.dcp_name);
    totalProjectsCount = allProjectIds.length;
    await queryCache.set(queryId, allProjectIds);
  }

  // Do normal paginated projects request
  const { page = 1, itemsPerPage = DEFAULT_PAGE_SIZE } = query;
  const { value: projects } = !allProjectIds.length ? { value: [] }
    : await crmClient.doBatchPost('dcp_projects', projectsXML(allProjectIds, page, itemsPerPage));
  const projectIds = projects.map(project => project.dcp_name);
  return {
    totalProjectsCount, queryId, projectIds, projects,
  };
}
module.exports = router;
