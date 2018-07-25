const express = require('express');
const { Recaptcha } = require('express-recaptcha');
const github = require('octonode');

const router = express.Router();

const client = github.client(process.env.GITHUB_ACCESS_TOKEN);
const ghrepo = client.repo('NYCPlanning/dcp-zap-data-feedback');

const recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY);

/* POST /projects/feedback */
/* Submit feedback about a project */
router.post('/', recaptcha.middleware.verify, async (req, res) => {
  if (!req.recaptcha.error) {
    // create a new issue
    const { projectid, projectname, text } = req.body;
    ghrepo.issue({
      title: `Feedback about ${projectname}`,
      body: `Project ID: [${projectid}](https://zap.planning.nyc.gov/projects/${projectid})\nFeedback: ${text}`,
    }, (err) => {
      if (err) {
        res.status(500);
      } else {
        res.status(201);
      }

      res.send({
        status: err ? 'error' : 'success',
      });
    });
  } else {
    res.status(403);
    res.send({
      status: 'captcha invalid',
    });
  }
});

module.exports = router;
