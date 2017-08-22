const express = require('express');
const request = require('request');
const parse = require('./parse');

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

  const URL = `http://a030-lucats.nyc.gov/lucats/DirectULURPCD.aspx?Boro=${boroMap(boroname)}&CD=${cd}`;

  request({
    url: URL,
    jar: true,
  }, (err, response, body) => { res.json(parse(body)); });
});

module.exports = app;
