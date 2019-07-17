const centers = `
  SELECT 
    projectid,
    ARRAY[ST_X(centroid), ST_Y(centroid)] AS center
  FROM  project_geoms
  WHERE projectid in ($1:list)
`;

const bbl_multipolygon = `
  SELECT ST_AsGeoJSON(polygons, 6) as geom
  FROM project_geoms
  WHERE projectid = $1
`;

const bbl_multipolygons = `
  SELECT ST_AsGeoJSON(polygons, 6) as geom
  FROM project_geoms
  WHERE projectid in ($1:list)
`;

const radius_search = `
  SELECT projectid
  FROM project_geoms
  WHERE ST_DWithin(
    ST_MakePoint($1, $2)::geography,
    polygons::geography,
    $3
  )
`;

module.exports = {
  centers,
  bbl_multipolygon,
  bbl_multipolygons,
  radius_search,
};
