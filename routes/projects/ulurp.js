const express = require('express');

const { projectForULURPXML } = require('../../queries/xml/project-for-ulurp');

const router = express.Router();

/**
 * Redirects to the route for a single project ID, if a project ID for the given ULURP
 * number can be determined, or redirects to the unfiltered `/projects` route
 */
router.get('/:ulurpNumber', async (req, res) => {
  const {
    app: { crmClient },
    params: { ulurpNumber },
  } = req;

  // ulurpNumber should be 6-10 capital letters, numbers, and hyphens
  if (ulurpNumber.match(/^[0-9A-Za-z]{4,12}$/) === null) {
    res.status(422).send({ error: 'Invalid ULURP number' });
    return;
  }

  let url = 'https://zap.planning.nyc.gov/projects';
  try {
    // Fetch a project associated with the given ULURP number
    const { value: [project] } = await crmClient.doGet(`dcp_projects?fetchXml=${projectForULURPXML(ulurpNumber)}`);
    if (project && project.dcp_name) {
      // Update redirect target to include project id, if exists
      url += `/${project.dcp_name}`;
    }
  } catch (error) {
    console.log(`Unable to find project for ULURP Number ${ulurpNumber}:`, error); // eslint-disable-line
  }

  res.redirect(301, url);
});

module.exports = router;
