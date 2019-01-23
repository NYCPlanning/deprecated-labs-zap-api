const express = require('express');
const turfBbox = require('@turf/bbox');
const turfBuffer = require('@turf/buffer');
const shortid = require('shortid');


const buildProjectsSQL = require('../../utils/build-projects-sql');
const getQueryFile = require('../../utils/get-query-file');


const router = express.Router();

// import subroutes
router.use('/download.csv', require('./download'));
router.use('/feedback', require('./feedback'));
router.use('/new-filed', require('./new-filed'));
router.use('/:id', require('./project'));
router.use('/update-geometries/:id', require('./update-geometries'));
router.use('/slack', require('./slack'));
router.use('/tiles', require('./tiles'));
router.use('/ceqr', require('./ceqr'));
router.use('/ulurp', require('./ulurp'));

const boundingBoxQuery = getQueryFile('helpers/bounding-box-query.sql');

/* GET /projects */
/* gets a JSON array of projects that match the query params */
router.get('/', async (req, res) => {
  const { app, query } = req;

  const SQL = buildProjectsSQL(query);

  try {
    const projects = await app.db.any(SQL);

    const [{ total_projects: total = 0 } = {}] = projects || [];
    const { length = 0 } = projects;

    // if this is the first page of a new query, include bounds for the query's geoms, and a vector tile template
    let tileMeta = {};
    const { page } = query;
    if (page === '1') {
      const tileQuery = buildProjectsSQL(query, 'tiles');

      // create array of projects that have geometry
      const projectsWithGeometries = projects.filter(project => project.has_centroid);

      // get the bounds for projects with geometry
      // default to a bbox for the whole city
      // if project list has no geometries (projectsWithGeometries is 0) default to whole city
      let bounds = [[-74.2553345639348, 40.498580711525], [-73.7074928813077, 40.9141778017518]];

      if (projectsWithGeometries.length > 0) {
        bounds = await app.db.one(boundingBoxQuery, { tileQuery });
        bounds = bounds.bbox;
      }

      // if y coords are the same for both corners, the bbox is for a single point
      // to prevent fitBounds being lame, wrap a 600m buffer around the point

      if (bounds[0][0] === bounds[1][0]) {
        const point = {
          type: 'Point',
          coordinates: [
            bounds[0][0],
            bounds[0][1],
          ],
        };
        const buffer = turfBuffer(point, 0.4);
        const bbox = turfBbox.default(buffer);
        bounds = [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ];
      }

      // create a shortid for this query and store it in the cache
      const tileId = shortid.generate();
      await app.tileCache.set(tileId, tileQuery);

      tileMeta = {
        tiles: [`${process.env.HOST}/projects/tiles/${tileId}/{z}/{x}/{y}.mvt`],
        bounds,
      };
    }

    // send the response with a tile template
    res.send({
      data: projects.map(project => ({
        type: 'projects',
        id: project.dcp_name,
        attributes: project,
      })),
      meta: {
        total,
        pageTotal: length,
        ...tileMeta,
      },
    });
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
