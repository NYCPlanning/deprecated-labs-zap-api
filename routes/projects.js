const express = require('express');
const pgp = require('pg-promise')();

const db = pgp(process.env.DATABASE_CONNECTION_STRING);
const router = express.Router();

const detailProjectColumns = `
  dcp_name,
  dcp_projectid,
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
  dcp_publicstatus,
  (
    SELECT json_agg(json_build_object(
      'dcp_validatedborough', b.dcp_validatedborough,
      'dcp_validatedblock', b.dcp_validatedblock,
      'dcp_validatedlot', b.dcp_validatedlot,
      'dcp_bblnumber', b.dcp_bblnumber
    ))
    FROM dcp_projectbbl b
    WHERE b.dcp_project = p.dcp_projectid
  ) AS bbls,
  (
    SELECT json_agg(json_build_object(
      'dcp_name', a.dcp_name,
      'dcp_ulurpnumber', a.dcp_ulurpnumber,
      'dcp_prefix', a.dcp_prefix,
      'statuscode', a.statuscode,
      'milestones', (
        SELECT json_agg(json_build_object(
          'dcp_name', m.dcp_name,
          'dcp_plannedstartdate', m.dcp_plannedstartdate,
          'dcp_plannedcompletiondate', m.dcp_plannedcompletiondate,
          'statuscode', m.statuscode,
          'dcp_milestonesequence', m.dcp_milestonesequence
        ))
        FROM (
          SELECT * FROM dcp_projectmilestone mm
          WHERE mm.dcp_projectaction = a.dcp_projectactionid
          ORDER BY mm.dcp_milestonesequence ASC
        ) m
      )
    ))
    FROM dcp_projectaction a
    WHERE a.dcp_project = p.dcp_projectid
  ) AS actions
`;

// columns for use in list view
const listProjectColumns = `
  dcp_name,
  dcp_projectname,
  dcp_projectbrief
`;

/* GET /projects/:id */
/* Retreive a single project */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const SQL = `
    SELECT ${detailProjectColumns}
    FROM dcp_project p
    WHERE dcp_name = '${id}'
  `;
  db.one(SQL)
    .then((data) => {
      res.send(data);
    })
    .catch((error) => {
      console.log(error)
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
    SELECT ${listProjectColumns}
    FROM dcp_project p
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
