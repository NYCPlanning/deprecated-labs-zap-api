WITH tilebounds (geom) AS (SELECT ST_MakeEnvelope($1, $2, $3, $4, 4326))
SELECT ST_AsMVT(q, 'project-centroids', 4096, 'geom')
FROM (
  SELECT
    projectid,
    dcp_projectname,
    dcp_publicstatus_simp,
    ST_AsMVTGeom(
      x.geom,
      tileBounds.geom,
      4096,
      256,
      false
    ) geom
  FROM (
    $5^
  ) x, tilebounds
  WHERE ST_Intersects(x.geom, tilebounds.geom)
) q
