const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const utils = require('./utils');

const runCommand = async (action, folder) => {
  const url = utils.getInstanceUrl();
  try {
    const { stdout } = await exec(`medic-conf --url=${url} ${action} --force --debug`, { cwd: folder });
    return stdout;
  } catch (err) {
    return err.stdout;
  }
};

const getDirPath = () => path.join(__dirname, 'config-temp');

// ToDo: When no longer supporting Node.js -v.12, replace with: fs.rmdirSync(outputPath, { recursive: true });
const removeDirectoryRecursive = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const files = fs.readdirSync(dirPath) || [];

  files.forEach(fileName => {
    const filePath = path.join(dirPath, fileName);

    if (fs.statSync(filePath).isDirectory()) {
      removeDirectoryRecursive(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  });

  fs.rmdirSync(dirPath);
};

const createDirectory = (dir) => {
  if (fs.existsSync(dir)) {
    removeDirectoryRecursive(dir);
  }
  fs.mkdirSync(dir);
};

const initializeConfigDir = async () => {
  const dir = getDirPath();

  createDirectory(dir);
  await runCommand('initialise-project-layout', dir);
  // make project eslint be root
  const eslintPath = path.join(dir, '.eslintrc');
  const eslintRules = JSON.parse(fs.readFileSync(eslintPath, 'utf-8'));
  eslintRules.root = true;
  fs.writeFileSync(eslintPath, JSON.stringify(eslintRules));
};

const compileNoolsConfig = async (tasksFile, targetsFile) => {
  const dir = getDirPath();

  if (tasksFile && fs.existsSync(tasksFile)) {
    fs.copyFileSync(tasksFile, path.join(dir, 'tasks.js'));
  }
  if (targetsFile && fs.existsSync(targetsFile)) {
    fs.copyFileSync(targetsFile, path.join(dir, 'targets.js'));
  }

  await runCommand('compile-app-settings', dir);
  const appSettings = require(path.join(dir, 'app_settings.json'));

  //removeDirectoryRecursive(folder);
  return appSettings && appSettings.tasks;
};

const compileAndUploadAppForms = async (formsDir) => {
  const dir = getDirPath();

  if (!fs.existsSync(formsDir)) {
    return;
  }
  // copy files
  const configForms = path.join(dir, 'forms', 'app');
  fs.readdirSync(formsDir).forEach(file => {
    fs.copyFileSync(path.join(formsDir, file), path.join(configForms, file));
  });

  await runCommand('compile-app-forms', dir);
  await runCommand('upload-app-forms', dir);
};

module.exports = {
  compileNoolsConfig,
  initializeConfigDir,
  compileAndUploadAppForms,
};
