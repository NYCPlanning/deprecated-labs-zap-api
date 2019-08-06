const crypto = require('crypto');
const utf8 = require('utf8');

const { NYCID_CONSOLE_PASSWORD } = process.env;

module.exports = function calculateAuthenticationSignature(method, path, params) {
  const stringToSign = `${method}${path}${params}`;

  if (!NYCID_CONSOLE_PASSWORD) throw new Error('Missing NYCID_CONSOLE_PASSWORD');

  return crypto.createHmac('sha256', NYCID_CONSOLE_PASSWORD)
    .update(utf8.encode(stringToSign))
    .digest('hex')
    .toLowerCase();
};
