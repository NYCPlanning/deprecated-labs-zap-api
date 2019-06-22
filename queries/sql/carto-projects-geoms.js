const cartoProjectsGeomsSQL = `
  SELECT
    ST_Multi(ST_Union(the_geom)) AS polygons,
    ST_Centroid(ST_Union(the_geom)) AS centroid
  FROM mappluto
  WHERE bbl IN ($1:list)
`;

module.exports = { cartoProjectsGeomsSQL };
