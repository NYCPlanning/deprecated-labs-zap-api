const pgp = require('pg-promise');
const generateDynamicQuery = require('./generate-dynamic-sql');
const getQueryFile = require('../utils/get-query-file');

// import sql query templates
const listProjectsQuery = getQueryFile('/projects/index.sql');
const paginateQuery = getQueryFile('/helpers/paginate.sql');
const standardColumns = getQueryFile('/helpers/standard-projects-columns.sql');
const spatialColumns = getQueryFile('/helpers/shp-projects-columns.sql');

const buildProjectsSQL = (req, type = 'filter') => {
  const {
    query,
    session,
  } = req;

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
    block = '',
    distance_from_point = [],
    radius_from_point = 10,

    // user-specific filters
    // defaults to null because filtering on this
    // requires authentication
    project_lup_status = null, // 'to-review'
  } = query;

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
  const projectApplicantTextQuery = project_applicant_text ? pgp.as.format("AND ((dcp_projectbrief ilike '%$1:value%') OR (p.dcp_projectname ilike '%$1:value%') OR (applicants ilike '%$1:value%') OR (ulurpnumbers ILIKE '%$1:value%') OR (dcp_ceqrnumber ILIKE '%$1:value%') OR (bbls ILIKE '%$1:value%') OR (keywords ILIKE '%$1:value%'))", [project_applicant_text]) : '';
  const blockQuery = block ? pgp.as.format("AND (blocks ilike '%$1:value%')", [block]) : '';

  /**
   * radiusDistanceQuery is the query for our radius distance filter --> in the frontend, a user can click
   * a point on the map and filter for all projects located within a distance from that point. When a user
   * creates this point with a click event, query parameters are changed. When query parameters are changed,
   * fetchData occurs. The distance_from_point (the coordinates) and radius_from_point (the distance) values
   * are sent to the backend. The backend then performs the filtering with this query.
   *
   * -  ST_DWithin queries all geometries within the specified distance from a point, with the 1st parameter
   *    being the origin point, the 2nd parameter being the geometries to query based on the input distance,
   *    and the 3rd parameter being the distance
   * -  in pgp.as.format the 1st parameter is the query, the 2nd parameter is the values (which take the place
   *     of $1, $2, and $3 here)
   * -  $1 and $2 are the coordinates of the point (distance_from_point)
   * -  $3 is the distance from the point (radius_from_point)
   * -  ::geography converts the value from geometry data type to geography data type (geography data type
   *    should be used if you have points that are more than a mile apart)
   * -  the radius_from_point value is set in the frontend as feet, we convert it to meters to run this query
   */
  const METERS_TO_FEET_FACTOR = 3.28084;
  const radiusDistanceQuery = distance_from_point[0] ? pgp.as.format('AND ST_DWithin(ST_MakePoint($1,$2)::geography, c.polygons::geography, $3)', [...distance_from_point, (radius_from_point / METERS_TO_FEET_FACTOR)]) : '';
  const paginate = generateDynamicQuery(paginateQuery, { itemsPerPage, offset: (page - 1) * itemsPerPage });

  if (type === 'filter') {
    const { contactId } = session;

    // we have different queries for LUPP things
    if (project_lup_status && contactId) {
      // one of 'archive', 'reviewed', 'to-review', 'upcoming'
      if (!['archive', 'reviewed', 'to-review', 'upcoming'].includes(project_lup_status)) {
        throw new Error('Must be one of archive, reviewed, to-review, upcoming');
      }

      const userProjectsQuery = getQueryFile('/projects/lup-projects.sql');

      return pgp.as.format(userProjectsQuery, {
        id: contactId,
        status: project_lup_status,
      });
    }

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
      blockQuery,
      radiusDistanceQuery,
      paginate,
    });
  }

  // returns only projectids that match the query params, without pagination
  if (type === 'projectids') {
    return pgp.as.format(listProjectsQuery, {
      standardColumns: 'projectid',
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
      blockQuery,
      radiusDistanceQuery,
      paginate: '',
    });
  }

  if (type.includes('download')) {
    return pgp.as.format(listProjectsQuery, {
      standardColumns: type === 'spatial_download' ? spatialColumns : standardColumns,
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
      blockQuery,
      radiusDistanceQuery,
      paginate: '',
    });
  }

  return null;
};

module.exports = buildProjectsSQL;
