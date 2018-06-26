SELECT ST_AsMVT(q, 'project-centroids', 4096, 'geom')
FROM (
  SELECT
      c.projectid,
      p.dcp_projectname,
      ST_AsMVTGeom(
          geom,
          ST_MakeEnvelope($1, $2, $3, $4, 4326),
          4096,
          256,
          false
      ) geom
  FROM project_centroids c
  LEFT JOIN dcp_project p
    ON c.projectid = p.dcp_name
  WHERE ST_Intersects(ST_SetSRID(geom, 4326), ST_MakeEnvelope($1, $2, $3, $4, 4326))
  AND projectid IN ($5:csv)
) q
