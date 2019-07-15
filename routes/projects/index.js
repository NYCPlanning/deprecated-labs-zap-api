const express = require('express');

const router = express.Router();

// base routes
router.use('/', require('./projects_XML'));
router.use('/:id', require('./project_XML'));
router.use('/demoUpdate/:id', require('./demoUpdate'));
router.use('/demoGet/:id', require('./demoGet'));

// subordinate routes
router.use('/feedback', require('./feedback'));
router.use('/new-filed', require('./new-filed'));
router.use('/update-geometries/:id', require('./update-geometries'));
router.use('/slack', require('./slack'));
router.use('/tiles', require('./tiles'));
router.use('/ceqr', require('./ceqr'));
router.use('/ulurp', require('./ulurp'));

module.exports = router;
