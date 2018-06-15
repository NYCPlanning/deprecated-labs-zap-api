const fetch = require('node-fetch');

const cartoUsername = 'planninglabs';
const cartoDomain = `${cartoUsername}.carto.com`;

const buildSqlUrl = function(cleanedQuery, type = 'json') { // eslint-disable-line
  return `https://${cartoDomain}/api/v2/sql?q=${cleanedQuery}&format=${type}`;
};

const carto = {
  SQL(query, type = 'json') {
    const cleanedQuery = query.replace('\n', '');
    const url = buildSqlUrl(cleanedQuery, type);

    return fetch(url)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Not found');
      })
      .then((d) => { // eslint-disable-line
        return type === 'json' ? d.rows : d;
      });
  },
};

module.exports = carto;
