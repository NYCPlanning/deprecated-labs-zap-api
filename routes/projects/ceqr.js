const express = require('express');

const router = express.Router();

router.get('/:ceqrnumber', async (req, res) => {
  const { app, params } = req;
  const { ceqrnumber } = params;
  // find projectid for this ceqrnumber
  // http://localhost:3000/projects/ceqr/18DCP155K

  const SQL = `SELECT dcp_name as projectid FROM dcp_project WHERE dcp_ceqrnumber LIKE '${ceqrnumber}'`;

  // ceqrnumber should be 6-10 capital letters, numbers, and hyphens
  if (ceqrnumber.match(/^[0-9A-Z-]{6,10}$/)) {
    try {
      const { projectid } = await app.db.one(SQL);
      const url = `https://zap.planning.nyc.gov/projects/${projectid}`;

      res.redirect(301, url);
    } catch (error) {
      res.redirect(301, 'https://a002-ceqraccess.nyc.gov/ceqr/');
    }
  } else {
    res.status(422).send({
      error: 'Invalid input',
    });
  }
});


module.exports = router;
