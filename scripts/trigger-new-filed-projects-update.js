require('dotenv').config();
const request = require('request-promise-native');

const { SLACK_WEBHOOK_URL, HOST } = process.env;
const argv = process.argv.slice(2);

// init slack client
const SlackWebhook = require('slack-webhook');

const slack = new SlackWebhook(SLACK_WEBHOOK_URL);

// set interval
const interval_min = Number.isInteger(argv[0]) ? argv[0] : 60;

slack.send(`Initializing newly filed project update task with ${interval_min} min interval`);

const triggerNewFiledProjectsUpdate = () => {
  request({
    method: 'GET',
    uri: `${HOST}/projects/new-filed`,
    timeout: 5 * 60 * 1000, // 5 minutes -- this can be slow, might get slower, don't want to have to come change this
    simple: false,
    resolveWithFullResponse: true,
  })
    .then((res) => {
      const jsonBody = JSON.parse(res.body);

      let slackMessage = `Updated newly filed project geometries: ${jsonBody.success} successfully; ${jsonBody.failure} with failures`;
      if (res.statusCode !== 200) {
        slackMessage += `; ${jsonBody.error} with errors`;
      }

      const attachments = [{
        text: `error messages: ${jsonBody.errorMessages}\nfailure messages: ${jsonBody.failureMessages}`,
      }];

      slack.send({ text: slackMessage, attachments });
    })
    .catch((err) => {
      console.log(err); //eslint-disable-line
      slack.send('ALERT: Unable to update newly filed project geometries');
    });

  setTimeout(triggerNewFiledProjectsUpdate, interval_min * 60 /* sec */ * 1000 /* millisec */);
};

triggerNewFiledProjectsUpdate();
