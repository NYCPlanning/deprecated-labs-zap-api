const express = require('express');
const getProjectGeoms = require('../../utils/get-project-geoms');

const router = express.Router({ mergeParams: true });


/* GET /projects/:id */
/* Retreive a single project */
router.get('/', async (req, res) => {
  const { app, params } = req; // request, connect to the database with app in app.js
  const { id } = params;

  // import sql query templates
  const matchBBLSQL = `
    SELECT
     (
        SELECT json_agg(b.dcp_bblnumber)
        FROM dcp_projectbbl b
        WHERE b.dcp_project = p.dcp_projectid
        AND b.dcp_bblnumber IS NOT NULL AND statuscode = 'Active'
      ) AS bbls
    FROM dcp_project p
    WHERE dcp_name = \${id}
      AND dcp_visibility = 'General Public'
  `;

  const upsertSQL = `
    INSERT INTO project_geoms(projectid, polygons, centroid)
    VALUES
      (
      \${id},
      \${polygons},
      \${centroid}
      )
    ON CONFLICT (projectid)
    DO NOTHING;
  `;

  try {
    if (!id.match(/^P?[0-9]{4}[A-Z]{1}[0-9]{4}$/)) throw new Error('Invalid project id');
    const { bbls } = await app.db.one(matchBBLSQL, { id }); // destructuring
    if (!bbls) {
      app.db.none('DELETE FROM project_geoms WHERE projectid = \${id}', { id }) // eslint-disable-line
        .then(() => {
          res.send({
            status: 'success',
            message: `No BBLs found, project ${id} has no geometries`,
          });
        });
    } else {
      const { polygons, centroid } = await getProjectGeoms(bbls); // check to see if this will fail in the right place (are we getting back bbls?), write a test for this
      await app.db.none(upsertSQL, {
        id,
        polygons,
        centroid,
      })
        .then(() => {
          res.send({
            status: 'success',
            message: `Updated geometries for project ${id}`,
          });
        });
    }
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
