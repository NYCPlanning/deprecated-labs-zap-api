require('dotenv').config({ path: '../../.env' });
const express = require('express');
const getProjectGeoms = require('../../utils/get-project-geoms');

const router = express.Router({ mergeParams: true });


/* GET /projects/update-geometries/:id */
/* Retreive a single project and the API key */
router.get('/', async (req, res) => {
  const { app, params, query } = req; // request, connect to the database with app in app.js
  const { id } = params;
  const { API_KEY } = query;
  const { USER_API_KEY } = process.env; // retrieve the approved user API key defined in .env

  if (USER_API_KEY === API_KEY) {
    if (!id.match(/^P?[0-9]{4}[A-Z]{1}[0-9]{4}$/)) { // regex match for project id with zero or one 'P', four numbers, 1 letter, and four numbers
      res.send({
        status: 'failure',
        message: 'Invalid project id',
      });
    } else {
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
        INSERT INTO project_geoms(projectid, polygons, centroid, mappluto_v)
        VALUES
          (
          \${id},
          \${polygons},
          \${centroid},
          \${mappluto_v}
          )
        ON CONFLICT (projectid)
        DO
          UPDATE
            SET
              polygons = \${polygons},
              centroid = \${centroid},
              mappluto_v = \${mappluto_v};
      `;

      // SQL template to delete records that match the project id
      // SELECT 1 returns a column of 1's for every row in the table
      const deleteProjectSQL = `
        DELETE FROM project_geoms WHERE EXISTS (
          SELECT 1 FROM project_geoms WHERE projectid = \${id}
        );
      `;

      try {
        const { bbls } = await app.db.one(matchBBLSQL, { id }); // an array of bbls that match the project id
        // if a project has no bbls, remove project
        if (!bbls) {
          await app.db.none(deleteProjectSQL, { id }); // eslint-disable-line,
          res.send({
            status: 'failure',
            message: `ZAP data does not list any BBLs for project ${id}`,
          });
        } else {
          const { polygons, centroid, mappluto_v } = await getProjectGeoms(bbls); // get geoms from carto that match array of bbls
          if (polygons == null) {
            res.send({
              status: 'failure',
              message: `MapPLUTO does not contain matching BBLs for project ${id}`,
            });
          } else {
          // update geometry on existing project or insert new project with geoms (upsert)
            await app.db.none(upsertSQL, {
              id,
              polygons,
              centroid,
              mappluto_v,
            });

            res.send({
              status: 'success',
              message: `Updated geometries for project ${id}`,
            });
          }
        }
      } catch (e) {
        res.status(500).send({
          error: e.toString(),
        });
      }
    }
  } else {
    res.send({
      status: 'failure',
      message: 'Invalid API key',
    });
  }
});

module.exports = router;
