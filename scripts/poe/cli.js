#!/usr/bin/env node
require('dotenv').config({ path: __dirname + '/.env' });

const Spinner = require('clui').Spinner;
const inquirer = require('./lib/inquirer');
const poe = require('./lib/poe');
const other = require('./lib/other');
const banner = require('./lib/banner');
const usage = require('./lib/usage');
const config = require('./config.json');
const {capitalize} = require('./lib/utils');
const {version} = require('../../package.json');
const log = require('loglevel');

const POE_CMDS = ['import', 'export'];
const OTHER_CMDS = ['slacktest', 'version'];
const ALL_CMDS = POE_CMDS.concat(OTHER_CMDS);
const POE_FUNS = {import: 'upload', export: 'download'};

log.setDefaultLevel(process.env.DEBUG === 'true' ? 'debug' : 'info');

const options = async (args) => {
  if(args.length > 1) {
    const opts = config[args[0]];
    opts.file = args[1];
    opts.api_token = process.env.POE_API_TOKEN;
    opts.id = process.env.POE_PROJECT_ID;
    opts.tags = args[0] === 'import' ? `{"all": [${version}]}` : `${version}`;
    return opts;
  }
  banner.show(args[0]);
  const {...opts} = await inquirer.ask(args[0]);
  return opts;
}

const run = async (args) => {
  const cmd = args.length && ALL_CMDS.includes(args[0]) && args[0];
  if(!cmd) {
    usage.show(ALL_CMDS);
  } else {
    if(POE_CMDS.includes(cmd)) {
      const opts = await options(args)
      const spinner = new Spinner(`${capitalize(cmd)}ing translations...`);
      spinner.start();
      try {
        await poe[POE_FUNS[cmd]](opts);
      } catch(ex) {
        console.log(ex);
      } finally {
        spinner.stop();
        console.log('\ndone.');
      }
    } else {
      other[cmd]();
    }
  }
};

run(process.argv.slice(2));
