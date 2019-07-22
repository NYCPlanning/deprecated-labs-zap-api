const { default: turfBbox } = require('@turf/bbox');
const turfBuffer = require('@turf/buffer');
const turfLinestring = require('turf-linestring');
const turfPoint = require('turf-point');

const geoSQL = require('../queries/geo');

/**
 * Get geo data for projects. Project centers (as points), bounds for a bbox including all projects,
 * and an array including a tile template are returned.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {String} filterId The unqiue filterId to use in the tile template
 * @param {String[]} projectIds The projectIds to get geo data for
 * @returns {Object} Object containing projectCenters, bounds, and tiles
 */
async function getProjectsGeo(dbClient, filterId, projectIds) {
  if (!projectIds.length) return {};

  const projectsCenters = await dbClient.any(geoSQL.centers, [projectIds]);
  const bounds = getBounds(projectsCenters);
  const tiles = getTileTemplate(filterId, projectIds);

  return {
    projectsCenters,
    bounds,
    tiles,
  };
}

/**
 * Gets bounds for a bbox including all project centroids.
 *
 * @param {Point[]} projectCenters Array of centroids, represented as [X,Y] point Arrays
 * @returns {[Point, Point]} Bbox bounds, as Array of [min point, max point].
 */
function getBounds(projectCenters) {
  const centers = projectCenters.map(projectCenter => projectCenter.center);

  // add padding before generating a bbox for a single point
  if (centers.length === 1) {
    const [minX, minY, maxX, maxY] = turfBbox(turfBuffer(turfPoint(centers[0]), 0.4));
    return [[minX, minY], [maxX, maxY]];
  }

  const [minX, minY, maxX, maxY] = turfBbox(turfLinestring(centers));
  return [[minX, minY], [maxX, maxY]];
}

/**
 * Gets tile template for the given filterId, as a String Array.
 *
 * @param {String} filterId The filterId to use in tile template
 */
function getTileTemplate(filterId) {
  return [`${process.env.HOST}/projects/tiles/${filterId}/{z}/{x}/{y}.mvt`];
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
 * Get geo data for project. MultiPolygon of all BBLs, and FeatureCollection containing MultiPolygon
 * is returned.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {String} projectId The projectId to get geo for
 * @returns {Object} containing bblMultipolygon and bblFeatureCollection
 */
async function getProjectGeo(dbClient, projectId) {
  return dbClient.one(geoSQL.bbl_multipolygon, projectId)
    .then(feature => ({ bblMultipolygon: JSON.parse(feature.geom), bblFeatureCollection: makeFeatureCollection([feature]) }))
    .catch((e) => {
      console.log(`Failed to fetch geos for project ${projectId}:`, e); // eslint-disable-line
      return {};
    });
}

/**
 * Helper function to format an Array of features into a FeatureCollection
 *
 * @param {Object[]} features The features to format into FeatureCollection
 * @returns {Object} FeatureCollection
 */
function makeFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features: features.map((feature) => {
      const { geom } = feature;
      delete feature.geom;

      return {
        type: 'Feature',
        geometry: JSON.parse(geom),
        properties: feature,
      };
    }),
  };
}

/**
 * Gets projectIds with centroids inside a circle defined by `query.distance_from_point`
 * (which represents the center point of the circle), and `query.radius_from_point` (which
 * defines the radius of the circle).
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {Object} query The query object from HTTP request, including query params
 * @returns {String[]} The list of all projectIds with centroids in
 */
async function getRadiusBoundedProjects(dbClient, query) {
  const METERS_TO_FEET_MULT = 3.28084;
  const point = query.distance_from_point || [];
  const distance = query.radius_from_point || 10;

  if (point.length && distance) {
    const distanceFeet = distance * METERS_TO_FEET_MULT;
    const projectIds = await dbClient.any(geoSQL.radius_search, [...point, distanceFeet]);
    return projectIds.map(projectId => projectId.projectid).slice(0, 10);
  }

  return [];
}

/**
 * Gets MVT Tile, bounded by the given bbox, containing geomColumn-type geoms for the given projectIds
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {int[]} bbox An array representing bbox as [minx, miny, maxx, maxy]
 * @param {String} geomColumn The column to select as geom; must be a geom column in `project_geoms` (centroid_3857, polygons_3857)
 * @param {String[]} projectIds The array of projectIds to include as geometries in the tile
 * @returns {String} The MVT tile as binary string
 */
async function getTile(dbClient, bbox, geomColumn, projectIds) {
  if (projectIds.length) {
    return dbClient.one(geoSQL.generate_vector_tile, [...bbox, geomColumn, projectIds]);
  }

  return '';
}

module.exports = {
  getRadiusBoundedProjects,
  getProjectsGeo,
  getProjectsDownloadGeo,
  getProjectGeo,
  getTile,
};
