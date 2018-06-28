const express = require('express');
const path = require('path');
const SphericalMercator = require('sphericalmercator');
const NodeCache = require('node-cache');
const shortid = require('shortid');
const generateDynamicQuery = require('../utils/generate-dynamic-sql');

const mercator = new SphericalMercator();
// tileCache key/value pairs expire after 1 hour
const tileCache = new NodeCache({ stdTTL: 3600 });
const router = express.Router();

// log the SQL query
const initOptions = {
  query(e) {
     (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  },
};

const pgp = require('pg-promise')(initOptions);
const getBblFeatureCollection = require('../utils/get-bbl-feature-collection');

// initialize database connection
const db = pgp(process.env.DATABASE_CONNECTION_STRING);
const host = process.env.HOST;

// helper for linking to external query files:
function sql(file) {
  const fullPath = path.join(__dirname, file);
  return new pgp.QueryFile(fullPath, { minify: true });
}

// import sql query templates
const listProjectsQuery = sql('../queries/projects/index.sql');
const findProjectQuery = sql('../queries/projects/show.sql');
const paginateQuery = sql('../queries/helpers/paginate.sql');
const standardColumns = sql('../queries/helpers/standard-projects-columns.sql');
const boundingBoxQuery = sql('../queries/helpers/bounding-box-query.sql');
const generateVectorTile = sql('../queries/helpers/generate-vector-tile.sql');

/* GET /projects */
router.get('/', async (req, res) => {
  // extract params, set defaults
  const {
    query: {
      // pagination
      page = '1',
      itemsPerPage = 30,

      // filters
      'community-districts': communityDistricts = [],
      dcp_ceqrtype = ['Type I', 'Type II', 'Unlisted', 'Unknown'],
      dcp_ulurp_nonulurp = ['ULURP', 'Non-ULURP'],
      dcp_femafloodzonev = false,
      dcp_femafloodzonecoastala = false,
      dcp_femafloodzonea = false,
      dcp_femafloodzoneshadedx = false,
      dcp_publicstatus = ['Complete', 'Filed', 'Certified', 'Unknown'],
      text_query = '',
    },
  } = req;

  const paginate = generateDynamicQuery(paginateQuery, { itemsPerPage, offset: (page - 1) * itemsPerPage });
  const communityDistrictsQuery =
    communityDistricts[0] ? pgp.as.format('AND dcp_validatedcommunitydistricts ilike any (array[$1:csv])', [communityDistricts.map(district => `%${district}%`)]) : '';

  // special handling for FEMA flood zones
  // to only filter when set to true
  const dcp_femafloodzonevQuery = dcp_femafloodzonev === 'true' ? 'AND dcp_femafloodzonev = true' : '';
  const dcp_femafloodzonecoastalaQuery = dcp_femafloodzonecoastala === 'true' ? 'AND dcp_femafloodzonecoastala = true' : '';
  const dcp_femafloodzoneaQuery = dcp_femafloodzonea === 'true' ? 'AND dcp_femafloodzonea = true' : '';
  const dcp_femafloodzoneshadedxQuery = dcp_femafloodzoneshadedx === 'true' ? 'AND dcp_femafloodzoneshadedx = true' : '';
  const textQuery = text_query ? pgp.as.format("AND ((dcp_projectbrief ilike '%$1:value%') OR (dcp_projectname ilike '%$1:value%') OR (dcp_applicant ilike '%$1:value%'))", [text_query]) : '';


  try {
    const projects =
      await db.any(listProjectsQuery, {
        standardColumns,
        dcp_publicstatus,
        dcp_ceqrtype,
        dcp_ulurp_nonulurp,
        dcp_femafloodzonevQuery,
        dcp_femafloodzonecoastalaQuery,
        dcp_femafloodzoneaQuery,
        dcp_femafloodzoneshadedxQuery,
        communityDistrictsQuery,
        textQuery,
        paginate,
      });

    const [{ total_projects: total = 0 } = {}] = projects || [];
    const { length = 0 } = projects;

    // if this is the first page of a new query, include bounds for the query's geoms, and a vector tile template
    let tileMeta = {};

    if (page === '1') {
      // tileQuery is uses the same WHERE clauses as above,
      // but only SELECTs geom, projectid, and projectname, and does not include pagination

      const tileQuery = pgp.as.format(listProjectsQuery, {
        standardColumns: 'geom, projectid, dcp_projectname',
        dcp_publicstatus,
        dcp_ceqrtype,
        dcp_ulurp_nonulurp,
        dcp_femafloodzonevQuery,
        dcp_femafloodzonecoastalaQuery,
        dcp_femafloodzoneaQuery,
        dcp_femafloodzoneshadedxQuery,
        communityDistrictsQuery,
        textQuery,
        paginate: '',
      });

      // get the bounds for the geometries
      // default to a bbox for the whole city
      let bounds = [[-74.2553345639348, 40.498580711525], [-73.7074928813077, 40.9141778017518]];
      if (total) {
        bounds = await db.one(boundingBoxQuery, { tileQuery });
        bounds = bounds.bbox;
      }

      // create a shortid for this query and store it in the cache
      const tileId = shortid.generate();
      await tileCache.set(tileId, tileQuery);

      tileMeta = {
        tiles: [`${host}/projects/tiles/${tileId}/{z}/{x}/{y}.mvt`],
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

/* GET /projects/:id */
/* Retreive a single project */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const project = await db.one(findProjectQuery, { id });
    project.bbl_featurecollection = await getBblFeatureCollection(project.bbls);

    res.send({
      data: {
        type: 'projects',
        id,
        attributes: project,
      },
    });
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});


/* GET /projects/tiles/:tileId/:z/:x/:y.mvt */
/* Retreive a vector tile by tileid */
router.get('/tiles/:tileId/:z/:x/:y.mvt', async (req, res) => {
  const {
    tileId,
    z,
    x,
    y,
  } = req.params;

  // retreive the projectids from the cache
  const tileQuery = await tileCache.get(tileId);
  // calculate the bounding box for this tile
  const bbox = mercator.bbox(x, y, z, false);

  try {
    const tile = await db.one(generateVectorTile, [...bbox, tileQuery]);

    res.setHeader('Content-Type', 'application/x-protobuf');

    if (tile.st_asmvt.length === 0) {
      res.status(204);
    }
    res.send(tile.st_asmvt);
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
