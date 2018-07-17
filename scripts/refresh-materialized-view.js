require('dotenv').config();

const SlackWebhook = require('slack-webhook');
const pgp = require('pg-promise')({
  query(e) {
     (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  },
});

const { DATABASE_CONNECTION_STRING, SLACK_WEBHOOK_URL } = process.env;

// initialize database connection
const db = pgp(DATABASE_CONNECTION_STRING);

// initialize slack webhook
const slack = new SlackWebhook(SLACK_WEBHOOK_URL);

slack.send('Hello, World!  What is my purpose?');


const refreshMaterializedView = () => {
  db.query('REFRESH MATERIALIZED VIEW normalized_projects;')
    .then((data) => {
      console.log(data);
      slack.send('The `normalized_projects` materialized view was refreshed!');
    })
    .catch((e) => {
      console.log(e);
      slack.send('There was a problem updating `normalized_projects`');
    });

  // repeat every 30 minutes
  setTimeout(refreshMaterializedView, 1800000);
};

refreshMaterializedView();
