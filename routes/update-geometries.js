/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */

const express = require('express');
const pgp = require('pg-promise');

const cartoClient = require('../clients/carto-client');
const { flattenProjectsRows } = require('../utils/update-geometries/flatten-rows');
const { getEscapedPagingCookie } = require('../utils/get-escaped-paging-cookie');

const { updateGeometriesProjectsSQL } = require('../queries/xml/update-geometries-projects');
const { cartoProjectsGeomsSQL } = require('../queries/sql/carto-projects-geoms');
const { updateGeomsSQL } = require('../queries/sql/update-geoms');

const router = express.Router({ mergeParams: true });
const { USER_API_KEY } = process.env;
const MAX_LOOK_BACK_SEC = 60 * 60 * 24 * 2; // two days

/**
 * Middleware requires an API_KEY query param to update geometries
 */
router.use((req, res, next) => {
  const { query: { API_KEY } } = req;
  if (API_KEY !== USER_API_KEY) {
    res.status(401).send({ message: 'Invalid API_KEY' });
    return;
  }
  next();
});

/**
 * Updates geometries for a specified project, if it exists
 */
router.get('/:id', async (req, res) => {
  const {
    app: { dbClient, crmClient },
    params: { id },
  } = req;

  try {
    // Fetch all projects modified within the lookback window
    const projectRows = await getProjectsForGeometryUpdate(crmClient, false, id);
    const [project] = flattenProjectsRows(projectRows);

    if (!project) {
      res.send({ message: `Project ${id} does not exist or does not have any associated bbls` });
      return;
    }

    // Asyncronously update geoms for all projects
    const result = await updateProjectGeoms(dbClient, project);
    if (!result) {
      res.send({ message: `Unable to get geometries for bbls associated with project ${id}` });
      return;
    }

    res.send({ message: `Successfully updated geometries for project ${id}` });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: `Failed to update geometries for project ${id}` });
  }
});

/**
 * Updates geometries for projects modified within a given lookback window. Geometries are
 * pulled from Carto, and written to PostgreSQL with a few metadata fields which can be included
 * as properties on selected 'Feature' geometries.
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, crmClient },
    query: { lookBackSec },
  } = req;

  // lookBackSec is required
  if (!lookBackSec) {
    res.status(400).send({ error: '"lookBackSec" query param is required' });
    return;
  }

  // lookBackSec cannot be greater than 2 days
  if (lookBackSec > MAX_LOOK_BACK_SEC) {
    res.status(400).send({ error: `lookBackSec out of range. Max: ${MAX_LOOK_BACK_SEC} (2 days)` });
    return;
  }

  try {
    // TODO: enable change tracking on dcp_projectbbls to capture deleted project bbls
    // for now, we're just keying off modifiedon and so only getting new bbls.
    // Fetch all projects modified within the lookback window
    const projectsRows = await getProjectsForGeometryUpdate(crmClient, lookBackSec);
    const projects = flattenProjectsRows(projectsRows);

    // Asyncronously update geoms for all projects
    const { failedUpdates, successfulUpdatesCount } = await updateProjectsGeoms(dbClient, projects);
    let message = `Successfully updated geometries for ${successfulUpdatesCount} projects`;
    if (failedUpdates.length) {
      const projectIdsForMessage = failedUpdates.length > 20 ? `${failedUpdates.join(', ')}...` : failedUpdates.join(', ');
      message += `; Failed to update geometries for ${failedUpdates.length} projects: ${projectIdsForMessage}`;
    }

    res.send({ message });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: 'Failed to update geometries' });
  }
});

/**
 * Gets all projects for geometry updates, either within a lookback window, or for a single
 * project id. CRM will return up to maximum of 5000 results, so results must be paged through
 * to ensure full result set is retrieved.
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {int} lookBackSec The lookback window to use to filter for updated projects, in seconds
 * @param {String} projectId The projectId to use to filter for single project
 * @returns {Object[]} The full list of all raw projects from CRM
 */
async function getProjectsForGeometryUpdate(crmClient, lookBackSec = false, projectId = false) {
  const createdOn = lookBackSec ? new Date(new Date().getTime() - lookBackSec * 1000) : false;
  const MAX_PROJECTS_PER_PAGE = 5000;
  const projects = [];

  let page = 1;
  let pagingCookie = '';
  while (true) { // eslint-disable-line
    const res = await crmClient.doGet( //eslint-disable-line
      `dcp_projects?fetchXml=${updateGeometriesProjectsSQL(page, MAX_PROJECTS_PER_PAGE, pagingCookie, createdOn, projectId)}`,
    );
    const {
      value,
      '@Microsoft.Dynamics.CRM.morerecords': moreRecords,
    } = res;

    projects.push(...value);
    if (!moreRecords) break;

    pagingCookie = getEscapedPagingCookie(res);
    page += 1;
  }

  return projects;
}

/**
 * Updates project geometries for all projects, and returns the count of total successful updates
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {Object[]} projects The array of project objects from CRM
 */
async function updateProjectsGeoms(dbClient, projects) {
  const results = await Promise.all(
    projects.map(project => updateProjectGeoms(dbClient, project)),
  );

  // Gather results
  const failedUpdates = results.filter(result => result !== true);
  const successfulUpdatesCount = results.filter(result => result === true).length;

  return { failedUpdates, successfulUpdatesCount };
}

/**
 * Updates geometry for the given project, first getting geometry from Carto
 * then executing an UPSERT query against PostgreSQL to update/create geometry for the project.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {Object} project The project object to update geometries for
 * @returns {Promise} Promise object representing the query result
 */
async function updateProjectGeoms(dbClient, project) {
  const query = pgp.as.format(cartoProjectsGeomsSQL, [project.bbls]);
  try {
    const requestType = query.length > 2000 ? 'post' : 'get';
    const [geom] = await cartoClient.SQL(query, requestType);
    if (geom) {
      await dbClient.none(
        updateGeomsSQL,
        [
          project.projectId,
          geom.polygons,
          geom.centroid,
        ],
      );
      return true;
    }
    return project.projectId;
  } catch (e) {
    console.log(e); // eslint-disable-line
    return project.projectId;
  }
}

module.exports = router;
