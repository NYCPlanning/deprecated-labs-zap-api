const express = require('express');
const jwt = require('jsonwebtoken');

const getQueryFile = require('../utils/get-query-file');
const UnauthError = require('../errors/unauth');
const BadRequestError = require('../errors/bad-request');

const contactsFilter = getQueryFile('contacts/filter.sql');
const router = express.Router({ mergeParams: true });

const {
  CRM_SIGNING_SECRET,
  NYCID_CONSOLE_PASSWORD,
  CRM_IMPOSTER_ID,
} = process.env;

function validateNYCIDToken(token) {
  try {
    const { mail, exp } = jwt.verify(token, NYCID_CONSOLE_PASSWORD);
    return { email: mail, expiresOn: exp };
  } catch (e) {
    console.log(e); // eslint-disable-line
    throw new UnauthError(`Invalid NYCID token: ${e.message}`);
  }
}

async function getContactId(dbClient, email) {
  if (CRM_IMPOSTER_ID) return CRM_IMPOSTER_ID;

  const contacts = await dbClient.any(contactsFilter, {
    email,
  });

  if (!contacts.length) {
    throw new UnauthError(`No CRM Contact found for email ${email}`);
  }

  if (contacts.length > 1) {
    throw new BadRequestError(`More than one CRM Contact found for email ${email}`);
  }

  return contacts.map(contact => contact.contactid)[0];
}

router.get('/', async (req, res) => {
  const {
    app: { db },
    query: { accessToken },
  } = req;

  try {
    // accessToken qp is required
    if (!accessToken) {
      throw new BadRequestError('accessToken required in querystring');
    }

    // Validate accessToken with NYCID_CONSOLE_PASSWORD. Will also throw error if token is expired
    const { email, expiresOn } = validateNYCIDToken(accessToken);

    // Validate exactly 1 contact exists in CRM associated with email from NYCID token
    const contactId = await getContactId(db, email);

    // Create new token indicating NYCID and CRM authentication requirements met, with same exp as NYCID token
    const newToken = jwt.sign({ exp: expiresOn, contactId }, CRM_SIGNING_SECRET);
    res.cookie('token', newToken, { httpOnly: true }).send({ message: 'Login successful!' });
  } catch (e) {
    if (e instanceof BadRequestError) {
      res.status(e.status).send({ errors: [{ code: e.code, detail: e.message }] });
    } else {
      console.log(e); // eslint-disable-line
      res.status(500).send({ errors: [{ detail: 'Unable to login' }] });
    }
  }
});

module.exports = router;
