const express = require('express');
const pgp = require('pg-promise')();

const db = pgp(process.env.DATABASE_CONNECTION_STRING);
const router = express.Router();


router.get('/projectbbls', (req, res) => {
  const SQL = `
    SELECT
      string_agg(dcp_bblnumber, ',') as bbls,
      b.dcp_project as projectid
    FROM dcp_projectbbl b
    GROUP BY b.dcp_project;
  `;

  db.any(SQL)
    .then((data) => {
      console.log(data.length)
      res.send(data);
    })
    .catch((err) => {
      console.log(err)
      res.status(404).send({
        error: `no results found`,
      });
    });
});

module.exports = router;
