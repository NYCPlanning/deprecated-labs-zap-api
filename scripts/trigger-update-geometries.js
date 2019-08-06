const fetch = require('node-fetch');
require('dotenv').config();

const {
  SLACK_WEBHOOK_URL,
  HOST,
  USER_API_KEY,
} = process.env;
const argv = process.argv.slice(2);

// init slack client
const SlackWebhook = require('slack-webhook');

const slack = new SlackWebhook(SLACK_WEBHOOK_URL);

// set interval
console.log(argv);
const INTERVAL_MIN = Number.isInteger(parseInt(argv[0])) ? parseInt(argv[0]) : 60;

async function updateGeometries() {
  try {
    // Use a lookback interval equal to task interval plus a small buffer
    const lookBackSec = (INTERVAL_MIN * 60) + 10;
    const res = await fetch(`${HOST}/update-geometries?lookBackSec=${lookBackSec}&API_KEY=${USER_API_KEY}`);
    const json = await res.json();
    slack.send(json.message);
  } catch (e) {
    console.log(e); // eslint-disable-line
    slack.send(`Failed to execute update-geometries request`);
  }
}

async function triggerUpdateGeometriesTask() {
  await updateGeometries();

  const intervalMilli = INTERVAL_MIN * 60 * 1000;
  setTimeout(triggerUpdateGeometriesTask, intervalMilli);
}

slack.send(`Initializing newly filed project update task with ${INTERVAL_MIN} min interval`);

triggerUpdateGeometriesTask();
