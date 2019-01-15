const pgp = require('pg-promise');
const generateDynamicQuery = require('./generate-dynamic-sql');
const getQueryFile = require('../utils/get-query-file');


// import sql query templates
const listProjectsQuery = getQueryFile('/projects/index.sql');
const paginateQuery = getQueryFile('/helpers/paginate.sql');
const standardColumns = getQueryFile('/helpers/standard-projects-columns.sql');

const buildProjectsSQL = (queryParams, type = 'filter') => {
  const {
    // pagination
    page = '1',
    itemsPerPage = 30,

    // filters
    'community-districts': communityDistricts = [],
    'action-types': actionTypes = [],
    boroughs = [],
    dcp_ceqrtype = ['Type I', 'Type II', 'Unlisted', 'Unknown'],
    dcp_ulurp_nonulurp = ['ULURP', 'Non-ULURP'],
    dcp_femafloodzonev = false,
    dcp_femafloodzonecoastala = false,
    dcp_femafloodzonea = false,
    dcp_femafloodzoneshadedx = false,
    dcp_publicstatus = ['Completed', 'Filed', 'In Public Review', 'Unknown'],
    dcp_certifiedreferred = [],
    project_applicant_text = '',
    ulurp_ceqr_text = '',
    block = '',
  } = queryParams;

  // special handling for FEMA flood zones
  // to only filter when set to true
  const dcp_femafloodzonevQuery = dcp_femafloodzonev === 'true' ? 'AND dcp_femafloodzonev = true' : '';
  const dcp_femafloodzonecoastalaQuery = dcp_femafloodzonecoastala === 'true' ? 'AND dcp_femafloodzonecoastala = true' : '';
  const dcp_femafloodzoneaQuery = dcp_femafloodzonea === 'true' ? 'AND dcp_femafloodzonea = true' : '';
  const dcp_femafloodzoneshadedxQuery = dcp_femafloodzoneshadedx === 'true' ? 'AND dcp_femafloodzoneshadedx = true' : '';

  const certDateQuery = (!!dcp_certifiedreferred[0] && !!dcp_certifiedreferred[1]) ? pgp.as.format('AND dcp_certifiedreferred BETWEEN to_timestamp($1) AND to_timestamp($2)', dcp_certifiedreferred) : '';
  const communityDistrictsQuery = communityDistricts[0] ? pgp.as.format('AND dcp_communitydistricts ilike any (array[$1:csv])', [communityDistricts.map(district => `%${district}%`)]) : '';
  const boroughsQuery = boroughs[0] ? pgp.as.format('AND dcp_borough ilike any (array[$1:csv])', [boroughs.map(borough => `%${borough}%`)]) : '';
  const actionTypesQuery = actionTypes[0] ? pgp.as.format('AND actiontypes ilike any (array[$1:csv])', [actionTypes.map(actionType => `%${actionType}%`)]) : '';
  const projectApplicantTextQuery = project_applicant_text ? pgp.as.format("AND ((dcp_projectbrief ilike '%$1:value%') OR (dcp_projectname ilike '%$1:value%') OR (applicants ilike '%$1:value%'))", [project_applicant_text]) : '';
  const ulurpCeqrQuery = ulurp_ceqr_text ? pgp.as.format("AND ((ulurpnumbers ILIKE '%$1:value%') OR dcp_ceqrnumber ILIKE '%$1:value%')", [ulurp_ceqr_text]) : '';
  const blockQuery = block ? pgp.as.format("AND (blocks ilike '%$1:value%')", [block]) : '';
  const paginate = generateDynamicQuery(paginateQuery, { itemsPerPage, offset: (page - 1) * itemsPerPage });

  if (type === 'filter') {
    return pgp.as.format(listProjectsQuery, {
      standardColumns,
      dcp_publicstatus,
      dcp_ceqrtype,
      dcp_ulurp_nonulurp,
      dcp_femafloodzonevQuery,
      dcp_femafloodzonecoastalaQuery,
      dcp_femafloodzoneaQuery,
      dcp_femafloodzoneshadedxQuery,
      certDateQuery,
      communityDistrictsQuery,
      boroughsQuery,
      actionTypesQuery,
      projectApplicantTextQuery,
      ulurpCeqrQuery,
      blockQuery,
      paginate,
    });
  }

  if (type === 'tiles') {
    return pgp.as.format(listProjectsQuery, {
      standardColumns: 'centroid, projectid, dcp_projectname, dcp_publicstatus_simp,lastmilestonedate',
      dcp_publicstatus,
      dcp_ceqrtype,
      dcp_ulurp_nonulurp,
      dcp_femafloodzonevQuery,
      dcp_femafloodzonecoastalaQuery,
      dcp_femafloodzoneaQuery,
      dcp_femafloodzoneshadedxQuery,
      certDateQuery,
      communityDistrictsQuery,
      boroughsQuery,
      actionTypesQuery,
      projectApplicantTextQuery,
      ulurpCeqrQuery,
      blockQuery,
      paginate: '',
    });
  }

  if (type === 'download') {
    return pgp.as.format(listProjectsQuery, {
      standardColumns,
      dcp_publicstatus,
      dcp_ceqrtype,
      dcp_ulurp_nonulurp,
      dcp_femafloodzonevQuery,
      dcp_femafloodzonecoastalaQuery,
      dcp_femafloodzoneaQuery,
      dcp_femafloodzoneshadedxQuery,
      certDateQuery,
      communityDistrictsQuery,
      boroughsQuery,
      actionTypesQuery,
      projectApplicantTextQuery,
      ulurpCeqrQuery,
      blockQuery,
      paginate: '',
    });
  }

  return null;
};


module.exports = buildProjectsSQL;
