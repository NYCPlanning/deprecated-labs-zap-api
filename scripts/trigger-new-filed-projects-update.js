const fetch = require('node-fetch');
require('dotenv').config();

const { SLACK_WEBHOOK_URL, TARGET_ENV_HOST } = process.env;
const argv = process.argv.slice(2);

// init slack client
const SlackWebhook = require('slack-webhook');

const slack = new SlackWebhook(SLACK_WEBHOOK_URL);

// set interval
const intervalMin = Number.isInteger(argv[0]) ? argv[0] : 60;
const maxRetries = 3;

slack.send(`Initializing newly filed project update task with ${intervalMin} min interval`);

// Parsing the response as a proxy for ensuring we are getting back an expected response
const requestAndParse = async () => {
  try {
    const res = await fetch(`${TARGET_ENV_HOST}/projects/new-filed`);
    const json = await res.json();
    return { ok: res.ok, json };
  } catch (err) {
    throw Error(err);
  }
};

// add a retry to the request
const requestWithRetry = async (retries) => {
  try {
    const res = await requestAndParse();
    return res;
  } catch (err) {
    if (retries > 0) {
      console.log('Retrying...'); //eslint-disable-line
      return requestWithRetry(retries - 1);
    }
    console.log(err); //eslint-disable-line
    throw Error(`Exceeded ${maxRetries} attempts`);
  }
};

const triggerNewFiledProjectsUpdate = async () => {
  try {
    const { ok, json } = await requestWithRetry(maxRetries);
    let slackMessage = `Updated newly filed project geometries: ${json.success} successfully; ${json.failure} with failures`;
    if (!ok) {
      slackMessage += `; ${json.error} with errors`;
    }

    const attachments = [{
      text: `error messages: ${json.errorMessages}\nfailure messages: ${json.failureMessages}`,
    }];

    slack.send({ text: slackMessage, attachments });
  } catch (err) {
    console.log(err); //eslint-disable-line
    slack.send('ALERT: Unable to update newly filed project geometries');
  }

  setTimeout(triggerNewFiledProjectsUpdate, intervalMin * 60 /* sec */ * 1000 /* millisec */);
};

triggerNewFiledProjectsUpdate();
