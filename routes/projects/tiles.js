const express = require('express');
const SphericalMercator = require('sphericalmercator');
const getQueryFile = require('../../utils/get-query-file');

const router = express.Router();
const mercator = new SphericalMercator();

const generateVectorTile = getQueryFile('/helpers/generate-vector-tile.sql');


/* GET /projects/tiles/:tileId/:z/:x/:y.mvt */
/* Retreive a vector tile by tileid */
router.get('/:tileId/:z/:x/:y.mvt', async (req, res) => {
  const { app, params, query } = req;

  const {
    tileId,
    z,
    x,
    y,
  } = params;

  const { type = 'centroid' } = query;
  // retreive the projectids from the cache
  const tileQuery = await app.tileCache.get(tileId);

  // calculate the bounding box for this tile
  const bbox = mercator.bbox(x, y, z, false, '900913');

  const geomColumn = (type === 'centroid') ? 'centroid_3857' : 'polygons_3857';

  try {
    const tile = await app.db.one(generateVectorTile, [...bbox, tileQuery, geomColumn]);

    res.setHeader('Content-Type', 'application/x-protobuf');

    if (tile.st_asmvt.length === 0) {
      res.status(204);
    }
    res.send(tile.st_asmvt);
  } catch (error) {
    console.log('Error generating tile', error); // eslint-disable-line
    res.status(500).send({ error: 'Unable to create tile' });
  }
});

module.exports = router;
