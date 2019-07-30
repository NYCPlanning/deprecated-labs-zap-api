/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */

const express = require('express');
const pgp = require('pg-promise');

const carto = require('../utils/carto');
const { getProjectsEntity } = require('../utils/get-entities');
const { postProcessProjectsUpdateGeoms } = require('../utils/post-process');
const { projectsUpdateGeoms } = require('../queries/projects-xmls');
const geoSQL = require('../queries/geo');

const router = express.Router({ mergeParams: true });

/**
 * Updates geometries projects modified within a given lookback window. Geometries are
 * pulled from Carto, and written to PostgreSQL with a few metadata fields which can be included
 * as properties on selected 'Feature' geometries.
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, crmClient },
    query: { lookBackSec },
  } = req;

  try {
    // Fetch all projects modified within the lookback window
    const projects = await getAllProjects(crmClient, lookBackSec);

    const BATCH_SIZE = 50;
    const batches = Math.ceil(projects.length / BATCH_SIZE);
    for (let i = 0; i < batches; i++) { // eslint-disable-line
      const projectsBatch = projects.slice(i, i * BATCH_SIZE);

      // Fetch related BBL entities
      const projectUUIDs = projectsBatch.map(project => project.dcp_projectid);
      const projectsBbls = await getProjectsEntity(crmClient, 'bbl', projectUUIDs);

      // Add BBL entities to project objects, and format
      postProcessProjectsUpdateGeoms(projects, projectsBbls);

      // Asyncronously update geoms for all projects
      await Promise.all(
        projects.map(project => updateProjectGeom(dbClient, project)),
      );
      console.log(`Completed updating geometries for batch ${i} of ${batches}`);
    }

    console.log(`Updated projectIds: ${projects.map(project => project.dcp_name)}`); // eslint-disable-line
    res.send({ message: `Successfully updated geometries for ${projects.length} projects` });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: 'Unable to update geometries for newly filed projects' });
  }
});

/**
 * Updates geometry and metadata for the given project, first getting geometry from Carto
 * then executing an UPSERT query against PostgreSQL to update/create geometry for the project.
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {Object} project The project object from CRM to retrieve and update geometries for
 * @returns {Promise} Promise object representing the query result
 */
async function updateProjectGeom(dbClient, project) {
  const query = pgp.as.format(geoSQL.carto_get_geoms, [project.bbls]);
  const [geom] = await carto.SQL(query);
  if (geom) {
    return dbClient.none(
      geoSQL.upsert_geoms,
      [
        project.dcp_name,
        geom.polygons,
        geom.centroid,
        project.dcp_projectname,
        project.dcp_publicstatus_simp,
        project.dcp_lastmilestonedate,
      ],
    );
  }
}

/**
 * Wrapper function to page through CRM responses and get all results. CRM will return up to
 * maximum of 5000 results per page, and it is possible that more than 5000 projects will
 * have been modified within the lookback window.
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {int} lookBackSec The lookback window to use to filter for updated projects, in seconds
 * @returns {Object[]} The full list of all raw projects from CRM
 */
async function getAllProjects(crmClient, lookBackSec) {
  const createdOn = new Date(new Date().getTime() - lookBackSec * 1000);
  const MAX_PROJECTS_PER_PAGE = 5000;
  const projects = [];

  let page = 1;
  while (true) {
    const {
      value,
      '@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded': limitExceeded,
    } = await crmClient.doGet(
      `dcp_projects?fetchXml=${projectsUpdateGeoms(createdOn, page, MAX_PROJECTS_PER_PAGE)}`,
    );

    projects.push(...value);
    if (!limitExceeded) break;

    page += 1;
  }

  return projects;
}

module.exports = router;
