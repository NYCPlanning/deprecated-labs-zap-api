const pgp = require('pg-promise');

module.exports = function generatePaginate(queryFile, values) {
  return {
    toPostgres() { return pgp.as.format(queryFile, values); },
    rawType: true,
  };
};
