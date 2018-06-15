const carto = require('../utils/carto');

function getBblFeatureCollection(bbls) {
  if (bbls === null) return null;
  const SQL = `
    SELECT the_geom
    FROM mappluto_v1711
    WHERE bbl IN (${bbls.join(',')})
  `;

  return carto.SQL(SQL, 'geojson');
}

module.exports = getBblFeatureCollection;
