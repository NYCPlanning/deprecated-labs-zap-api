require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const NodeCache = require('node-cache');
const pgp = require('pg-promise')({
  query(e) {
     (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  },
});
const CRMClient = require('./utils/crm-client');


// instantiate express app
const app = express();

// initialize app resources
app.dbClient = pgp(process.env.DATABASE_URL);
app.crmClient = new CRMClient();
app.queryCache = new NodeCache({ stdTTL: 3600 });

// setup middleware
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,X-Query-Id');
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// set up routes
app.use('/projects', require('./routes/projects'));
app.use('/projects/:id', require('./routes/project'));
app.use('/projects.:fileType', require('./routes/download'));
app.use('/projects/tiles', require('./routes/tiles'));
app.use('/projects/ulurp', require('./routes/ulurp'));
app.use('/projects/feedback', require('./routes/feedback'));
app.use('/update-geometries', require('./routes/update-geometries'));
app.use('/ceqr', require('./routes/ceqr'));

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'not found',
  });
});

module.exports = app;
