const express = require('express');

const UnauthError = require('../../errors/unauth');
const BadRequestError = require('../../errors/bad-request');
const { userProjectsXML } = require('../../queries/xml/user-projects');
const { isCurrentUser, USER_ROLES_ENUM } = require('../../utils/session');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  const {
    app: { dbClient, crmClient },
    params: { userId },
    query: { projectState = 'review' },
    session,
  } = req;

 try {
    validateSession(session, userId);
    validateParams(projectState);

    const { contactRole: userRole } = session;
    const targetMilestoneIds = getTargetMilestoneIds(userRole);

    const targetQuery = userProjectsXML(userId, targetMilestoneIds, projectState);
    const { value: projectsRows } =  await crmClient.doGet(`dcp_projects?fetchXml=${targetQuery}`);
    res.send({ message: projectsRows.map(p => p.dcp_name).join(', ') });

  } catch (e) {
    if (e instanceof UnauthError) {
      res.status(e.status).send({ errors: [{ code: e.code, detail: e.message }] });
      return;
    }

    console.log(e);
    res.status(500).send({ error: e.toString() });
  }
});

function validateSession(session, userId) {
  if (!session) {
    throw new UnauthError('Authentication required');
  }

  if (!isCurrentUser(userId, session)) {
    throw new UnauthError('Current user not authorized to access this route');
  }
}

function validateParams(projectState) {
  const VALID_PROJECT_STATES = ['upcoming', 'current', 'reviewed', 'archived'];
  if (!VALID_PROJECT_STATES.includes(projectState)) {
    throw new BadRequestError(`projectState must be one of: ${VALID_PROJECT_STATES.join(', ')}`);
  }
}

function getTargetMilestoneIds(userRole) {
  if (userRole === USER_ROLES_ENUM.UNKNOWN) {
    console.log('userRole must not be UNKNOWN to view lup projects');
    throw new UnauthError('Current user is not authorized to access this route');
  }

  if (userRole === USER_ROLES_ENUM.COMMUNITY_BOARD) {
    return ['923beec4-dad0-e711-8116-1458d04e2fb8'];
  }

  if (userRole === USER_ROLES_ENUM.BOROUGH_PRESIDENT) {
    return [
      '943beec4-dad0-e711-8116-1458d04e2fb8',
      '963beec4-dad0-e711-8116-1458d04e2fb8',
    ];
  }
}
module.exports = router;
