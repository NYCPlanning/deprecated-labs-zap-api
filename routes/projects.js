const express = require('express');
const path = require('path');
const SphericalMercator = require('sphericalmercator');
const NodeCache = require('node-cache');
const shortid = require('shortid');
const turfBuffer = require('@turf/buffer');
const turfBbox = require('@turf/bbox');
const { Recaptcha } = require('express-recaptcha');
const github = require('octonode');
const fetch = require('node-fetch');
const Json2csvTransform = require('json2csv').Transform;
const QueryStream = require('pg-query-stream');
const JSONStream = require('JSONStream');

const buildProjectsSQL = require('../utils/build-projects-sql');


const recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY);

const client = github.client(process.env.GITHUB_ACCESS_TOKEN);
const ghrepo = client.repo('NYCPlanning/zap-data-feedback');

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
const findProjectQuery = sql('../queries/projects/show.sql');
const boundingBoxQuery = sql('../queries/helpers/bounding-box-query.sql');
const generateVectorTile = sql('../queries/helpers/generate-vector-tile.sql');

router.get('/', async (req, res) => {
  const { query } = req;

  const SQL = buildProjectsSQL(query);

  try {
    const projects = await db.any(SQL);

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
        bounds = await db.one(boundingBoxQuery, { tileQuery });
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

router.get('/download.csv', async (req, res) => {
  const { query } = req;

  const SQL = buildProjectsSQL(query, 'download');

  // you can also use pgp.as.format(query, values, options)
  // to format queries properly, via pg-promise;
  const qs = new QueryStream(SQL);

  const transformOpts = { highWaterMark: 16384, encoding: 'utf-8' };
  const json2csv = new Json2csvTransform({}, transformOpts);

  // Set approrpiate download headers
  res.setHeader('Content-disposition', 'attachment; filename=projects.csv');
  res.writeHead(200, { 'Content-Type': 'text/csv' });

  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();

  db.stream(qs, (s) => {
    // initiate streaming into the console:
    s.pipe(JSONStream.stringify()).pipe(json2csv).pipe(res);
  })
    .then((data) => {
      console.log(
        'Total rows processed:', data.processed,
        'Duration in milliseconds:', data.duration,
      );
    })
    .catch((error) => {
      console.log('ERROR:', error);
    });
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

/* POST /projects/feedback */
/* Submit feedback about a project */
router.post('/feedback', recaptcha.middleware.verify, async (req, res) => {
  if (!req.recaptcha.error) {
    // create a new issue
    const { projectid, projectname, text } = req.body;
    ghrepo.issue({
      title: `Feedback about ${projectname}`,
      body: `Project ID: [${projectid}](https://zap.planning.nyc.gov/projects/${projectid})\nFeedback: ${text}`,
    }, () => {
      res.send({
        status: 'success',
      });
    });
  } else {
    res.status(403);
    res.send({
      status: 'captcha invalid',
    });
  }
});

/* POST /projects/slack */
/* A custom slash command for slack that queries this API  */
router.post('/slack', async (req, res, next) => {
  const { token, text } = req.body;

  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    fetch(`${host}/projects?applied-filters=project_applicant_text&project_applicant_text=${text}`)
      .then(d => d.json())
      .then((response) => {
        const projects = response.data.slice(0, 5);
        res.send({
          response_type: 'in_channel',
          text: projects.length ? `Top ${projects.length} ZAP projects matching '${text}'` : `No ZAP projects found matching '${text}'`,
          attachments: projects.map((project) => {
            const { id: projectid, attributes } = project;
            const {
              dcp_projectname: projectName,
              dcp_applicant: applicant,
              dcp_projectbrief: projectBrief,
              dcp_publicstatus_simp: status,
            } = attributes;
            return {
              color: 'good',
              text: `*<https://zap.planning.nyc.gov/projects/${projectid}|${projectName}>* \`${status}\` | *Applicant:* ${applicant} | ${projectBrief || 'No Project Brief'}`,
            };
          }),
        });
      })
      .catch(() => {
        next();
      });
  } else {
    res.status(403);
    res.send({
      status: 'invalid slack token',
    });
  }
});

module.exports = router;
