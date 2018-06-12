const express = require('express');
const logger = require('morgan');
require('dotenv').config();

const projects = require('./routes/projects');
const zap = require('./routes/zap');

const app = express();

// allows CORS
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.use(logger('dev'));

// import routes
app.use('/projects', projects);
app.use('/zap', zap);

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'not found',
  });
});

module.exports = app;
