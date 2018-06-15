const express = require('express');
const path = require('path');

// print the SQL query
const initOptions = {
  query(e) {
     (process.env.DEBUG === true) ? console.log(e.query) : null; // eslint-disable-line
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

/* GET /projects */
router.get('/', async ({ query: { 'community-district': communityDistrict } }, res) => {
  try {
    const projects = await db.any(listProjectsQuery, { communityDistrict });
    res.send(projects);
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
      error: `no project found with id ${id}`,
    });
  }
});

module.exports = router;
