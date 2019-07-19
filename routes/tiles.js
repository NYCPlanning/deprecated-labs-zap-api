const express = require('express');
const SphericalMercator = require('sphericalmercator');

const { getTile } = require('../utils/get-geo');

const router = express.Router();
const mercator = new SphericalMercator();

router.get('/:filterId/:z/:x/:y.mvt', async (req, res) => {
  const {
    app: { dbClient, filterCache },
    query : { type = 'centriod' },
    params: { filterId, x, y, z },
  } = req;

  try {
    const projectIds = filterCache.get(filterId);
    const bbox = mercator.bbox(x, y, z, false, '900913');

    const geomColumn = (type === 'centroid') ? 'centroid_3857' : 'polygons_3857';

    const tile = await getTile(dbClient, bbox, geomColumn, projectIds);

    if(!tile || !tile.st_asmvt.length) {
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
