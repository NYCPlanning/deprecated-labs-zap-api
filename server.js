const express = require('express');
const request = require('request');
// require('request-debug')(request);
const parse = require('./parse');
const aspHeaders = require('./aspHeaders');

const app = express();

const boroMap = (boroname) => {
  switch (boroname) {
    case 'manhattan':
      return 'MN';
    case 'bronx':
      return 'BX';
    case 'brooklyn':
      return 'BK';
    case 'queens':
      return 'QN';
    case 'statenisland':
      return 'SI';
    default:
      return null;
  }
};

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/cdprojects/:boroname/:cd', (req, res) => {
  const { boroname, cd } = req.params;

  const boroAcronym = boroMap(boroname);

  const URL = `http://a030-lucats.nyc.gov/lucats/ULURP_Search.aspx`;

  request({
    url: URL,
    jar: true,
    method: 'POST',
    followAllRedirects: true,
    headers: {
      Referer: 'http://a030-lucats.nyc.gov/lucats/ULURP_Search.aspx',
    },
    form: {
      status: 'active',
      ddl_geography: 2,
      TypeID: 0,
      borough: boroAcronym,
      cd,
      Search2: 'search',
      __VIEWSTATE: aspHeaders.viewstate,
      __EVENTVALIDATION: aspHeaders.eventvalidation,
      __VIEWSTATEGENERATOR: aspHeaders.viewstategenerator,
    }
  }, (err, response, body) => {
    console.log(response.statusCode)
    res.json(parse(body));
  });
});

module.exports = app;
