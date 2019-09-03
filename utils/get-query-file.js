const path = require('path');
const pgp = require('pg-promise');

// imports a pgp SQL Queryfile
module.exports = (file) => {
  const fullPath = path.join(__dirname, '../queries', file);
  return new pgp.QueryFile(fullPath, { minify: true });
};
