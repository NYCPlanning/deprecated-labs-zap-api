/*eslint-disable*/

// use .env for local environment variables
require('dotenv').config();


const express = require('express');
const logger = require('morgan');
const NodeCache = require('node-cache');
const cors_config = require('./middleware/cors');


// instantiate express app
const app = express();

// require pg-promise
const pgp = require('pg-promise')({
  query(e) {
     (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  },
});

// initialize database connection
app.db = pgp(process.env.DATABASE_URL);

// use node-cache to store SQL queries
app.filterCache = new NodeCache({ stdTTL: 3600 });

// allows CORS
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
  next();
});
app.use(cors_config());

// middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// import routes
app.use('/projects.:fileType', require('./routes/projects/download-new'));
app.use('/projects', require('./routes/projects'));
app.use('/ceqr', require('./routes/ceqr'));
app.use('/export', require('./routes/export'));

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'not found',
  });
});

module.exports = app;
