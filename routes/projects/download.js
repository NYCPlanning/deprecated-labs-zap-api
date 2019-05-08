const express = require('express');
const { parse: json2csv } = require('json2csv');
const buildProjectsSQL = require('../../utils/build-projects-sql');
const transformActions = require('../../utils/transform-actions');


const router = express.Router();

/* GET /projects/download.csv */
/* Download a CSV of projects that match the current query params  */
router.get('/', async (req, res) => {
  const { app, query } = req;

  const SQL = buildProjectsSQL(query, 'download');

  try {
    const data = await app.db.any(SQL);
    // only stream a response if there is data
    if (data.length) {
      data.map(row => transformActions(row));
      const csv = json2csv(data, { highWaterMark: 16384, encoding: 'utf-8' });

      res.setHeader('Content-type', 'text/csv');
      res.send(csv);
    } else {
      res.status(500).send({
        error: 'Unable to fetch data for CSV download',
      });
    }
  } catch (err) {
    console.log(err); // eslint-disable-line
    res.status(500).send({
      error: 'Unable to generate CSV from data',
    });
  }
});

module.exports = router;
