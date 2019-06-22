const express = require('express');
const Recaptcha = require('express-recaptcha').RecaptchaV3;
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
    }, (error, { url }) => {
      if (error) {
        console.log('Error submitting feedback', error); // eslint-disable-line
        res.status(500).send({
          status: 'error',
          error,
        });
      } else {
        res.status(201).send({
          status: 'success',
          url,
        });
      }
    });
  } else {
    res.status(403).send({
      status: 'captcha invalid',
    });
  }
});

module.exports = router;
