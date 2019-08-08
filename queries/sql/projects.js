const { forIn } = require('./helpers');

function projectsSQL(page, itemsPerPage, projectIds) {
  return `
    SELECT
      dcp_name,
      dcp_ceqrnumber,
      dcp_ceqrtype,
      dcp_projectname,
      dcp_projectbrief,
      dcp_publicstatus_simp,
      dcp_borough,
      dcp_ulurp_nonulurp,
      dcp_communitydistricts,
      actiontypes,
      dcp_certifiedreferred,
      dcp_femafloodzonea,
      dcp_femafloodzonecoastala,
      dcp_femafloodzoneshadedx,
      dcp_femafloodzonev,
      applicants,
      lastmilestonedate,
      CASE
        WHEN project_geoms.centroid IS NOT NULL
        THEN TRUE
        ELSE FALSE
      END as has_centroid,
      ARRAY[ST_X(project_geoms.centroid), ST_Y(project_geoms.centroid)] as center,
      STRING_TO_ARRAY(ulurpnumbers, ';') as ulurpnumbers
    FROM normalized_projects
    LEFT JOIN project_geoms
    ON normalized_projects.dcp_name = project_geoms.projectid
    ${projectIdsFilter(projectIds)}
    ORDER BY
      lastmilestonedate DESC NULLS LAST,
      CASE
        WHEN dcp_publicstatus_simp = 'In Public Review' THEN 1
        WHEN dcp_publicstatus_simp = 'Filed' THEN 2
        WHEN dcp_publicstatus_simp = 'Completed' THEN 3
        ELSE 4
      END ASC
    ${limitOffset(page, itemsPerPage)}
  `;
}

function projectIdsFilter(projectIds) {
  if(!projectIds || !projectIds.length) return '';
  return `WHERE dcp_name IN (${forIn(projectIds)})`;
}

function limitOffset(page, itemsPerPage) {
  if (!(page && itemsPerPage)) return '';
  return `LIMIT ${itemsPerPage} OFFSET ${(page - 1) * itemsPerPage}`;
}

module.exports = { projectsSQL };
