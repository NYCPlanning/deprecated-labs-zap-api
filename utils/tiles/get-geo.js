const geoSQL = require('../../queries/geo');

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
  getTile,
};
