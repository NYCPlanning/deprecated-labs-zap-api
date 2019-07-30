const express = require('express');
const SphericalMercator = require('sphericalmercator');

const { getTile } = require('../utils/get-geo');

const router = express.Router();
const mercator = new SphericalMercator();

/**
 * Returns a MVT tile containing the project centroids for a specified project queryId;
 * requires that a filtered project dataset was previously generated via the `/projects` route.
 * FilterIds remain in the cache for one hour. Tile is created using PostGIS As_MVT() function.
 *
 * See: `/queries/geo.js` generate_vector_tile for tile query.
 */
router.get('/:queryId/:z/:x/:y.mvt', async (req, res) => {
  const {
    app: { dbClient, queryCache },
    query: { type = 'centriod' },
    params: {
      queryId, x, y, z,
    },
  } = req;

  try {
    // Get project ids for the given queryId
    const projectIds = queryCache.get(queryId);

    // Determine geom column name
    const geomColumn = (type === 'centroid') ? 'centroid_3857' : 'polygons_3857';
    // Generate tile bbox
    const bbox = mercator.bbox(x, y, z, false, '900913');

    // Get tile using PostGIS As_MVT() function
    const tile = await getTile(dbClient, bbox, geomColumn, projectIds);

    if (!tile || !tile.st_asmvt.length) {
      res.status(204).end();
      return;
    }

    res.setHeader('Content-Type', 'application/x-protobuf');
    res.send(tile.st_asmvt);
  } catch (error) {
    console.log(`Unable to create tile for projects:`, error); // eslint-disable-line
    res.status(500).send({ error: 'Unable to create tile' });
  }
});

module.exports = router;
