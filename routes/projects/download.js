const express = require('express');
const Json2csvTransform = require('json2csv').Transform;
const QueryStream = require('pg-query-stream');
const JSONStream = require('JSONStream');
const { Transform } = require('stream');
const buildProjectsSQL = require('../../utils/build-projects-sql');


const router = express.Router();

/* GET /projects/download.csv */
/* Download a CSV of projects that match the current query params  */
router.get('/', async (req, res) => {
  const { app, query } = req;

  const SQL = buildProjectsSQL(query, 'download');

  // see if this query has data
  const { rowcount } = await app.db.one(`SELECT count(*) AS rowcount FROM (${SQL}) a`);

  // only stream a response if there is data
  if (rowcount > 0) {
    // you can also use pgp.as.format(query, values, options)
    // to format queries properly, via pg-promise;
    const qs = new QueryStream(SQL);

    const transformOpts = { highWaterMark: 16384, encoding: 'utf-8' };
    const json2csv = new Json2csvTransform({}, transformOpts);

    // deduplicates actiontypes for objects in an object stream
    const dedupeActions = new Transform({
      objectMode: true,

      transform(chunk, encoding, callback) {
        if (chunk.actiontypes) {
          const { actiontypes } = chunk;
          const typesArray = actiontypes.split(';');
          const dedupedTypesArray = [...new Set(typesArray)];
          chunk.actiontypes = dedupedTypesArray.join(';');
        }
        callback(null, chunk);
      },
    });

    // Set approrpiate download headers
    res.setHeader('Content-disposition', 'attachment; filename=projects.csv');
    res.writeHead(200, { 'Content-Type': 'text/csv' });

    // Flush the headers before we start pushing the CSV content
    res.flushHeaders();

    app.db.stream(qs, (s) => {
      // initiate streaming into the console:
      // objects are transformed (dedupeActions), then serialized from JSON, then converted to CSV before being returned
      s.pipe(dedupeActions).pipe(JSONStream.stringify()).pipe(json2csv).pipe(res);
    })
      .then((data) => {
        console.log( // eslint-disable-line
          'Total rows processed:', data.processed,
          'Duration in milliseconds:', data.duration,
        );
      })
      .catch((error) => {
        console.log('ERROR:', error); // eslint-disable-line
      });
  } else {
    res.status(500).send({
      error: 'no data',
    });
  }
});

module.exports = router;
