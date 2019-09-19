const express = require('express');
const getQueryFile = require('../utils/get-query-file');

const contactsFilter = getQueryFile('contacts/filter-by-id.sql');

const router = express.Router({ mergeParams: true });

/**
 * Returns a list of projectIds associated with a given CRM account entity in the dcp_projectlupteam table,
 * excluding projects that only have actions that are not a part of the land-use participant's pipeline
 * (see constants.EXCLUDED_ACTION_CODES for excluded action codes)
 */
router.get('/', async (req, res) => {
  const {
    app: { db },
  } = req;

  try {
    const { contactId } = req.session;

    if (!contactId) {
      res.status(401).send({ error: 'Authentication required for this route' });
      return;
    }

    const contacts = await db.any(contactsFilter, {
      id: contactId,
    });
    const [firstContact] = contacts;

    res.send({
      data: {
        type: 'users',
        id: contactId,
        attributes: firstContact,
        relationships: {
          'user-project-participant-types': {
            data: contacts.map(contact => ({
              id: contact.dcp_projectlupteamid,
              type: 'user-project-participant-types',
            })),
          },
        },
      },
      included: contacts.map(contact => ({
        id: contact.dcp_projectlupteamid,
        attributes: {
          participantType: contact.dcp_lupteammemberrole,
        },
        type: 'user-project-participant-types',
        relationships: {
          project: {
            data: {
              id: contact.dcp_project,
              type: 'projects',
            },
          },
        },
      })),
    });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(500).send({ error: e.toString() });
  }
});

module.exports = router;
