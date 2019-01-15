const express = require('express');
const getQueryFile = require('../../utils/get-query-file');
const getProjectGeoms = require('../../utils/get-project-geoms');

const router = express.Router({ mergeParams: true });


/* GET /projects/:id */
/* Retreive a single project */
router.get('/', async (req, res) => {
  const { app, params } = req;
  const { id } = params;

  // import sql query templates
  const findProjectQuery = getQueryFile('/projects/show.sql'); //TODO: use a simpler query just for BBLs
  const checkProjectSQL = `
     SELECT count(*) from project_geoms
     WHERE projectid = '${id}'
   `;

  const updateProjectGeomSQL = `
    UPDATE project_geoms
    SET
    polygons = polygons,
    centroid = centroid
    WHERE projectid = id;
  `;

  const insertProjectGeomSQL = `
    INSERT INTO project_geoms (centroid, polygons)
    VALUES (project.centroid, project.polygons);
  `;

  try {
    const project = await app.db.one(findProjectQuery, { id });
    project.test_project_geoms = await getProjectGeoms(project.bbls);
    const projectCount = await app.db.one(checkProjectExistsSQL, { id });

    // if projectCount = O {
    //   insertfunction( { id } );
    //   res.send(
    //     'I ran the insert function!',
    //   );
    // } else {
    //   updatefunction( { id } )
    //   res.send(
    //     'I ran the update function!',
    //   );
    // }


    // res.send({
    //   data: {
    //     type: 'projects',
    //     id,
    //     attributes: project,
    //   },
    // });
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
