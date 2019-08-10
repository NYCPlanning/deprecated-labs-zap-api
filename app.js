require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const NodeCache = require('node-cache');
const pgp = require('pg-promise')({
  query(e) {
     (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  },
});
const CRMClient = require('./clients/crm-client');
const authenticate = require('./middleware/authenticate');


// instantiate express app
const app = express();

// initialize app resources
app.dbClient = pgp(process.env.DATABASE_URL);
app.crmClient = new CRMClient();
app.queryCache = new NodeCache({ stdTTL: 3600 });

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

app.use(logger('dev'));
app.use(cookieParser());
app.use(authenticate);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// set up routes
app.use('/projects', require('./routes/projects/projects'));
app.use('/projects/:id', require('./routes/projects/project'));
app.use('/projects.:fileType', require('./routes/projects/download'));
app.use('/projects/tiles', require('./routes/projects/tiles'));
app.use('/projects/ulurp', require('./routes/projects/ulurp'));
app.use('/projects/feedback', require('./routes/projects/feedback'));
app.use('/projects/update-geometries', require('./routes/projects/update-geometries'));

app.use('/login', require('./routes/login'));
app.use('/user-projects', require('./routes/user-projects'));
app.use('/ceqr', require('./routes/ceqr'));
app.use('/users', require('./routes/users'));

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'not found',
  });
});

module.exports = app;
