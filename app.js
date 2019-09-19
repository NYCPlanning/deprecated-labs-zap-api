const express = require('express');
const logger = require('morgan');
const NodeCache = require('node-cache');
const cookieParser = require('cookie-parser');
const authenticate = require('./middleware/authenticate');

// use .env for local environment variables
require('dotenv').config();

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
app.tileCache = new NodeCache({ stdTTL: 3600 });

// allows CORS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:4200', 'http://localhost:3000'];

// setup middleware
app.all('*', (req, res, next) => {
  if (ALLOWED_ORIGINS.includes(req.headers.origin)) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,X-Query-Id');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }

  next();
});

// middleware
app.use(cookieParser());
app.use(authenticate);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// import routes
app.use('/projects.:filetype', require('./routes/projects/download'));
app.use('/projects', require('./routes/projects'));
app.use('/ceqr', require('./routes/ceqr'));
app.use('/export', require('./routes/export'));
app.use('/login', require('./routes/login'));
app.use('/users', require('./routes/users'));

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'not found',
  });
});

module.exports = app;
