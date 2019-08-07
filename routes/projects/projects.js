const express = require('express');
const shortid = require('shortid');

const BadRequestError = require('../../errors/bad-request');
const { getMeta } = require('../../utils/projects/get-meta');
const { projectsSQL } = require('../../queries/sql/projects');
const { projectsSearchSQL } = require('../../queries/sql/projects-search');

const router = express.Router({ mergeParams: true });

/**
 * Returns a paginated view of projects; either ALL projects, or a filtered subset of
 * projects defined by a queryId (nth page of existing query) or filter query params (new query)
 */
router.get('/', async (req, res) => {
  const {
    app: { dbClient, queryCache },
    query,
  } = req;

  const { page = '1', itemsPerPage = '30' } = query;

  try {
    const { projectIds, queryId } = await getProjectIdsAndQueryId(dbClient, queryCache, query);

    const targetQuery = projectsSQL(page, itemsPerPage, projectIds);

    const projects = projectIds ? await dbClient.any(targetQuery) : [];

    res.send({
      data: projects.map(project => ({
        type: 'projects',
        id: project.dcp_name,
        attributes: project,
      })),
      meta: getMeta(projectIds, projects, page, queryId),
    });
  } catch (e) {
    if (e instanceof BadRequestError) {
      res.status(e.status).send({ error: e.message });
      return;
    }

    console.log(e);
    res.status(500).send({ error: e.message });
  }
});


/**
 * Returns projectIds and queryId for the given request. If a queryId is provided, returns
 * the associated projectIds from the queryCache. If the provided queryId is not found in the cache,
 * throws a BadRequestError to indicate invalid request params. Otherwise, a new queryId is generated and
 * a project-search query is run. The results of the query are stored in the queryCache
 * with queryId as the key.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {NodeCache} queryCache The app cache that stores filtered projectIds for a given query
 * @param {Object} query The full set of request querystring params
 * @returns {Object} Object containing list of projectIds for the request, and optionally a queryId
 */
async function getProjectIdsAndQueryId(dbClient, queryCache, query) {
  if (query.queryId) {
    const projectIds = queryCache.get(query.queryId);

    // queryId not found in cache
    if (projectIds === undefined) {
      throw new BadRequestError(`Invalid queryId (${query.queryId})`);
    }

    return { projectIds, queryId: query.queryId };
  }

  return newQuery(dbClient, queryCache, query);
}

/**
 * Returns list of projectIds meeting the filters defined in query,
 * and a queryId generated to represent this result set. Additionally,
 * stores the list of projectIds in the queryCache with queryId as the key.
 *
 * @param {Database} dbClient The pg-promise Database object for querying PostgreSQL
 * @param {NodeCache} queryCache The app cache that stores filtered projectIds for a given query
 * @param {Object} query The full set of request querystring params
 * @returns {Object} Object containing list of projectIds for the request and the queryId
 */
async function newQuery(dbClient, queryCache, query) {
  const targetQuery = projectsSearchSQL(query);
  const projectIds = await dbClient.any(targetQuery)
    .then(projects => projects.map(project => project.dcp_name));
  const queryId = shortid.generate();
  await queryCache.set(queryId, projectIds);

  return { projectIds, queryId };
}

module.exports = router;
