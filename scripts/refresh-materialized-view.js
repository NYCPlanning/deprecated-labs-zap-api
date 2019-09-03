require('dotenv').config();

const SlackWebhook = require('slack-webhook');
const pgp = require('pg-promise')({
  query(e) {
     (process.env.DEBUG === 'true') ? console.log(e.query) : null; // eslint-disable-line
  },
});

const { DATABASE_URL, SLACK_WEBHOOK_URL } = process.env;

// initialize database connection
const db = pgp(DATABASE_URL);

// initialize slack webhook
const slack = new SlackWebhook(SLACK_WEBHOOK_URL);

slack.send('Initializing materialized view refresh task with 30 min interval');


const refreshMaterializedView = () => {
  db.query('REFRESH MATERIALIZED VIEW normalized_projects;')
    .then(() => {
      console.log('Success! REFRESH MATERIALIZED VIEW normalized_projects;') // eslint-disable-line
    })
    .catch((e) => {
      slack.send(`I'm sorry to report that there was a problem updating \`normalized_projects\`, ${e}`);
    });

  // repeat every 30 minutes
  setTimeout(refreshMaterializedView, 1800000);
};

refreshMaterializedView();
