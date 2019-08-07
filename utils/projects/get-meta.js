const { default: turfBbox } = require('@turf/bbox');
const turfBuffer = require('@turf/buffer');
const turfLinestring = require('turf-linestring');
const turfPoint = require('turf-point');

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
    total: projectIds ? projectIds.length : 0,
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

module.exports = { getMeta };
