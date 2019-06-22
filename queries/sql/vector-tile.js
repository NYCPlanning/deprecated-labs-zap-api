const vectorTileSQL = `
  WITH tilebounds (geom) AS ( SELECT  ST_MakeEnvelope($1, $2, $3, $4, 3857))
  SELECT ST_AsMVT(tile, 'project-centroids', 4096, 'geom')
  FROM (
    SELECT
      projectid,
      dcp_projectname,
      dcp_publicstatus_simp,
      lastmilestonedate,
      ST_AsMVTGeom(projects.$5^, tilebounds.geom, 4096, 256, false) AS geom
    FROM (
      SELECT
        centroid_3857,
        polygons_3857,
        projectid,
        dcp_projectname,
        dcp_publicstatus_simp,
        lastmilestonedate
      FROM project_geoms pg 
      LEFT JOIN normalized_projects np
      ON pg.projectid = np.dcp_name
      WHERE np.dcp_name IN ($6:list)
    ) projects, tilebounds
    ORDER BY
      CASE
        WHEN dcp_publicstatus_simp = 'In Public Review' THEN 1
        WHEN dcp_publicstatus_simp = 'Filed' THEN 2
        WHEN dcp_publicstatus_simp = 'Completed' THEN 3
        ELSE 4
      END
    DESC
  ) tile
`;

module.exports = { vectorTileSQL };
