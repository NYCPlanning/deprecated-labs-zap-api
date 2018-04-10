const express = require('express');
const rp = require('request-promise-native');
const parseMulti = require('./parse-multi');
const parseSingle = require('./parse-single');
const aspHeaders = require('./aspHeaders');

const app = express();


// const jar2 = rp.jar();

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
  const jar1 = rp.jar();

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
      let active = [];
      // LUCATS has different results when there is only one project in a community district
      if (activeHTML.includes('Land Use Application ID')) {
        active = parseSingle(activeHTML);
      } else {
        active = parseMulti(activeHTML);
      }
      active.map((application) => {
        const a = application;
        a.status = 'active';
        return a;
      });
      res.json(active);
    });
});

app.get('/zap/:zapAcronym.json', (req, res) => {
  const { zapAcronym } = req.params;
  const zapUrl = `https://dcppfsuat.dynamics365portals.us/_odata/Projects?$filter=substringof('${zapAcronym}',dcp_validatedcommunitydistricts)&$filter=dcp_certifiedreferred%20eq%20null&$top=10&$orderby=dcp_certifiedreferred`;
  rp({
    url: zapUrl,
    json: true,
  })
    .then((data) => {
      res.json(data.value);
    });
});

module.exports = app;
