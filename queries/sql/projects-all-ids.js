const { forIlike, forIn } = require('./helpers');

function projectsAllIdsSQL(query) {
  const {
    'community-districts': community_districts = [],
    'action-types': action_types = [],
    boroughs = [],
    dcp_ulurp_nonulurp = [],
    dcp_femafloodzonev = false,
    dcp_femafloodzonecoastala = false,
    dcp_femafloodzonea = false,
    dcp_femafloodzoneshadedx = false,
    dcp_publicstatus = [],
    dcp_certifiedreferred = [],
    project_applicant_text = '',
    block = '',
    distance_from_point = [],
    radius_from_point = null,
  } = query;

  return `
    SELECT
      dcp_name
    FROM normalized_projects
    LEFT JOIN project_geoms
    ON normalized_projects.dcp_name = project_geoms.projectid
    WHERE dcp_visibility = 'General Public'
      ${communityDistrictFilter(community_districts)}
      ${actionTypesFilter(action_types)}
      ${boroughsFilter(boroughs)}
      ${ulurpNonUlurpFilter(dcp_ulurp_nonulurp)}
      ${femaFloodZoneFilter(dcp_femafloodzonev, dcp_femafloodzonecoastala, dcp_femafloodzonea, dcp_femafloodzoneshadedx)}
      ${publicStatusFilter(dcp_publicstatus)}
      ${certifiedReferredFilter(dcp_certifiedreferred)}
      ${projectApplicantTextFilter(project_applicant_text)}
      ${blockFilter(block)}
      ${radiusBoundingFilter(distance_from_point, radius_from_point)}
  `;
}

function communityDistrictFilter(communityDistricts) {
  if (!communityDistricts.length) return '';
  return `AND dcp_communitydistricts ILIKE ANY (array[${forIlike(communityDistricts)}])`;
}

function actionTypesFilter(actionTypes) {
  if (!actionTypes.length) return '';
  return `AND actiontypes ILIKE ANY (array[${forIlike(actionTypes)}])`;
}

function boroughsFilter(boroughs) {
  if (!boroughs.length) return '';
  return `AND dcp_borough ILIKE ANY (array[${forIlike(boroughs)}])`;
}

function ulurpNonUlurpFilter(ulurpNonulurp) {
  if (!ulurpNonulurp.length) return '';
  return `AND coalesce(dcp_ulurp_nonulurp, 'Unknown') IN (${forIn(ulurpNonulurp)})`;
}

function femaFloodZoneFilter(floodZoneV, floodZoneCoastalA, floodZoneA, floodZoneShadedX) {
  let filter = '';
  if (floodZoneV) filter += 'AND dcp_femafloodzonev = TRUE\n';
  if (floodZoneCoastalA) filter += 'AND dcp_femafloodzonecoastala = TRUE\n';
  if (floodZoneA) filter += 'AND dcp_femafloodzonea = TRUE\n';
  if (floodZoneShadedX) filter += 'AND dcp_femafloodzoneshadedx = TRUE\n';
  return filter;
}

function publicStatusFilter(publicStatus) {
  if (!publicStatus.length) return '';
  return `AND coalesce(dcp_publicstatus_simp, 'Unknown') IN (${forIn(publicStatus)})`;
}

function certifiedReferredFilter(certifiedReferred) {
  if (!certifiedReferred.length > 1) return '';
  return `AND dcp_certifiedreferred BETWEEN TO_TIMESTAMP('${certifiedReferred[0]}') AND TO_TIMESTAMP('${certifiedReferred[1]}')`;
}

function projectApplicantTextFilter(text) {
  if (!text) return '';
  return `AND (
    (dcp_projectbrief ILIKE ${forIlike(text)}) 
    OR (applicants ILIKE ${forIlike(text)})
    OR (ulurpnumbers ILIKE ${forIlike(text)})
    OR (dcp_ceqrnumber ILIKE ${forIlike(text)})
    OR (bbls ILIKE ${forIlike(text)})
    OR (keywords ILIKE ${forIlike(text)})
  )`;
}

function blockFilter(block) {
  if (!block) return '';
  return `AND blocks ILIKE ${forIlike(block)}`;
}

function radiusBoundingFilter(center, radius) {
  if (!(center.length > 1 && radius)) return '';

  const METERS_TO_FEET = 3.28084;
  const radiusMeters = radius / METERS_TO_FEET;

  return `
    AND ST_DWithin(
      ST_MakePoint('${center[0]}', '${center[1]}')::geography,
      project_geoms.polygons::geography,
      '${radiusMeters}'
    )
  `;
}

module.exports = { projectsAllIdsSQL };
