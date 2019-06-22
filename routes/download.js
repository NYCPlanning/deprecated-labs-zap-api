const express = require('express');
const { parse: json2csv } = require('json2csv');
const ogr2ogr = require('ogr2ogr');

const { ACTIONS } = require('../constants');
const { projectsDownloadSQL } = require('../queries/sql/projects-download');
const { makeFeatureCollection } = require('../utils/make-feature-collection');

const router = express.Router({ mergeParams: true });

/**
 * Downloads all projects for a specified project queryId; requires that a filtered project
 * dataset was previously generated via the `/projects` route. FilterIds remain in the cache
 * for one hour. Datasets can be downloaded as CSVs, or as geojson or shape files.
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, queryCache },
    params: { fileType },
    query: { queryId = '' },
  } = req;

  if (!queryId) {
    res.status(400).send({ error: `'queryId' param is required to download a filtered project dataset` });
    return;
  }

  try {
    // Get project ids for the given queryId
    const projectIds = queryCache.get(queryId);

    if (!projectIds) {
      console.log('Could not retrieve project ids for given project query'); // eslint-disable-line
      res.status(404).send({ error: `Projects for query id ${queryId} not found` });
      return;
    }

    const projects = await dbClient.any(projectsDownloadSQL(projectIds, fileType))
      .then((rawProjects) => {
        if (fileType === 'csv') return rawProjects;

        return makeFeatureCollection(rawProjects);
      });

    if (fileType === 'csv') {
      // Generate and send CSV response
      sendCSVResponse(projects, res);
      return;
    }

    if (fileType === 'geojson') {
      // Generate and send geojson response
      sendGeoJSONResponse(projects, res);
      return;
    }

    if (fileType === 'shp') {
      // Generate and send shapefile response
      sendSHPResponse(projects, res);
      return;
    }

    res.status(400).send({ error: `Invalid download type: ${fileType}` });
  } catch (e) {
    console.log(e) // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
});

/**
 * Generates and sends CSV response from projects data
 *
 * @param {Object[]} projects The array of formatted project data
 * @param {Response} res The response object sent by HTTP request (param from express callback function)
 */
function sendCSVResponse(projects, res) {
  res.setHeader('Content-Type', 'text/csv');
  if (!projects.length) {
    res.status(204).send();
    return;
  }

  projects.forEach((project) => {
    project.actiontypes = project.actiontypes
      ? project.actiontypes.split(';').map(code => ACTIONS[code]).join(';')
      : '';
  });
  const csv = json2csv(projects, { highWaterMark: 16384, encoding: 'utf-8' });
  res.send(csv);
}

/**
 * Generates and sends geojson response
 *
 * @param {Object[]} projects The array of formatted project data
 * @param {Response} res The response object sent by HTTP request (param from express callback function)
 */
function sendGeoJSONResponse(projects, res) {
  res.setHeader('Content-Disposition', 'attachment; filename=projects.geojson');
  res.send(projects);
}

/**
 * Generates and sends shapefile response
 *
 * @param {Object[]} projects The array of formatted project data
 * @param {Response} res The response object sent by HTTP request (param from express callback function)
 */
function sendSHPResponse(projects, res) {
  res.setHeader('Content-Disposition', 'attachment; filename=projects.zip');
  res.setHeader('Content-Type', 'application/zip');
  createShapefile(projects).pipe(res);
}

/**
 * Helper function to transform projects FeatureCollection into a Shapefile zip
 *
 * @param {Object} projects - The projects FeatureCollection
 * @returns {Object} ESRI Shapefile readable stream
 */
function createShapefile(projects) {
  return ogr2ogr(projects)
    .format('ESRI Shapefile')
    .skipfailures()
    .timeout(60000)
    .options(['-nln', 'projects'])
    .stream();
}

module.exports = router;
