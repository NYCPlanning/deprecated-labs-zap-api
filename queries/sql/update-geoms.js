const updateGeomsSQL = `
  INSERT INTO project_geoms(
    projectid,
    polygons,
    centroid
  )
  VALUES ($1, $2, $3)
  ON CONFLICT (projectid)
  DO UPDATE SET
    polygons = $2,
    centroid = $3
`;

module.exports = { updateGeomsSQL };
