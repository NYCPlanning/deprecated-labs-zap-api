const { default: turfBbox } = require('@turf/bbox');
const turfBuffer = require('@turf/buffer');
const turfLinestring = require('turf-linestring');
const turfPoint = require('turf-point');

const makeFeatureCollection = require('../make-feature-collection');
const geoSQL = require('../../queries/geo');

/**
 * Get geo data for projects. Project centers (as points), bounds for a bbox including all projects,
 * and an array including a tile template are returned.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {String} queryId The unqiue queryId to use in the tile template
 * @param {String[]} projectIds The projectIds to get geo data for
 * @returns {Object} Object containing projectCenters, bounds, and tiles
 */
async function getProjectsGeo(dbClient, queryId, projectIds) {
  const projectsCenters = !projectIds.length ? [] : await dbClient.any(geoSQL.centers, [projectIds]);
  const bounds = getBounds(projectsCenters);
  const tiles = getTileTemplate(queryId);

  return {
    projectsCenters,
    bounds,
    tiles,
  };
}

/**
 * Gets projectIds with centroids inside a circle defined by `query.distance_from_point`
 * (which represents the center point of the circle), and `query.radius_from_point` (which
 * defines the radius of the circle).
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {Object} query The query object from HTTP request, including query params
 * @returns {String[]\|false} The list of all projectIds with centroids in the bounding radius,
 * or false if there are NO projects within the radius, as this means NO projects meet query criteria
 * and NO CRM queries need to be made.
 */
async function getRadiusBoundedProjects(dbClient, query) {
  const FEET_TO_METERS_MULT = 0.3048;
  const point = query.distance_from_point || [];
  const distance = query.radius_from_point || 10;

  if (point.length && distance) {
    const distanceFeet = distance * FEET_TO_METERS_MULT;
    const projectIds = await dbClient.any(geoSQL.radius_search, [...point, distanceFeet]);
    return projectIds.length ? projectIds.map(projectId => projectId.projectid).slice(0, 10) : false;
  }

  return [];
}

/**
 * Get geo data for projects download. FeatureCollections containing MultiPolygons
 * for each project are returned.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {String[]} projectIds The projectIds to get download geos for
 * @returns {Object[]} An Array containing FeatureCollection objects for each project
 */
async function getProjectsDownloadGeo(dbClient, projectIds) {
  return dbClient.any(geoSQL.bbl_multipolygons, [projectIds])
    .then(features => makeFeatureCollection(features));
}

/**
 * Gets bounds for a bbox including all project centroids.
 *
 * @param {Point[]} projectCenters Array of centroids, represented as [X,Y] point Arrays
 * @returns {[Point, Point]} Bbox bounds, as Array of [min point, max point].
 */
function getBounds(projectCenters) {
  const centers = projectCenters.map(projectCenter => projectCenter.center);

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
 * Gets tile template for the given queryId, as a String Array.
 *
 * @param {String} queryId The queryId to use in tile template
 */
function getTileTemplate(queryId) {
  return [`${process.env.HOST}/projects/tiles/${queryId}/{z}/{x}/{y}.mvt`];
}

module.exports = {
  getRadiusBoundedProjects,
  getProjectsGeo,
  getProjectsDownloadGeo,
};
