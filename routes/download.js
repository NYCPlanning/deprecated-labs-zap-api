const express = require('express');
const { parse: json2csv } = require('json2csv');
const ogr2ogr = require('ogr2ogr');

const { getProjectsEntities } = require('../utils/get-entities');
const { postProcessProjects } = require('../utils/post-process');
const { getProjectsDownloadGeo } = require('../utils/get-geo');
const { projectsDownloadXML } = require('../queries/projects-xmls');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  const {
    app: { dbClient, filterCache, crmClient },
    params: { fileType },
    query: { filterId },
  } = req;

  try {
    const projectIds = filterCache.get(filterId);
    if (!projectIds) {
      console.log('Could not retrieve project ids for given project filter'); // eslint-disable-line
      res.status(404).send({ error: `Projects for filter id ${filterId} not found` });
      return;
    }

    const projects = await getAllProjects(crmClient, projectIds);
    const projectUUIDs = projects.map(project => project.dcp_projectid);
    const entities = await getProjectsEntities(crmClient, projectUUIDs);
    postProcessProjects(projects, entities);

    if (fileType === 'csv') {
      sendCSVResponse(projects, res);
      return;
    }

    const projectsGeo = await getProjectsDownloadGeo(dbClient, projectIds);

    if (fileType === 'shp') {
      sendSHPResponse(projectsGeo, res);
      return;
    }

    if (fileType === 'geojson') {
      sendGeoJSONResponse(projectsGeo, res);
      return;
    }

    res.status(400).send({ error: `Invalid download type: ${fileType}` });
  } catch (e) {
    console.log(e) // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
});

async function getAllProjects(crmClient, projectIds) {
  const MAX_PROJECTS_PER_PAGE = 5000;
  const projects = [];
  const pages = Math.ceil(projectIds.length / MAX_PROJECTS_PER_PAGE);
  for (let i = 1; i <= pages; i ++) { // eslint-disable-line
    const { value } = await crmClient.doBatchPost( // eslint-disable-line
      'dcp_projects',
      projectsDownloadXML(projectIds, i, MAX_PROJECTS_PER_PAGE),
    );
    projects.push(...value);
  }

  return projects;
}

function sendCSVResponse(projects, res) {
  res.setHeader('Content-Type', 'text/csv');
  if (!projects.length) {
    res.status(204).send();
    return;
  }

  const csv = json2csv(projects, { highWaterMark: 16384, encoding: 'utf-8' });
  res.send(csv);
}

function sendSHPResponse(projects, res) {
  res.setHeader('Content-Disposition', 'attachment; filename=projects.zip');
  res.setHeader('Content-Type', 'application/zip');
  createShapefile(projects).pipe(res);
}

function createShapefile(projects) {
  return ogr2ogr(projects)
    .format('ESRI Shapefile')
    .skipfailures()
    .timeout(60000)
    .options(['-nln', 'projects'])
    .stream();
}

function sendGeoJSONResponse(projects, res) {
  res.setHeader('Content-Disposition', 'attachment; filename=projects.geojson');
  res.send(projects);
}

module.exports = router;
