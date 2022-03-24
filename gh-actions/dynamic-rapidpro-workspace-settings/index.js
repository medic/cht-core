const core = require('@actions/core');
const fs = require('fs');
const { run } = require('./utils');

const githubWorkspacePath = process.env['GITHUB_WORKSPACE'];
const codeRepository = path.resolve(path.resolve(githubWorkspacePath), core.getInput('directory'));

const settingsFile = 'app_settings.json';
const flowsFile = 'flows.js';

run(githubWorkspacePath, core, fs, settingsFile, flowsFile);
