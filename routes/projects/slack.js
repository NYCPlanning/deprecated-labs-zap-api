const express = require('express');

const router = express.Router();

/* POST /projects/slack */
/* A custom slash command for slack that queries this API  */
router.post('/', async (req, res, next) => {
  const { token, text } = req.body;

  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    fetch(`${process.env.HOST}/projects?applied-filters=project_applicant_text&project_applicant_text=${text}`)
      .then(d => d.json())
      .then((response) => {
        const projects = response.data.slice(0, 5);
        res.send({
          response_type: 'in_channel',
          text: projects.length ? `Top ${projects.length} ZAP projects matching '${text}'` : `No ZAP projects found matching '${text}'`,
          attachments: projects.map((project) => {
            const { id: projectid, attributes } = project;
            const {
              dcp_projectname: projectName,
              dcp_applicant: applicant,
              dcp_projectbrief: projectBrief,
              dcp_publicstatus_simp: status,
            } = attributes;
            return {
              color: 'good',
              text: `*<https://zap.planning.nyc.gov/projects/${projectid}|${projectName}>* \`${status}\` | *Applicant:* ${applicant} | ${projectBrief || 'No Project Brief'}`,
            };
          }),
        });
      })
      .catch(() => {
        next();
      });
  } else {
    res.status(403);
    res.send({
      status: 'invalid slack token',
    });
  }
});

module.exports = router;
