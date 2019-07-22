const express = require('express');
const shortid = require('shortid');

const { getProjectsEntities } = require('../utils/get-entities');
const { postProcessProjects } = require('../utils/post-process');
const { getProjectsGeo, getRadiusBoundedProjects } = require('../utils/get-geo');
const { allProjectsXML, projectsXML } = require('../queries/projects-xmls');

const router = express.Router({ mergeParams: true });

const DEFAULT_PAGE_SIZE = 30;
/**
 * Returns paginated set of projects meeting the defined projects filter.
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
    app: { dbClient, filterCache, crmClient },
    query,
  } = req;

  try {
    // Get page of projects
    const {
      totalProjectsCount, filterId, projectIds, projects,
    } = await getProjects(req.get('X-Filter-Id'), dbClient, crmClient, query, filterCache);

    // Fetch related entities for all projects
    const projectUUIDs = projects.map(project => project.dcp_projectid);
    const entities = await getProjectsEntities(crmClient, projectUUIDs);

    // Get geo data for all projects
    const { projectsCenters, bounds, tiles } = await getProjectsGeo(dbClient, filterId, projectIds);

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
        filterId,
      },
    });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
});

/**
 * Gets page of projects requested by the response, and returns projects, plus totalProjectsCount,
 * filterId and projectIds.
 *
 * If filterIdHeader is present, indicates resources are being requested for a filter that has
 * already been set up. In that case, grab the projectIds matching the filter from the filter
 * cache. If the filterIdHeader is missing, indicates a new filter is being requested. In that case,
 * generate a new filterId, generate the list of projectIds matching filter with query params
 * and radius bounded project Ids. Use projectIds to format the XML for projects, which leverages
 * pagination from CRM to paginate results for the frontend.
 *
 * @param {String} filterIdHeader The value of the 'X-Filter-Id' header, or undefined
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {Object} query The query params from the request
 * @param {NodeCache} filterCache The NodeCache instance used by the app to store projectIds for filters
 * @returns {Object} Object containing filterId, projectIds, and project objects
 */
async function getProjects(filterIdHeader, dbClient, crmClient, query, filterCache) {
  let filterId = filterIdHeader;
  let allProjectIds = filterId ? filterCache.get(filterId) : [];
  let totalProjectsCount = allProjectIds.length;
  // If no filterId is provided in headers, assume this is a new filter search
  if (!filterId) {
    const radiusBoundedProjectIds = await getRadiusBoundedProjects(dbClient, query);
    const { value: allProjects } = await crmClient.doBatchPost('dcp_projects', allProjectsXML(query, radiusBoundedProjectIds));

    // Store projectIds matching this filter in the cache
    filterId = shortid.generate();
    allProjectIds = allProjects.map(project => project.dcp_name);
    totalProjectsCount = allProjectIds.length;
    await filterCache.set(filterId, allProjectIds);
  }

  // Do normal paginated projects request
  const { page = 1, itemsPerPage = DEFAULT_PAGE_SIZE } = query;
  const { value: projects } = !allProjectIds.length ? { value: [] }
    : await crmClient.doBatchPost('dcp_projects', projectsXML(allProjectIds, page, itemsPerPage));
  const projectIds = projects.map(project => project.dcp_name);
  return {
    totalProjectsCount, filterId, projectIds, projects,
  };
}
module.exports = router;
