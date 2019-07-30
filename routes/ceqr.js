const express = require('express');
const cartoClient = require('../clients/carto-client');

const router = express.Router();

/**
 * Redirects to an external resource for the CEQR id, if one is listed in the
 * `ceqrview_projects` dataset, or redirects to ceqraccess homepage
 */
router.get('/:ceqrnumber', async (req, res) => {
  const { ceqrnumber } = req.params;

  const SQL = `SELECT url FROM ceqrview_projects WHERE ceqr_number IN ('${ceqrnumber}')`;

  try {
    const [data] = await cartoClient.SQL(SQL);
    const { url } = data;

    res.redirect(301, url);
  } catch (error) {
    res.redirect(301, 'https://a002-ceqraccess.nyc.gov/ceqr/');
  }
});

module.exports = router;
