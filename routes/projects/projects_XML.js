/*eslint-disable*/

const express = require('express');
const ADALService = require('../../utils/ADALServices');
const crmWebAPI = require('../../utils/crmWebAPI');
const fetchXmls = require('../../queries/fetchXmls');
const responseTemplate = require('../../queries/responseTemplate');
const router = express.Router({ mergeParams: true });
const postFetchEdits = require('../../utils/postFetchEdits');


/* GET /projects-xmls */
/* gets a JSON array of projects that match the query params */
router.post('/', async (req, res) => {
  const { queryParams } = req.body; //  temporary declaration for postman param use
  const { fillProjectsTemplate } = responseTemplate;


  try {
    const projects = await crmWebAPI.get(`dcp_projects?fetchXml=${fetchXmls.fetchProjects(queryParams, 1,  30)}`, 1);


    // send the response with a tile template
    res.send({
      data: fillProjectsTemplate(projects['value'])
      // data: projects['value'].map(project => fillProjectsTemplate(projectsTemplate, project))
      // meta: {
      //   total,
      //   pageTotal: length,
      //   ...tileMeta,
      // },
    });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;
