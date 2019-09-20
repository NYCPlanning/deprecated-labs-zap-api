const express = require('express');

const router = express.Router({ mergeParams: true });

/* Retreive a single project */
router.patch('/', async (req, res) => {
  const { body } = req;

  res.status(201).send(body);
});

module.exports = router;
