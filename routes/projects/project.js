const express = require('express');
const getQueryFile = require('../../utils/get-query-file');
const getBblFeatureCollection = require('../../utils/get-bbl-feature-collection');
const getProjectGeoms = require('../../utils/get-project-geoms');
const getVideoLinks = require('../../utils/get-video-links');

const router = express.Router({ mergeParams: true });


/* GET /projects/:id */
/* Retreive a single project */
router.get('/', async (req, res) => {
  const { app, params } = req;
  const { id } = params;

  // import sql query templates
  const findProjectQuery = getQueryFile('/projects/show.sql');

  try {
    const project = await app.db.one(findProjectQuery, { id });
    project.bbl_featurecollection = await getBblFeatureCollection(project.bbls);
    project.test_project_geoms = await getProjectGeoms(project.bbls);
    project.video_links = await getVideoLinks(project.dcp_name);

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


module.exports = router;
