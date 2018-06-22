const express = require('express');
const path = require('path');
const SphericalMercator = require("sphericalmercator");
const mercator = new SphericalMercator()
const NodeCache = require( "node-cache" );
var shortid = require('shortid');
const tileCache = new NodeCache();


// print the SQL query
const initOptions = {
  query(e) {
     (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  },
};

const pgp = require('pg-promise')(initOptions);
const getBblFeatureCollection = require('../utils/get-bbl-feature-collection');

const db = pgp(process.env.DATABASE_CONNECTION_STRING);
const router = express.Router();

// Helper for linking to external query files:
function sql(file) {
  const fullPath = path.join(__dirname, file);
  return new pgp.QueryFile(fullPath, { minify: true });
}

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
      dcp_publicstatus = ['Approved', 'Withdrawn', 'Filed', 'Certified', 'Unknown'],
      dcp_ceqrtype = ['Type I', 'Type II', 'Unlisted', 'Unknown'],
      dcp_ulurp_nonulurp = ['ULURP', 'Non-ULURP'],
      dcp_femafloodzonea = false,
      dcp_femafloodzonecoastala = false,
      dcp_femafloodzoneshadedx = false,
      dcp_femafloodzonev = false,
    },
  } = req;

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
    cast(count(dcp_projectid) OVER() as integer) as total_projects
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

    tileProjects = tileProjects.map(row => `'${row.dcp_name}'`);
    const tileId = shortid.generate()

    await tileCache.set(tileId, tileProjects)

    console.log(tileProjects)

    res.send({
      data: projects.map(project => ({
        type: 'projects',
        id: project.dcp_name,
        attributes: project,
      })),
      meta: {
        total,
        pageTotal: length,
        tiles: [`http://localhost:3000/projects/tiles/${tileId}/{z}/{x}/{y}.mvt`],
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

router.get('/tiles/:tileId/:z/:x/:y.mvt', async (req, res) => {
  const { tileId, z, x, y } = req.params;

  const projectIds = await tileCache.get( tileId );
  const bbox = mercator.bbox(x, y, z, false);
  console.log(bbox)

  const SQL = `
    SELECT ST_AsMVT(q, 'project-centroids', 4096, 'geom')
    FROM (
      SELECT
          projectid,
          ST_AsMVTGeom(
              geom,
              TileBBox(${z}, ${x}, ${y}, 4326),
              4096,
              256,
              false
          ) geom
      FROM project_centroids
      WHERE ST_Intersects(ST_SetSRID(geom, 4326), ST_MakeEnvelope(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326))
      AND projectid IN (${projectIds.join(',')})
    ) q
  `;

  try {
    const tile = await db.one(SQL);
    console.log(tile.st_asmvt)
    res.setHeader('Content-Type', 'application/x-protobuf')
    res.send(tile.st_asmvt);
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
})

module.exports = router;
