// REQUIRE CODE LIBRARY DEPENDENCIES
require('dotenv').config({ path: '../.env' });
const express = require('express');
const upsertGeoms = require('../../utils/upsert-geoms');

const router = express.Router({ mergeParams: true });

// QUERY FOR PROJECTS
const getProjectsSQL = `
  SELECT
    d.dcp_name
  FROM
    dcp_projectmilestone as mm
  LEFT JOIN
    dcp_project AS d
  ON
    mm.dcp_project = d.dcp_projectid
  WHERE mm.dcp_milestone = '663beec4-dad0-e711-8116-1458d04e2fb8'
    AND d.dcp_name NOT IN (SELECT projectid FROM project_geoms)
    AND d.dcp_visibility = 'General Public'
    AND d.dcp_projectid IN (
      SELECT DISTINCT dcp_project FROM dcp_projectbbl WHERE statuscode = 'Active')
  `;
// Note: Milestone 663beec4-dad0-e711-8116-1458d04e2fb8 = 'Prepare Filed Land Use Application'

router.get('/', async (req, res) => {
  const { app } = req; // request, connect to the database with app in app.js
  // GET PROJECTS FROM PSQL DATABASE
  const projects = await app.db.any(getProjectsSQL)
    .then(response => response.map(d => d.dcp_name))
    .catch((err) => {
      console.log(err); // eslint-disable-line
    });

  console.log(`Found ${projects.length} projects`); // eslint-disable-line

  // RUN API CALL FOR EACH PROJECT RECORD

  const errorMessages = [];
  const failureMessages = [];

  await Promise.all(projects.map(async (project) => {
    const response = await upsertGeoms(project, app.db);

    if (response.error) errorMessages.push(response.error);
    if (response.status === 'failure') failureMessages.push(response.message);
  }));

  const message = {
    success: projects.length - errorMessages.length - failureMessages.length,
    failure: failureMessages.length,
    failureMessages: failureMessages.join(', '),
    error: errorMessages.length,
    errorMessages: errorMessages.join(', '),
  };

  const status = errorMessages.length > 0 ? 500 : 200;

  res.status(status).send(message);
});

module.exports = router;
