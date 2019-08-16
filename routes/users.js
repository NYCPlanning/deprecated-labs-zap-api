const express = require('express');
const { contactIdXML } = require('../queries/xml/filter-contacts-by-id');

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
    const { contactId } = req.session;

    if (!contactId) {
      res.status(401).send({ error: 'Authentication required for this route' });
      return;
    }

    const { value: [contact] } = await crmClient.doGet(`contacts?fetchXml=${contactIdXML(contactId)}`);

    res.send({
      data: {
        type: 'user',
        id: contactId,
        attributes: contact,
        relationships: {
          projects: {
            links: {
              related: `/users/${contactId}/projects`,
            },
          },
        },
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: e.toString() });
  }
});

module.exports = router;
