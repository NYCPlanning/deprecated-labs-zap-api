/* eslint-disable consistent-return */

const jwt = require('jsonwebtoken');

const { CRM_SIGNING_SECRET } = process.env;

/**
 * Requires cookie-parser middleware earlier in the middleware chain.
 * Attempts to parse valid session from token cookie; if unable, proceeds with
 * un-authorized request.
 */
function authenticate(req, res, next) {
  req.session = false;

  const { token } = req.cookies;

  // no token -- clear cookies and proceed unauthed
  if (!token) {
    return proceedNoAuth(res, next);
  }

  try {
    const sessionData = jwt.verify(token, CRM_SIGNING_SECRET);
    req.session = sessionData;
    next();
  } catch (e) {
    console.log(e);
    proceedNoAuth(res, next);
  }
}

function proceedNoAuth(res, next) {
  res.clearCookie('token');
  next();
}

module.exports = authenticate;
