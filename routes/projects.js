const express = require('express');
const path = require('path');

// print the SQL query
const initOptions = {
  query(e) {
    if (process.env.DEBUG === true) {
      console.log(e.query); // eslint-disable-line
    }
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
router.get('/', ({ query: { 'community-district': communityDistrict } }, res) => {
  db.any(listProjectsQuery, { communityDistrict })
    .then((data) => {
      res.send(data);
    })
    .catch(() => {
      res.status(404).send({
        error: `no projects found for geography ${communityDistrict}`,
      });
    });
});

/* GET /projects/:id */
/* Retreive a single project */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.one(findProjectQuery, { id })
    .then(async (project) => {
      project.bbl_featurecollection = await getBblFeatureCollection(project.bbls);

      res.send({
        data: {
          type: 'projects',
          id,
          attributes: project,
        },
      });
    })
    .catch(() => {
      res.status(404).send({
        error: `no project found with id ${id}`,
      });
    });
});

module.exports = router;
