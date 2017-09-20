const express = require('express');
const rp = require('request-promise-native');
const parse = require('./parse');
const aspHeaders = require('./aspHeaders');

const app = express();

const jar1 = rp.jar();
const jar2 = rp.jar();

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

app.get('/ulurp/cd/:boroname/:cd.json', (req, res) => {
  const { boroname, cd } = req.params;

  const boroAcronym = boroMap(boroname);
  console.log(`Fetching LUCATS applications for ${boroAcronym}${cd}`) // eslint-disable-line

  const URL = 'http://a030-lucats.nyc.gov/lucats/ULURP_Search.aspx';

  rp({
    url: URL,
    jar: jar1,
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
  })
    .then((activeHTML) => {
      const active = parse(activeHTML);
      active.map((application) => {
        const a = application;
        a.status = 'active';
        return a;
      });

      res.json(active);
    });
});

module.exports = app;
