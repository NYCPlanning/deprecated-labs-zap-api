const express = require('express');
const path = require('path');
const SphericalMercator = require('sphericalmercator');
const NodeCache = require('node-cache');
const shortid = require('shortid');

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

// helper for linking to external query files:
function sql(file) {
  const fullPath = path.join(__dirname, file);
  return new pgp.QueryFile(fullPath, { minify: true });
}

// import sql query templates
const listProjectsQuery = sql('../queries/projects/index.sql');
const findProjectQuery = sql('../queries/projects/show.sql');
const paginateQuery = sql('../queries/helpers/paginate.sql');

function generatePaginate(values) {
  return {
    toPostgres() { return pgp.as.format(paginateQuery, values); },
    rawType: true,
  };
}

/* GET /projects */
router.get('/', async (req, res) => {
  // extract params, set defaults
  const {
    query: {
      // pagination
      page = 1,
      itemsPerPage = 30,

      // filters
      'community-districts': communityDistricts = [],
      dcp_ceqrtype = ['Type I', 'Type II', 'Unlisted', 'Unknown'],
      dcp_ulurp_nonulurp = ['ULURP', 'Non-ULURP'],
      dcp_femafloodzonea = false,
      dcp_femafloodzonecoastala = false,
      dcp_femafloodzoneshadedx = false,
      dcp_femafloodzonev = false,
    },
  } = req;

  // altered filters
  let {
    query: {
      dcp_publicstatus = ['Approved', 'Withdrawn', 'Filed', 'Certified', 'Unknown'],
    },
  } = req;

  if (dcp_publicstatus.includes('Complete')) {
    dcp_publicstatus.push('Approved');
    dcp_publicstatus.push('Withdrawn');
    dcp_publicstatus = dcp_publicstatus.filter(d => d !== 'Complete');
  }

  const standardColumns = `
    ,
    dcp_projectname,
    dcp_projectbrief,
    dcp_publicstatus,
    dcp_certifiedreferred,
    dcp_projectid,
    dcp_femafloodzonea,
    dcp_femafloodzonecoastala,
    dcp_femafloodzoneshadedx,
    dcp_femafloodzonev,
    cast(count(dcp_projectid) OVER() as integer) as total_projects,
    CASE WHEN c.geom IS NOT NULL THEN true ELSE false END AS has_centroid
  `;

  const paginate = generatePaginate({ itemsPerPage, offset: (page - 1) * itemsPerPage });
  const communityDistrictsQuery =
    communityDistricts[0] ? pgp.as.format('AND dcp_validatedcommunitydistricts ilike any (array[$1:csv])', [communityDistricts.map(district => `%${district}%`)]) : '';

  // special handling for FEMA flood zones
  // to only filter when set to true
  const dcp_femafloodzoneaQuery = dcp_femafloodzonea ? 'AND dcp_femafloodzonea = true' : '';
  const dcp_femafloodzonecoastalaQuery = dcp_femafloodzonecoastala ? 'AND dcp_femafloodzonecoastala = true' : '';
  const dcp_femafloodzoneshadedxQuery = dcp_femafloodzoneshadedx ? 'AND dcp_femafloodzoneshadedx = true' : '';
  const dcp_femafloodzonevQuery = dcp_femafloodzonev ? 'AND dcp_femafloodzonev = true' : '';

  try {
    const projects =
      await db.any(listProjectsQuery, {
        standardColumns,
        dcp_publicstatus,
        dcp_ceqrtype,
        dcp_ulurp_nonulurp,
        dcp_femafloodzoneaQuery,
        dcp_femafloodzonecoastalaQuery,
        dcp_femafloodzoneshadedxQuery,
        dcp_femafloodzonevQuery,
        communityDistrictsQuery,
        paginate,
      });

    const [{ total_projects: total = 0 } = {}] = projects || [];
    const { length = 0 } = projects;

    // tileProjects is uses the same WHERE clauses as above,
    // but only SELECTs dcp_name and does not include pagination
    let tileProjects = await db.any(listProjectsQuery, {
      standardColumns: '',
      dcp_publicstatus,
      dcp_ceqrtype,
      dcp_ulurp_nonulurp,
      dcp_femafloodzoneaQuery,
      dcp_femafloodzonecoastalaQuery,
      dcp_femafloodzoneshadedxQuery,
      dcp_femafloodzonevQuery,
      communityDistrictsQuery,
      paginate: '',
    });

    // map to an array of quoted projectids
    tileProjects = tileProjects.map(row => `'${row.dcp_name}'`);

    // get the bounds for the geometries
    let bounds = await db.one(`
      SELECT
      ARRAY[
        ARRAY[
          ST_XMin(bbox),
          ST_YMin(bbox)
        ],
        ARRAY[
          ST_XMax(bbox),
          ST_YMax(bbox)
        ]
      ] as bbox
      FROM (
        SELECT ST_Extent(geom) AS bbox
        FROM (
          SELECT geom
          FROM project_centroids
          WHERE projectid IN (${tileProjects.join(',')})
        ) x
      )y
    `);
    bounds = bounds.bbox;

    // create a shortid for this set of projectids and store it in the cache
    const tileId = shortid.generate();
    await tileCache.set(tileId, tileProjects);

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
        tiles: [`${process.env.HOST}/projects/tiles/${tileId}/{z}/{x}/{y}.mvt`],
        bounds,
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
  const projectIds = await tileCache.get(tileId);
  // calculate the bounding box for this tile
  const bbox = mercator.bbox(x, y, z, false);

  // SELECT data for the vector tile, filtering on the list of projectids
  const SQL = `
    SELECT ST_AsMVT(q, 'project-centroids', 4096, 'geom')
    FROM (
      SELECT
          c.projectid,
          p.dcp_projectname,
          ST_AsMVTGeom(
              geom,
              ST_MakeEnvelope(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326),
              4096,
              256,
              false
          ) geom
      FROM project_centroids c
      LEFT JOIN dcp_project p
        ON c.projectid = p.dcp_name
      WHERE ST_Intersects(ST_SetSRID(geom, 4326), ST_MakeEnvelope(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326))
      AND projectid IN (${projectIds.join(',')})
    ) q
  `;

  try {
    const tile = await db.one(SQL);

    res.setHeader('Content-Type', 'application/x-protobuf');

    if (tile.st_asmvt.length === 0) return;
    res.send(tile.st_asmvt);
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
