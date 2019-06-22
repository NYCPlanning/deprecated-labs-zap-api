const express = require('express');
const { parse: json2csv } = require('json2csv');
const ogr2ogr = require('ogr2ogr');

const { getAllProjectsDownload } = require('../utils/projects/get-projects');
const { getProjectsEntities } = require('../utils/projects/get-entities');
const { postProcessProjects } = require('../utils/projects/post-process');
const { getProjectsDownloadGeo } = require('../utils/projects/get-geo');

const router = express.Router({ mergeParams: true });

/**
 * Downloads all projects for a specified project queryId; requires that a filtered project
 * dataset was previously generated via the `/projects` route. FilterIds remain in the cache
 * for one hour. Datasets can be downloaded as CSVs, or as geojson or shape files.
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, queryCache, crmClient },
    params: { fileType },
    query: { queryId = '' },
  } = req;

  try {
    // Get project ids for the given queryId
    const projectIds = queryCache.get(queryId);

    if (!projectIds) {
      console.log('Could not retrieve project ids for given project query'); // eslint-disable-line
      res.status(404).send({ error: `Projects for query id ${queryId} not found` });
      return;
    }

    // Fetch all projects
    const projects = await getAllProjectsDownload(crmClient, projectIds);

    // Fetch related entities for all projects in batches to avoid too-long URIs
    // (can't use batch posts either, b/c those don't work for super long child-entity requests)
    // 😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭
    const BATCH_SIZE = 50;
    const formattedProjects = [];
    const batches = Math.ceil(projects.length / BATCH_SIZE);
    for (let i = 0; i < batches; i++) { // eslint-disable-line
      const projectsBatch = projects.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      // Fetch related entities
      const projectUUIDs = projectsBatch.map(project => project.dcp_projectid);
      const entities = await getProjectsEntities(crmClient, projectUUIDs);
      // Add entities, and format
      formattedProjects.push(...postProcessProjects(projectsBatch, entities));
    }

    if (fileType === 'csv') {
      // Generate and send CSV response
      sendCSVResponse(formattedProjects, res);
      return;
    }

    // If not CSV, get geo data
    const projectsFeatureCollection = await getProjectsDownloadGeo(dbClient, projectIds);

    if (fileType === 'geojson') {
      // Generate and send geojson response
      sendGeoJSONResponse(projectsFeatureCollection, res);
      return;
    }

    if (fileType === 'shp') {
      // Generate and send shapefile response
      sendSHPResponse(projectsFeatureCollection, res);
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
