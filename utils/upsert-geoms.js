const carto = require('../utils/carto');

const matchBBLSQL = `
  SELECT
   (
      SELECT json_agg(b.dcp_bblnumber)
      FROM dcp_projectbbl b
      WHERE b.dcp_project = p.dcp_projectid
      AND b.dcp_bblnumber IS NOT NULL AND b.statuscode = 'Active'
    ) AS bbls
  FROM dcp_project p
  WHERE dcp_name = \${id}
    AND dcp_visibility = 'General Public'
`;

// SQL template, upsert command to insert rows that don't exist and update rows that do exist
const upsertSQL = `
  INSERT INTO project_geoms(projectid, polygons, centroid, mappluto_v)
  VALUES
    (
    \${id},
    \${polygons},
    \${centroid},
    \${mappluto_v}
    )
  ON CONFLICT (projectid)
  DO
    UPDATE
      SET
        polygons = \${polygons},
        centroid = \${centroid},
        mappluto_v = \${mappluto_v};
`;

// SQL template to delete records that match the project id
// SELECT 1 returns a column of 1's for every row in the table
const deleteProjectSQL = `
  DELETE FROM project_geoms WHERE EXISTS (
    SELECT 1 FROM project_geoms WHERE projectid = \${id}
  );
`;

// Define function that retrieves geoms from MapPLUTO on Carto
const getProjectGeoms = async (bbls) => {
  let collectedBBLs = bbls;
  if (collectedBBLs === null) return null;

  collectedBBLs = collectedBBLs.filter(bbl => bbl !== null);

  const SQL = `
    SELECT
      ST_Multi(ST_Union(the_geom)) AS polygons,
      ST_Centroid(ST_Union(the_geom)) AS centroid,
      version AS mappluto_v
    FROM mappluto_18v2
    WHERE bbl IN (${collectedBBLs.join(',')})
    GROUP BY version
  `;

  const cartoResponse = await carto.SQL(SQL, 'json', 'post');
  if (cartoResponse.length === 0) {
    return {
      polygons: null,
      centroid: null,
      mappluto_v: null,
    };
  }

  return cartoResponse[0]; // return first object in carto response, carto.sql always return an array
};

async function upsertGeoms(id, db) {
  try {
    const { bbls } = await db.one(matchBBLSQL, { id }); // an array of bbls that match the project id
    // if a project has no bbls, remove project
    if (!bbls) {
      await db.none(deleteProjectSQL, { id }); // eslint-disable-line,
      return {
        status: 'failure',
        message: `ZAP data does not list any BBLs for project ${id}`,
      };
    }

    const { polygons, centroid, mappluto_v } = await getProjectGeoms(bbls); // get geoms from carto that match array of bbls

    if (polygons == null) {
      return {
        status: 'failure',
        message: `MapPLUTO does not contain matching BBLs for project ${id}`,
      };
    }

    // update geometry on existing project or insert new project with geoms (upsert)
    await db.none(upsertSQL, {
      id,
      polygons,
      centroid,
      mappluto_v,
    });

    return {
      status: 'success',
      message: `Updated geometries for project ${id}`,
    };
  } catch (e) {
    return {
      error: e.toString(),
    };
  }
}

module.exports = upsertGeoms;
