const { forIn } = require('./helpers');

function projectsDownloadSQL(projectIds, type = 'csv') {
  return `
    SELECT
      dcp_name as projectId,
      dcp_ceqrnumber as ceqrNumber,
      dcp_ceqrtype as ceqrType,
      dcp_projectname as projectName,
      dcp_projectbrief as projectDescription,
      dcp_borough as borough,
      dcp_ulurp_nonulurp as  ulurpNonUlurp,
      dcp_communitydistricts as communityDistricts,
      actionTypes as actionTypes,
      applicants as applicants,
      lastmilestonedate as lastMilestoneDate,
      ${geoColumn(type)}
    FROM normalized_projects
    LEFT JOIN project_geoms
    ON normalized_projects.dcp_name = project_geoms.projectid
    WHERE dcp_name IN (${forIn(projectIds)})
  `;
}

function geoColumn(type) {
  if (type === 'csv') return `ARRAY[ST_X(project_geoms.centroid), ST_Y(project_geoms.centroid)] as center`;

  return `ST_AsGeoJSON(project_geoms.polygons) AS geom`;
}

module.exports = { projectsDownloadSQL };
