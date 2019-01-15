const carto = require('../utils/carto');

function getProjectGeoms(bbls) {
  let collectedBBLs = bbls;
  if (collectedBBLs === null) return null;

  collectedBBLs = collectedBBLs.filter(bbl => bbl !== null);

  const SQL = `
    SELECT
      ST_Union(the_geom) AS polygons,
      ST_Centroid(ST_Union(the_geom)) AS centroid
    FROM mappluto_18v_1_1
    WHERE bbl IN (${collectedBBLs.join(',')})
  `;
  return carto.SQL(SQL, 'json', 'post')
    .then(d => d[0]); // return first object in carto response
}

module.exports = getProjectGeoms;
