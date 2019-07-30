const makeFeatureCollection = require('../make-feature-collection');
const geoSQL = require('../../queries/geo');

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

module.exports = {
  getProjectGeo,
};
