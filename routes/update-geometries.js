/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */

const express = require('express');
const pgp = require('pg-promise');

const cartoClient = require('../clients/carto-client');
const { getAllProjectsUpdateGeoms } = require('../utils/projects/get-projects');
const { getProjectsUpdateGeomsEntities } = require('../utils/projects/get-entities');
const { postProcessProjectsUpdateGeoms } = require('../utils/projects/post-process');
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
    const projects = await getAllProjectsUpdateGeoms(crmClient, lookBackSec);

    // Execute updates in batches to avoid:
    // - heap issues if A LOT of projects were modified within the lookback
    // - too-long URI for bbl entity fetch (if fetching entities for too many projects)
    const BATCH_SIZE = 50;
    const batches = Math.ceil(projects.length / BATCH_SIZE);
    for (let i = 0; i < batches; i++) { // eslint-disable-line
      const projectsBatch = projects.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      // Fetch related entities
      const projectUUIDs = projectsBatch.map(project => project.dcp_projectid);
      const entities = await getProjectsUpdateGeomsEntities(crmClient, projectUUIDs);

      // Add entities to project objects, and format
      postProcessProjectsUpdateGeoms(projects, entities);

      // Asyncronously update geoms for all projects
      await Promise.all(
        projects.map(project => updateProjectGeom(dbClient, project)),
      );
      console.log(`Completed updating geometries for batch ${i + 1} of ${batches}`); // eslint-disable-line
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
  const [geom] = await cartoClient.SQL(query);
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


module.exports = router;
