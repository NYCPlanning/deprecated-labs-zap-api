const projectGeomsSQL = `
  SELECT
    ST_AsGeoJSON(polygons, 6) AS multipolygon
  FROM project_geoms
  WHERE projectid = $1
`;

module.exports = { projectGeomsSQL };
