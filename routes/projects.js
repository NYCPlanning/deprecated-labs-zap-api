const express = require('express');
const pgp = require('pg-promise')();

const db = pgp(process.env.DATABASE_CONNECTION_STRING);
const router = express.Router();

const projectColumns = `
  dcp_name,
  dcp_projectname,
  dcp_projectbrief,
  dcp_borough,
  dcp_ulurp_nonulurp,
  dcp_leaddivision,
  dcp_applicant_customer,
  dcp_ceqrtype,
  dcp_ceqrnumber,
  dcp_easeis,
  dcp_leadagencyforenvreview,
  dcp_alterationmapnumber,
  dcp_sischoolseat,
  dcp_sisubdivision,
  dcp_previousactiononsite,
  dcp_wrpnumber,
  dcp_nydospermitnumber,
  dcp_bsanumber,
  dcp_lpcnumber,
  dcp_decpermitnumber,
  dcp_femafloodzonea,
  dcp_femafloodzonecoastala,
  dcp_femafloodzonecoastala,
  dcp_femafloodzonev,
  dcp_publicstatus
`;

/* GET /projects/:id */
/* Retreive a single project */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const SQL = `
    SELECT ${projectColumns}
    FROM dcp_project
    WHERE dcp_name = '${id}'
  `;
  db.one(SQL)
    .then((data) => {
      res.send(data);
    })
    .catch(() => {
      res.status(404).send({
        error: `no project found with id ${id}`,
      });
    });
});

/* GET /projects/geography/:id */
/* Retreive all projects for a geography */
router.get('/geography/:id', (req, res) => {
  const { id } = req.params;

  // TODO this only works with a well-formed community district acronym
  // make it validate geography, and work with different geography types
  const SQL = `
    SELECT ${projectColumns}
    FROM dcp_project
    WHERE dcp_validatedcommunitydistricts LIKE '%${id}%'
  `;

  db.any(SQL)
    .then((data) => {
      res.send(data);
    })
    .catch(() => {
      res.status(404).send({
        error: `no projects found for geography ${id}`,
      });
    });
});

module.exports = router;
