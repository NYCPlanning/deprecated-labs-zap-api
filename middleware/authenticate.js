const jwt = require('jsonwebtoken');

const { CRM_SIGNING_SECRET } = process.env;

/**
 * Requires cookie-parser middleware earlier in the middleware chain
 */
function authenticate(req, res, next) {
  req.session = false;

  const { token } = req.cookies;

  if (!token) {
    res.clearCookie('token');
    next();
    return;
  }

  try {
    const sessionData = jwt.verify(token, CRM_SIGNING_SECRET);

    // Unauth -- expired. Return un-auth response here?
    if (sessionData.exp <= Date.now() / 1000) {
      res.clearCookie('token');
      next();
    }

    // Lookup the session from id. TODO: create a session store (redis?)
    // to easily lookup session data (user info) ?
    req.session = {};
    req.session.contactId = sessionData.contactId;
    next();
  } catch (e) {
    console.log(e);
  }
}

module.exports = authenticate;
