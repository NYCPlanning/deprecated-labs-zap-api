const express = require('express');
const buildProjectsSQL = require('../../utils/build-projects-sql');
const Json2csvTransform = require('json2csv').Transform;
const QueryStream = require('pg-query-stream');
const JSONStream = require('JSONStream');

const router = express.Router();

/* GET /projects/download.csv */
/* Download a CSV of projects that match the current query params  */
router.get('/', async (req, res) => {
  const { app, query } = req;

  const SQL = buildProjectsSQL(query, 'download');

  // you can also use pgp.as.format(query, values, options)
  // to format queries properly, via pg-promise;
  const qs = new QueryStream(SQL);

  const transformOpts = { highWaterMark: 16384, encoding: 'utf-8' };
  const json2csv = new Json2csvTransform({}, transformOpts);

  // Set approrpiate download headers
  res.setHeader('Content-disposition', 'attachment; filename=projects.csv');
  res.writeHead(200, { 'Content-Type': 'text/csv' });

  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();

  app.db.stream(qs, (s) => {
    // initiate streaming into the console:
    s.pipe(JSONStream.stringify()).pipe(json2csv).pipe(res);
  })
    .then((data) => {
      console.log(
        'Total rows processed:', data.processed,
        'Duration in milliseconds:', data.duration,
      );
    })
    .catch((error) => {
      console.log('ERROR:', error);
    });
});

module.exports = router;
