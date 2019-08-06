const express = require('express');

const { userProjectsSQL } = require('../queries/xml/user-projects');

const router = express.Router({ mergeParams: true });

/**
 * Returns a list of projectIds associated with a given CRM account entity in the dcp_projectlupteam table,
 * excluding projects that only have actions that are not a part of the land-use participant's pipeline
 * (see constants.EXCLUDED_ACTION_CODES for excluded action codes)
 */
router.get('/', async (req, res) => {
  const {
    app: { crmClient },
  } = req;

  try {
    const accountId = getAccountIdFromAuth();
    if (!accountId) {
      res.status(401).send({ error: 'Authentication required for this route' });
      return;
    }

    const { value: projects } = await crmClient.doGet(`dcp_projects?fetchXml=${userProjectsSQL(accountId)}`);
    res.send({
      accountId,
      projectIds: projects.map(project => project.dcp_name),
    });
  } catch (e) {
    console.log(e) // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
});

/**
 * replace this with the accountId determined @ initial login
 * (i'm assuming we'll auth with NycID and then there will be a step in the process that happens wtihin ZAP API where we
 * go lookup ur CRM account and pull a few pieces of information about you into an internal auth session that lives in this
 * express API. One of those things should be the accountId associated with the email from NYCID auth).
 *
 * Hard coded return value just for testing until auth is implemented.
 */
function getAccountIdFromAuth() {
  return '2a231d14-693e-e811-8133-1458d04d06c0';
}

module.exports = router;
