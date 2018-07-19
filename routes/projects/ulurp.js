const express = require('express');

const router = express.Router();

router.get('/:ulurpnumber', async (req, res) => {
  const { app, params } = req;
  const { ulurpnumber } = params;
  // find projectid for this ceqrnumber
  // http://localhost:3000/projects/ulurp/170358ZMM

  const SQL = `SELECT dcp_name as projectid FROM normalized_projects WHERE ulurpnumbers ILIKE '%${ulurpnumber}%'`;

  // ulurpnumber should be 6-10 capital letters, numbers, and hyphens
  if (ulurpnumber.match(/^[0-9A-Za-z]{4,12}$/)) {
    try {
      const { projectid } = await app.db.one(SQL);
      const url = `https://zap.planning.nyc.gov/projects/${projectid}`;

      res.redirect(301, url);
    } catch (error) {
      res.redirect(301, 'https://zap.planning.nyc.gov/projects');
    }
  } else {
    res.status(422).send({
      error: 'Invalid input',
    });
  }
});

module.exports = router;
