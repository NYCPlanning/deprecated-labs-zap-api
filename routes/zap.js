const express = require('express');
const rp = require('request-promise-native');

const router = express.Router();

router.get('/:zapAcronym.json', (req, res) => {
  const { zapAcronym } = req.params;
  const zapUrl = `https://nycdcppfs.dynamics365portals.us/_odata/Projects?$filter=(dcp_publicstatus/Value eq 717170000 and substringof('${zapAcronym}',dcp_validatedcommunitydistricts))`;

  rp({
    url: zapUrl,
    json: true,
  })
    .then((data) => {
      const projects = data.value;

      const cleanedProjects = projects.map(project => ({
        projectid: project.dcp_projectid,
        applicant_customer: project.dcp_applicant_customer ? project.dcp_applicant_customer.Name : 'Unknown Applicant',
        projectname: project.dcp_projectname,
        type: project.dcp_ulurp_nonulurp ? project.dcp_ulurp_nonulurp.Name : 'Unknown Type',
      }));

      res.json(cleanedProjects);
    });
});

module.exports = router;
