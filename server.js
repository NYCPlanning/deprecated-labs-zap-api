const express = require('express');
const rp = require('request-promise-native');
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
  console.log(boroAcronym)

  const URL = 'http://a030-lucats.nyc.gov/lucats/ULURP_Search.aspx';

  const activeProjects = rp({
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
      __VIEWSTATE: aspHeaders.viewstate[boroAcronym],
      __EVENTVALIDATION: aspHeaders.eventvalidation[boroAcronym],
      __VIEWSTATEGENERATOR: aspHeaders.viewstategenerator,
    },
  });

  const completedProjects = rp({
    url: URL,
    jar: true,
    method: 'POST',
    followAllRedirects: true,
    headers: {
      Referer: 'http://a030-lucats.nyc.gov/lucats/ULURP_Search.aspx',
    },
    form: {
      status: 'completed',
      ddl_geography: 2,
      TypeID: 0,
      borough: boroAcronym,
      cd,
      Search2: 'search',
      __VIEWSTATE: aspHeaders.viewstate[boroAcronym],
      __EVENTVALIDATION: aspHeaders.eventvalidation[boroAcronym],
      __VIEWSTATEGENERATOR: aspHeaders.viewstategenerator,
    },
  });

  Promise.all([activeProjects, completedProjects])
    .then((values) => {
      const active = parse(values[0]);
      const completed = parse(values[1]);

      res.json({
        active,
        completed,
      });
    });
});

module.exports = app;
