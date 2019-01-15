const express = require('express');
const getQueryFile = require('../../utils/get-query-file');
const getProjectGeoms = require('../../utils/get-project-geoms');

const router = express.Router({ mergeParams: true });


/* GET /projects/:id */
/* Retreive a single project */
router.get('/', async (req, res) => {
  const { app, params } = req;
  const { id } = params;

  // TODO: sanitize the id params
  // import sql query templates
  const findProjectQuery = getQueryFile('/projects/show.sql'); // TODO: use a simpler query just for BBLs
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
    const project = await app.db.one(findProjectQuery, { id });
    const { polygons, centroid } = await getProjectGeoms(project.bbls); // check to see if this will fail in the right place (are we getting back bbls?), write a test for this
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
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
