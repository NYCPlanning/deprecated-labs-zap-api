const express = require('express');
const camelcase = require('camelcase');

const UnauthError = require('../errors/unauth');
const BadRequestError = require('../errors/bad-request');
const userProjectsQueries = require('../queries/xml/user-projects');
const { isCurrentUser } = require('../utils/session');
const { flattenProjectRows } = require('../utils/project/flatten-rows');

const router = express.Router({ mergeParams: true });

const { CRM_TEST_CONTACT_ID } = process.env;

router.get('/', async (req, res) => {
  const {
    app: { crmClient },
    query: { projectState = 'to-review' },
    session,
  } = req;

  try {
    let { contactId } = session;
    validateSession(session, contactId);

    if (CRM_TEST_CONTACT_ID) {
      contactId = CRM_TEST_CONTACT_ID;
    }

    validateParams(projectState);

    const targetQuery = userProjectsQueries[camelcase(projectState)](contactId);
    const { value: projectRows } = await crmClient.doGet(`dcp_projects?fetchXml=${targetQuery}`);
    const projects = projectRows.map(project => flattenProjectRows([project]));

    res.send({
      data: projects.map(project => ({
        type: 'projects',
        id: project.dcp_name,
        attributes: project,
      })),
    });
  } catch (e) {
    if (e instanceof UnauthError) {
      res.status(e.status).send({ errors: [{ code: e.code, detail: e.message }] });
      return;
    }

    console.log(e);
    res.status(500).send({ error: e.toString() });
  }
});

// the middleware decodes the session into an object
// if that fails, the session will be null
function validateSession(session, contactId) {
  if (!session) {
    throw new UnauthError('Authentication required');
  }

  if (!isCurrentUser(contactId, session)) {
    throw new UnauthError('Current user not authorized to access this route');
  }
}

// ???
function validateParams(filterType) {
  const VALID_PROJECT_STATES = ['upcoming', 'to-review', 'reviewed', 'archived'];
  if (!VALID_PROJECT_STATES.includes(filterType)) {
    throw new BadRequestError(`filterType must be one of: ${VALID_PROJECT_STATES.join(', ')}`);
  }
}

// See GH issue, must add another filter step
// Removing for now
// function getTargetMilestoneIds(userRole) ...

module.exports = router;
