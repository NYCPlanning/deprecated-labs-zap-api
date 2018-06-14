const express = require('express');
const pgp = require('pg-promise')();
const carto = require('../utils/carto');

const db = pgp(process.env.DATABASE_CONNECTION_STRING);
const router = express.Router();

const getBblFeatureCollection = (bbls) => {
  if (bbls === null) return null;
  const SQL = `
    SELECT the_geom
    FROM mappluto_v1711
    WHERE bbl IN (${bbls.join(',')})
  `;

  return carto.SQL(SQL, 'geojson');
};

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
    SELECT json_agg(b.dcp_bblnumber)
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
  ) AS actions,
  (
    SELECT json_agg(json_build_object(
      'dcp_keyword', k.dcp_keyword
    ))
    FROM dcp_projectkeywords k
    WHERE k.dcp_project = p.dcp_projectid
  ) AS keywords,
  (
    SELECT json_agg(json_build_object(
      'dcp_validatedaddressnumber', a.dcp_validatedaddressnumber,
      'dcp_validatedstreet', a.dcp_validatedstreet
    ))
    FROM dcp_projectaddress a
    WHERE a.dcp_project = p.dcp_projectid
  ) AS addresses
`;

// columns for use in list view
const listProjectColumns = `
  dcp_name,
  dcp_projectname,
  dcp_projectbrief
`;

/* GET /projects */
router.get('/', ({ query: { 'community-district': communityDistrict } }, res) => {
  // TODO this only works with a well-formed community district acronym
  // make it validate geography, and work with different geography types
  let SQL = `
    SELECT ${listProjectColumns}
    FROM dcp_project p
  `;

  if (communityDistrict) {
    SQL += `WHERE dcp_validatedcommunitydistricts ILIKE '%${communityDistrict}%'`;
  }

  db.any(SQL)
    .then((data) => {
      res.send(data);
    })
    .catch(() => {
      res.status(404).send({
        error: `no projects found for geography ${communityDistrict}`,
      });
    });
});

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
    .then(async (project) => {
      project.bbl_featurecollection = await getBblFeatureCollection(project.bbls);

      res.send({
        data: {
          type: 'projects',
          id,
          attributes: project,
        },
      });
    })
    .catch((error) => {
      res.status(404).send({
        error: `no project found with id ${id}`,
      });
    });
});

module.exports = router;
