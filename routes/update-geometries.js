/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */

const express = require('express');
const pgp = require('pg-promise');

const dedupeList = require('../utils/dedupe-list');
const carto = require('../utils/carto');
const { postProcessProjectsUpdateGeoms } = require('../utils/post-process');
const { projectsUpdateGeoms, projectsBblsXML } = require('../queries/projects-xmls');
const geoSQL = require('../queries/geo');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  const {
    app: { dbClient, crmClient },
    query: { lookBackSec },
  } = req;

  try {
    const projects = await getAllProjects(crmClient, lookBackSec);
    const projectUUIDs = projects.map(project => project.dcp_projectid);
    const { value: projectsBbls } = await crmClient.doGet(`dcp_projectbbls?fetchXml=${projectsBblsXML(projectUUIDs)}`);
    postProcessProjectsUpdateGeoms(projects, projectsBbls); 

    await Promise.all(
      projects.map(project => updateProjectGeom(dbClient, project)),       
    );
    console.log(`Updated projectIds: ${projects.map(project => project.dcp_name)}`); // eslint-disable-line
    res.send({ message: `Successfully updated geometries for ${projects.length} projects` });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: 'Unable to update geometries for newly filed projects' });
  }
});

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
        project.dcp_lastmilestonedate
      ],
    );
  }
}

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
      `dcp_projects?fetchXml=${projectsUpdateGeoms(createdOn, page, MAX_PROJECTS_PER_PAGE)}`
    );

    projects.push(...value);
    if (!limitExceeded) break;

    page += 1;
  }

  return projects;
}

module.exports = router;
