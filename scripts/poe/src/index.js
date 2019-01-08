#!/usr/bin/env node
require('dotenv').config({ path: __dirname + '/../.env' });

const CLI = require('clui'),
      Spinner = CLI.Spinner,
      inquirer = require('./inquirer'),
      poeditor = require('./poeditor'),
      banner = require('./banner'),
      slack = require('./slack')(process.env.SLACK_WEBHOOK_URL),
      log = require('loglevel');

const POE_CMDS = ['upload', 'download'];
const OTHER_CMDS = ['slacktest'];
const ALL_CMDS = POE_CMDS.concat(OTHER_CMDS);

log.setDefaultLevel(process.env.DEBUG === 'true' ? 'debug' : 'info');

const run = async (args) => {
  const cmd = args.length && ALL_CMDS.includes(args[0]) && args[0];
  if(!cmd) {
    usage.show(ALL_CMDS);
  } else {
    if(POE_CMDS.includes(cmd)) {
      banner.show(cmd);
      const {...opts} = await inquirer.ask(cmd);
      const spinner = new Spinner(`${cmd}ing translations...`);
      spinner.start();
      try {
        await poeditor.execute(cmd, opts);
      } catch(ex) {
        console.log(ex);
      } finally {
        spinner.stop();
        console.log('\ndone.');
      }
    } else if (cmd === 'slacktest') {
      await slack.send('Hello from POE translation scripts');
    }
  }
};

run(process.argv.slice(2));
