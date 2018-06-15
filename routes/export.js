const express = require('express');
const pgp = require('pg-promise')();

const db = pgp(process.env.DATABASE_CONNECTION_STRING);
const router = express.Router();


router.get('/projectbbls.json', (req, res) => {
  const SQL = `
    SELECT
      string_agg(dcp_bblnumber, ';') as bbls,
      p.dcp_projectname,
      p.dcp_name as projectid
    FROM dcp_projectbbl b
    LEFT JOIN dcp_project p ON p.dcp_projectid = b.dcp_project
    GROUP BY p.dcp_name, p.dcp_projectname;
  `;

  db.any(SQL)
    .then((data) => {
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
