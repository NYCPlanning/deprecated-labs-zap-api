/**
 * Queries for getting and setting geo data in zap-api PostgreSQL database.
 * Geo data supplements projects data from CRM, providing centroids for projects
 * returned in the 'list' view (`/projects`), and BBL multipolygons for individual
 * projects returned in the 'show' view (`/projects/id`). Geo data source of truth
 * is mappluto dataset in carto, and is synced into the PostgreSQL cluster via the
 * `/update-geometries` route in this API.
 */

// Get project centers for `/projects` response
const centers = `
  SELECT
    projectid,
    ARRAY[ST_X(centroid), ST_Y(centroid)] AS center
  FROM  project_geoms
  WHERE projectid IN ($1:list)
`;

// Get project bbls for `/projects/id` response
const bbl_multipolygon = `
  SELECT ST_AsGeoJSON(polygons, 6) AS geom
  FROM project_geoms
  WHERE projectid = $1
`;

// Get projects bbls for `/update-geometries`
const bbl_multipolygons = `
  SELECT ST_AsGeoJSON(polygons, 6) AS geom
  FROM project_geoms
  WHERE projectid IN ($1:list)
`;

// Get radius-bounded project ids for `/projects` filters
const radius_search = `
  SELECT projectid
  FROM project_geoms
  WHERE ST_DWithin(
    ST_MakePoint($1, $2)::geography,
    polygons::geography,
    $3
  )
`;

// Upsert geoms data for `/update-geometries`
const upsert_geoms = `
  INSERT INTO project_geoms(
    projectid,
    polygons,
    centroid,
    projectname,
    publicstatus_simp,
    lastmilestonedate
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (projectid)
  DO UPDATE SET
    polygons = $2,
    centroid = $3,
    projectname = $4,
    publicstatus_simp = $5,
    lastmilestonedate = $6
`;

// Get geoms from carto for `/update-geometries`
const carto_get_geoms = `
  SELECT
    ST_Multi(ST_Union(the_geom)) AS polygons,
    ST_Centroid(ST_Union(the_geom)) AS centroid
  FROM mappluto
  WHERE bbl IN ($1:list)
`;

// Get vector tile for `/tiles`
const generate_vector_tile = `
  WITH tilebounds (geom) AS ( SELECT  ST_MakeEnvelope($1, $2, $3, $4, 3857))
  SELECT ST_AsMVT(tile, 'project-centroids', 4096, 'geom')
  FROM (
    SELECT
      p.projectid AS dcp_projectid,
      p.projectname AS dcp_projectname,
      p.publicstatus_simp AS dcp_publicstatus_simp,
      p.lastmilestonedate AS lastmilestonedate,
      ST_AsMVTGeom(p.$5^, t.geom, 4096, 256, false) AS geom
    FROM project_geoms p, tilebounds t
    WHERE p.projectid IN ($6:list)
    ORDER BY
      CASE
        WHEN p.publicstatus_simp = 'In Public Review' THEN 1
        WHEN p.publicstatus_simp = 'Filed' THEN 2
        WHEN p.publicstatus_simp = 'Completed' THEN 3
        ELSE 4
      END
    DESC
  ) tile
`;

module.exports = {
  centers,
  bbl_multipolygon,
  bbl_multipolygons,
  radius_search,
  upsert_geoms,
  carto_get_geoms,
  generate_vector_tile,
};
