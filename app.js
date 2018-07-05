const express = require('express');
const logger = require('morgan');
require('dotenv').config();

const projects = require('./routes/projects');
const zap = require('./routes/zap');
const exportRoute = require('./routes/export');

const app = express();

// allows CORS
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
  next();
});

app.use(logger('dev'));
app.use(express.json());

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
