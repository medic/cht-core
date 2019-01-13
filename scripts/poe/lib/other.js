const pkg = require('../package.json');
const slack = require('./slack')(process.env.SLACK_WEBHOOK_URL);

module.exports = {
  slacktest: () => {
    slack.send('Hello from POE translation scripts');
    console.log('Message sent. Check your slack channel.');
  },
  version: () => {
    console.log(pkg.version);
  }
};
