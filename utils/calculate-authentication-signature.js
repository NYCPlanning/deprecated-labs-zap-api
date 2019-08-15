const crypto = require('crypto');
const utf8 = require('utf8');

const { NYCID_CONSOLE_PASSWORD } = process.env;

const signString = function (stringToSign) {
  return crypto.createHmac('sha256', NYCID_CONSOLE_PASSWORD)
    .update(utf8.encode(stringToSign))
    .digest('hex')
    .toLowerCase();
};

const calculateAuthenticationSignature = function (method, path, params) {
  const stringToSign = `${method}${path}${params}`;

  if (!NYCID_CONSOLE_PASSWORD) throw new Error('Missing NYCID_CONSOLE_PASSWORD');

  return signString(stringToSign);
};

module.exports = {
  signString,
  calculateAuthenticationSignature,
};
