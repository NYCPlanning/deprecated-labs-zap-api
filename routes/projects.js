const express = require('express');
const path = require('path');

// print the SQL query
const initOptions = {
  query(e) {
     (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  },
};

const pgp = require('pg-promise')(initOptions);
const getBblFeatureCollection = require('../utils/get-bbl-feature-collection');

const db = pgp(process.env.DATABASE_CONNECTION_STRING);
const router = express.Router();

// Helper for linking to external query files:
function sql(file) {
  const fullPath = path.join(__dirname, file);
  return new pgp.QueryFile(fullPath, { minify: true });
}

const listProjectsQuery = sql('../queries/projects/index.sql');
const findProjectQuery = sql('../queries/projects/show.sql');
const paginateQuery = sql('../queries/helpers/paginate.sql');

function generatePaginate(values) {
  return {
    toPostgres() { return pgp.as.format(paginateQuery, values); },
    rawType: true,
  };
}

/* GET /projects */
router.get('/', async (req, res) => {
  // extract params, set defaults
  const {
    query: {
      // pagination
      page = 1,
      itemsPerPage = 30,

      // filters
      'community-district': communityDistrict = '',
      dcp_publicstatus = ['Approved', 'Withdrawn', 'Filed', 'Certified', 'Unknown'],
      dcp_ceqrtype = ['Type I', 'Type II', 'Unlisted', 'Unknown'],
      dcp_ulurp_nonulurp = ['ULURP', 'Non-ULURP'],
      dcp_femafloodzonea = false,
      dcp_femafloodzonecoastala = false,
      dcp_femafloodzoneshadedx = false,
      dcp_femafloodzonev = false,
    },
  } = req;

  const paginate = generatePaginate({ itemsPerPage, offset: (page - 1) * itemsPerPage });

  try {
    const projects =
      await db.any(listProjectsQuery, {
        communityDistrict,
        dcp_publicstatus,
        dcp_ceqrtype,
        dcp_ulurp_nonulurp,
        paginate,
      });

    const [{ total_projects: total = 0 } = {}] = projects || [];
    const { length = 0 } = projects;

    res.send({
      data: projects.map(project => ({
        type: 'projects',
        id: project.dcp_name,
        attributes: project,
      })),
      meta: {
        total,
        pageTotal: length,
      },
    });
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});

/* GET /projects/:id */
/* Retreive a single project */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const project = await db.one(findProjectQuery, { id });
    project.bbl_featurecollection = await getBblFeatureCollection(project.bbls);

    res.send({
      data: {
        type: 'projects',
        id,
        attributes: project,
      },
    });
  } catch (e) {
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
