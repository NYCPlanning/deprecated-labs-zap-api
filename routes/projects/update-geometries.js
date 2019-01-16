const express = require('express');
const getProjectGeoms = require('../../utils/get-project-geoms');

const router = express.Router({ mergeParams: true });


/* GET /projects/:id */
/* Retreive a single project */
router.get('/', async (req, res) => {
  const { app, params } = req; // request, connect to the database with app in app.js
  const { id } = params;

  // import sql query templates
  // SQL template to select list of bbls that match project id
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

  // SQL template, upsert command to insert rows that don't exist and update rows that do exist
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

  // SQL template to delete records that match the project id
  // SELECT 1 returns a column of 1's for every row in the table
  const deleteProjectSQL = `
    DELETE FROM project_geoms WHERE EXISTS (
      SELECT 1 FROM project_geoms WHERE projectid = \${id}
    );
  `;

  try {
    if (!id.match(/^P?[0-9]{4}[A-Z]{1}[0-9]{4}$/)) throw new Error('Invalid project id'); // regex match for project id with zero or one 'P', four numbers, 1 letter, and four numbers
    const { bbls } = await app.db.one(matchBBLSQL, { id }); // an array of bbls that match the project id
    // if a project has no bbls, remove project
    if (!bbls) {
      app.db.none(deleteProjectSQL, { id }) // eslint-disable-line,
        .then(() => {
          res.send({
            status: 'success',
            message: `No BBLs found, project ${id} has no geometries`,
          });
        });
    } else {
      const { polygons, centroid } = await getProjectGeoms(bbls); // get geoms from carto that match array of bbls
      // update geometry on existing project or insert new project with geoms (upsert)
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
