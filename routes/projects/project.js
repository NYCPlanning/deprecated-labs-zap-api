const express = require('express');
const getQueryFile = require('../../utils/get-query-file');
const getVideoLinks = require('../../utils/get-video-links');
const normalizeSupportDocs = require('../../utils/inject-supporting-document-urls');

const router = express.Router({ mergeParams: true });

// import sql query templates
const findProjectQuery = getQueryFile('/projects/show.sql');

/* GET /projects/:id */
/* Retreive a single project */
router.get('/', async (req, res) => {
  const { app, params } = req;
  const { id } = params;

  try {
    const project = await app.db.one(findProjectQuery, { id });
    project.bbl_featurecollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: JSON.parse(project.bbl_multipolygon),
      }],
    };

    await normalizeSupportDocs(project);
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
