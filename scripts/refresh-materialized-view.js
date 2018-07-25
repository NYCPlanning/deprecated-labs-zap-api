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
    .then(() => {})
    .catch((e) => {
      slack.send(`I'm sorry to report that there was a problem updating \`normalized_projects\`, ${e}`);
    });

  // repeat every 30 minutes
  setTimeout(refreshMaterializedView, 1800000);
};

refreshMaterializedView();
