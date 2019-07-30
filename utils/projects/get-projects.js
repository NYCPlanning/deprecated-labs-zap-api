const shortid = require('shortid');

const dedupeList = require('../../utils/dedupe-list');
const { projectsXML, allProjectsXML } = require('../../queries/projects-xmls');
const { getRadiusBoundedProjects } = require('../../utils/projects/get-geo');

/**
 * Wrapper function to page through CRM responses and get all projects for a given set of projectIds.
 * CRM will return up to maximum of 5000 results per page, and it is possible that more than 5000
 * projects will comprise a single filtered dataset.
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {int[]} projectIds The list of all projectIds in the filtered dataset
 * @returns {Object[]} The full list of all raw projects from CRM
 */
async function getAllProjectsDownload(crmClient, projectIds) {
  if (!projectIds.length) return [];

  const MAX_PROJECTS_PER_PAGE = 5000;
  const projects = [];
  const pages = Math.ceil(projectIds.length / MAX_PROJECTS_PER_PAGE);
  for (let i = 1; i <= pages; i ++) { // eslint-disable-line
    const { value } = await crmClient.doBatchPost( // eslint-disable-line
      'dcp_projects',
      projectsXML(projectIds, i, MAX_PROJECTS_PER_PAGE),
    );
    projects.push(...value);
  }

  return projects;
}

/**
 * Returns some metadata for the filtered dataset: the total # of results, the queryId to identify
 * the specific query defining this filtered dataset, and the full list of projectIds meeting the
 * criteria of this query.
 *
 * If queryId is present, indicates resources are being requested for a query that has
 * already been set up. In that case, grab the projectIds matching the query from the query
 * cache. If the queryIdHeader is missing, indicates a new query is being requested. In that case,
 * generate a new queryId, generate the list of projectIds matching query from request query params
 * and radius bounded projectIds.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {Object} query The query params from the request
 * @param {NodeCache} queryCache The NodeCache instance used by the app to store projectIds for querys
 * @returns {Object} Object containing totalProjectsCount, queryId, and projectIds
 */
async function getAllProjects(dbClient, crmClient, query, queryCache) {
  let { queryId } = query;
  // If queryId exists, but does not have a valid entry in the cache, just assume an empty array
  let allProjectIds = queryId ? (queryCache.get(queryId) || []) : [];
  let totalProjectsCount = allProjectIds.length;

  // If no queryId is provided, assume this is a new query search
  if (!queryId) {
    const radiusBoundedProjectIds = await getRadiusBoundedProjects(dbClient, query);

    const allProjects = await getAllProjectsForFilter(crmClient, radiusBoundedProjectIds, query);

    // Store projectIds matching this query in the cache
    queryId = shortid.generate();
    allProjectIds = dedupeList(allProjects.map(project => project.dcp_name));
    totalProjectsCount = allProjectIds.length;
    await queryCache.set(queryId, allProjectIds);
  }

  return {
    totalProjectsCount, queryId, allProjectIds,
  };
}

/**
 * Wrapper function to page through CRM responses and get all results matching a given set
 * of project filters. CRM will return up to maximum of 5000 results per page, and it is
 * possible that more than 5000 projects will comprise a single filtered dataset.
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {int[]} radiusBoundedProjectIds The list of all projectIds within the defined bounding radius
 * @param {int[]} query The query params from the request, used to create project filters
 * @returns {Object[]} The full list of all raw projects from CRM
 */
async function getAllProjectsForFilter(crmClient, radiusBoundedProjectIds, query) {
  const MAX_PROJECTS_PER_PAGE = 5000;
  const projects = [];

  // radiusBoundedProjectIds === false indicates a radius query was provided, but no
  // projects met the criteria so no CRM queries need to be made.
  if (!radiusBoundedProjectIds) {
    return projects;
  }

  let page = 1;
  let pagingCookie = '';
  while (true) {
    const res = await crmClient.doBatchPost(
      'dcp_projects',
      allProjectsXML(query, radiusBoundedProjectIds, page, MAX_PROJECTS_PER_PAGE, pagingCookie),
    );
    projects.push(...res.value);

    if (res.value.length < MAX_PROJECTS_PER_PAGE) break;

    pagingCookie = getEscapedPagingCookie(res);
    page += 1;
  }

  return projects;
}
/**
 * Wrapper function to page through CRM responses and get all results. CRM will return up to
 * maximum of 5000 results per page, and it is possible that more than 5000 projects will
 * have been modified within the lookback window.
 *
 * @param {CRMClient} crmClient The client instance for making authenticated CRM calls
 * @param {int} lookBackSec The lookback window to use to filter for updated projects, in seconds
 * @returns {Object[]} The full list of all raw projects from CRM
 */
async function getAllProjectsUpdateGeoms(crmClient, lookBackSec) {
  const createdOn = new Date(new Date().getTime() - lookBackSec * 1000);
  const MAX_PROJECTS_PER_PAGE = 5000;
  const projects = [];

  let page = 1;
  let pagingCookie = '';
  while (true) {
    const res = await crmClient.doGet(
      `dcp_projects?fetchXml=${projectsUpdateGeoms(createdOn, page, MAX_PROJECTS_PER_PAGE, pagingCookie)}`,
    );
    const {
      value,
      '@Microsoft.Dynamics.CRM.morerecords': moreRecords,
    } = res;

    projects.push(...value);
    if (!moreRecords) break;

    pagingCookie = getEscapedPagingCookie(res);
    page += 1;
  }

  return projects;
}

/**
 * Helper function to extract and format paging cookie from CRM fetchXML GET response.
 * You are not dreaming! It's true! The cookie must be extracted from an XML string,
 * then DOUBLELY decoded, then special characters must be re-encoded to HTML-safe versions.
 * A usable API product? Methinks not...
 * 
 * @param {Object} res The CRM fetchXML GET response
 * @returns {String} The HTML-escaped paging cookie
 */
function getEscapedPagingCookie(res) {
  const {
    '@Microsoft.Dynamics.CRM.fetchxmlpagingcookie': pagingCookie,
  } = res;

  const cookie = pagingCookie.match('pagingcookie="([-A-Za-z0-9%_]*)"')[1];
  return decodeURIComponent(decodeURIComponent(cookie))
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


module.exports = {
  getAllProjectsDownload,
  getAllProjects,
  getAllProjectsUpdateGeoms,
};
