const express = require('express');

const { projectForULURPXML } = require('../queries/project-xmls');

const router = express.Router();

router.get('/:ulurpNumber', async (req, res) => {
  const {
    app : { crmClient },
    params: { ulurpNumber },
  } = req;

  // ulurpNumber should be 6-10 capital letters, numbers, and hyphens
  if (ulurpNumber.match(/^[0-9A-Za-z]{4,12}$/) === null) {
    res.status(422).send({ error: 'Invalid ULURP number' });
    return;
  }

  let url = 'https://zap.planning.nyc.gov/projects';
  try {
    const { value: [project] } = await crmClient.doGet(`dcp_projects?fetchXml=${projectForULURPXML(ulurpNumber)}`)
    if (project.dcp_name) {
      url += `/${project.dcp_name}`;
    }    
  } catch (error) {
    console.log(`Unable to find project for ULURP Number ${ulurpNumber}:`, error);
  }

  res.redirect(301,url);
});

module.exports = router;
