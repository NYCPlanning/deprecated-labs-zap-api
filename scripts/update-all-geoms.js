// REQUIRE CODE LIBRARY DEPENDENCIES
require('dotenv').config({ path: '../.env' });
const pgp = require('pg-promise')();
const fetch = require('node-fetch');

// CONNECT TO DATABASE USING ENV CONFIG
const { DATABASE_URL } = process.env;
const db = pgp(DATABASE_URL);

// QUERY FOR PROJECTS
const getProjectsSQL = `
  SELECT dcp_name
  FROM dcp_project
  WHERE dcp_visibility = 'General Public'
  AND dcp_projectid IN (
    SELECT DISTINCT dcp_project FROM dcp_projectbbl WHERE statuscode = 'Active')
  `;

(async () => { // self executing async function
// GET PROJECTS FROM PSQL DATABASE
  const projects = await db.any(getProjectsSQL)
    .then(response => response.map(d => d.dcp_name))
    .catch((err) => {
      console.log(err);
    });

  console.log(`Found ${projects.length} projects`);

  // RUN API CALL FOR EACH PROJECT RECORD

  let i = 0;
  const updateGeoms = async () => {
    const apiUrl = `http://localhost:3000/projects/update-geometries/${projects[i]}`;
    const status = await fetch(apiUrl)
      .then(d => d.json())
      .catch(() => {
        console.log(`Something went wrong with ${projects[i]}`);
      });
    if (status) console.log(`${i}: ${status.message}`);
    i += 1;
    if (i === projects.length) {
      console.log('Done');
    } else updateGeoms();
  };

  updateGeoms();
})();
