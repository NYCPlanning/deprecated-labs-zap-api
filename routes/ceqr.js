const express = require('express');
const carto = require('../utils/carto');

const router = express.Router();

router.get('/:ceqrnumber', async (req, res) => {
  const { ceqrnumber } = req.params;

  const SQL = `SELECT url FROM ceqrview_projects WHERE ceqr_number IN ('${ceqrnumber}')`;

  try {
    const [data] = await carto.SQL(SQL);
    const { url } = data;

    res.redirect(301, url);
  } catch (error) {
    res.redirect(301, 'https://a002-ceqraccess.nyc.gov/ceqr/');
  }
});

module.exports = router;
