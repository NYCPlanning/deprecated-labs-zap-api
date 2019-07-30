const fetch = require('node-fetch');

const cartoUsername = 'planninglabs';

const buildSqlUrl = (cleanedQuery, format = 'json', method) => { // eslint-disable-line
  let url = `https://${cartoUsername}.carto.com/api/v2/sql`;
  url += method === 'get' ? `?q=${cleanedQuery}&format=${format}` : '';
  return url;
};

const carto = {
  SQL(query, format = 'json', method = 'get') {
    const cleanedQuery = query.replace('\n', '');
    const url = buildSqlUrl(cleanedQuery, format, method);

    let fetchOptions = {};

    if (method === 'post') {
      fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: `q=${cleanedQuery}&format=${format}`,
      };
    }

    return fetch(url, fetchOptions)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(response.statusText);
      })
      .then((d) => { // eslint-disable-line
        return format === 'json' ? d.rows : d;
      });
  },
};

module.exports = carto;
