const express = require('express');
const path = require('path');
const logger = require('morgan');
const NodeCache = require('node-cache');

require('dotenv').config();

const projects = require('./routes/projects');
const zap = require('./routes/zap');
const exportRoute = require('./routes/export');

const app = express();

// log the SQL query
const initOptions = {
  // query(e) {
  //    (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  // },
};

const pgp = require('pg-promise')(initOptions);

// initialize database connection
app.db = pgp(process.env.DATABASE_CONNECTION_STRING);

app.tileCache = new NodeCache({ stdTTL: 3600 });

app.sql = (file) => {
  const fullPath = path.join(__dirname, file);
  return new pgp.QueryFile(fullPath, { minify: true });
};

// allows CORS
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// import routes
app.use('/projects', projects);
app.use('/zap', zap);
app.use('/export', exportRoute);

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'not found',
  });
});

module.exports = app;
