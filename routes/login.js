const express = require('express');
const jwt = require('jsonwebtoken');

const { getUserRole } = require('../utils/session');
const UnauthError = require('../errors/unauth');
const BadRequestError = require('../errors/bad-request');
const { contactXML } = require('../queries/xml/contact');

const router = express.Router({ mergeParams: true });

const {
  CRM_SIGNING_SECRET,
  NYCID_CONSOLE_PASSWORD,
} = process.env;

router.get('/', async (req, res) => {
  const {
    app: { crmClient },
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
    const contactForSession = await getContactForSession(crmClient, email);

    // Create new token indicating NYCID and CRM authentication requirements met, with same exp as NYCID token
    const newToken = jwt.sign({ exp: expiresOn, ...contactForSession }, CRM_SIGNING_SECRET);
    res.cookie('token', newToken, { httpOnly: true }).send({ message: 'Login successful!' });
  } catch (e) {
    if (e instanceof BadRequestError) {
      res.status(e.status).send({ errors: [{ code: e.code, detail: e.message }] });
      return;
    }

    console.log(e);
    res.status(500).send({ errors: [{ detail: 'Unable to login' }] });
  }
});

function validateNYCIDToken(token) {
  try {
    const { mail, exp } = jwt.verify(token, NYCID_CONSOLE_PASSWORD);
    return { email: mail, expiresOn: exp };
  } catch (e) {
    console.log(e);
    throw new UnauthError(`Invalid NYCID token: ${e.message}`);
  }
}

async function getContactForSession(crmClient, email) {
  const response = await crmClient.doGet(`contacts?fetchXml=${contactXML(email)}`);
  const { value: contacts } = response;

  if (!contacts.length) {
    throw new UnauthError(`No CRM Contact found for email ${email}`);
  }

  if (contacts.length > 1) {
    throw new BadRequestError(`More than one CRM Contact found for email ${email}`);
  }

  const [firstContact] = contacts.map(contact => ({
    contactId: contact.contactid,
    contactRole: getRole(contact.fullname),
  }));

  return firstContact;
}

function getRole(name) {
  const roleRegExp = /\w{2}(\w{2})\d{0,2}/;
  const match = name.match(roleRegExp);
  const role = match ? match[1] : '';

  return getUserRole(role);
}

module.exports = router;
