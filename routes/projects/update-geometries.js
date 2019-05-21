require('dotenv').config({ path: '../../.env' });
const express = require('express');
const upsertGeoms = require('../../utils/upsert-geoms');

const router = express.Router({ mergeParams: true });


/* GET /projects/update-geometries/:id */
/* Retreive a single project and the API key */
router.get('/', async (req, res) => {
  const { app, params, query } = req; // request, connect to the database with app in app.js
  const { id } = params;
  const { API_KEY } = query;
  const { USER_API_KEY } = process.env; // retrieve the approved user API key defined in .env

  if (USER_API_KEY === API_KEY) {
    if (!id.match(/^P?[0-9]{4}[A-Z]{1}[0-9]{4}$/)) { // regex match for project id with zero or one 'P', four numbers, 1 letter, and four numbers
      res.send({
        status: 'failure',
        message: 'Invalid project id',
      });
    } else {
      try {
        const response = await upsertGeoms(id, app.db);

        res.send({
          response,
        });
      } catch (e) {
        console.log('Error updating geometries', error); // eslint-disable-line
        res.status(500).send({ error: e.toString() });
      }
    }
  } else {
    res.send({
      status: 'failure',
      message: 'Invalid query params - check API_KEY!',
    });
  }
});

module.exports = router;
