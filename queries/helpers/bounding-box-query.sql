SELECT
ARRAY[
  ARRAY[
    ST_XMin(bbox),
    ST_YMin(bbox)
  ],
  ARRAY[
    ST_XMax(bbox),
    ST_YMax(bbox)
  ]
] as bbox
FROM (
  SELECT ST_Extent(geom) AS bbox
  FROM (
    SELECT geom
    FROM project_centroids
    WHERE projectid IN (${tileProjects:csv})
  ) x
) y
