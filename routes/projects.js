const express = require('express');
const shortid = require('shortid');
const { default: turfBbox } = require('@turf/bbox');
const turfBuffer = require('@turf/buffer');
const turfLinestring = require('turf-linestring');
const turfPoint = require('turf-point');

const { projectsAllIdsSQL } = require('../queries/sql/projects-all-ids');
const { projectsResultsSQL } = require('../queries/sql/projects-results');

const router = express.Router({ mergeParams: true });

/**
 * Returns paginated set of projects meeting the defined projects query.
 * Pagination requests should include a `queryId` querystring param, to enable id-based quering.
 *
 * A project resource returned by this route is defined in `/response-templates/projects.js`
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, queryCache },
    query,
  } = req;

  const { page = '1', itemsPerPage = '30' } = query;

  try {
    // Get all projectIds that fit given query filters
    const { projectIds, queryId } = await getOrCreateQuery(dbClient, queryCache, page, query);

    const targetQuery = projectsResultsSQL(projectIds, page, itemsPerPage);

    // Get page of projects from projectIds
    const projects = !projectIds.length ? []
      : await dbClient.any(targetQuery);

    res.send({
      data: projects.map(project => ({
        type: 'projects',
        id: project.dcp_name,
        attributes: project,
      })),
      meta: getMeta(projectIds, projects, page, queryId),
    });
  } catch (e) {
    if (e instanceof BadRequestError) {
      res.status(400).send({ error: e.message });
      return;
    }

    console.log(e); // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
});

/**
 * Allows for querying by a list of projectIds (which is usually too long to be URI params,
 * so for simplicity just implementing this as a post).
 */
router.post('/', async (req, res) => {
  const {
    app: { dbClient },
    body: {
      projectIds,
      page = 1,
      itemsPerPage = 30,
    },
  } = req;

  try {
    const projects = !projectIds.length ? []
      : await dbClient.any(projectsResultsSQL(projectIds, page, itemsPerPage));
    res.send({
      data: projects.map(project => ({
        type: 'projects',
        id: project.dcp_name,
        attributes: project,
      })),
      meta: getMeta(projectIds, projects, page),
    });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
});


/**
 * Returns list of projectIds meeting the filters described by the given
 * query (defined by query parameters, or queryId). If new query (i.e. no queryId
 * param is not supplied): query PostgreSQL for projectIds that fit
 * the query filters, create a queryId, and cache the projectIds with queryId
 * as the key. If requesting a next page from existing query: rely on queryId from
 * request query params and projectIds from cache.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {NodeCache} queryCache The app cache that stores filtered projectIds for a given query
 * @param {String} page The page being requested
 * @param {Object} query The full set of request querystring params
 */
async function getOrCreateQuery(dbClient, queryCache, page, query) {
  let { queryId } = query;
  let projectIds = queryId ? queryCache.get(queryId) : [];

  if (!queryId) {
    const targetQuery = projectsAllIdsSQL(query);

    projectIds = await dbClient.any(targetQuery)
      .then(projects => projects.map(project => project.dcp_name));
    queryId = shortid.generate();
    await queryCache.set(queryId, projectIds);
  }

  if (queryCache.get(queryId) === undefined) throw new BadRequestError(`queryId ${queryId} is invalid`);

  return { projectIds, queryId };
}

/**
 * Get fields for `meta` property of response; tiles and bounds are
 * only included in a first page of results.
 *
 * @param {String[]} projectIds The list of projectIds that fit query filters
 * @param {Object[]} projects The list of projects in the current page of results
 * @param {String} page The page being requested
 * @param {String} queryId The unique id representing projects that meet query filters
 * @returns {Object} Object containing metadata for response
 */
function getMeta(projectIds, projects, page, queryId) {
  const meta = {
    queryId,
    total: projectIds.length,
    pageTotal: projects.length,
  };

  if (page === '1') {
    meta.tiles = getTileTemplate(queryId);
    meta.bounds = getBounds(projects.map(project => project.center));
  }

  return meta;
}

/**
 * Composes a template URL for vector tiles including all of the projects associated
 * with the queryId
 *
 * @param {String} queryId The unique id representing projects that meet query filters
 * @returns {String[]} Array containing the vector tile template string
 */
function getTileTemplate(queryId) {
  return [`${process.env.HOST}/projects/tiles/${queryId}/{z}/{x}/{y}.mvt`];
}

/**
 * Generates bounds for the projects that meet query filters, adding padding if there
 * is only one project with geometries in the filtered set. If no projects with geometries
 * (or no projects), supplies default bounds for NYC.
 *
 * @params {Point[]} projectCenters Array of centers as Points ([X, Y]) for all projects
 * @params {[Point, Point]} Bounds as array of Points [min, max]
 */
function getBounds(projectCenters) {
  const centers = projectCenters.filter(center => center && center[0] && center[1]);

  // if none of the results are mapped, return a default bbox for NYC
  if (centers.length === 0) {
    return [
      [-74.2553345639348, 40.498580711525],
      [-73.7074928813077, 40.9141778017518],
    ];
  }

  // add padding before generating a bbox for a single point
  if (centers.length === 1) {
    const [minX, minY, maxX, maxY] = turfBbox(turfBuffer(turfPoint(centers[0]), 0.4));
    return [[minX, minY], [maxX, maxY]];
  }

  const [minX, minY, maxX, maxY] = turfBbox(turfLinestring(centers));
  return [[minX, minY], [maxX, maxY]];
}

/**
 * Custom Error class to enable returning 400 responses from thrown exceptions,
 * instead of only 500s
 */
class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
  }
}

module.exports = router;
