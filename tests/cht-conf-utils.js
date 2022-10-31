const fs = require('fs');
const path = require('path');
const util = require('util');
const constants = require('./constants');
const exec = util.promisify(require('child_process').exec);

const runCommand = async (action, dirPath) => {
  const url = constants.BASE_URL_AUTH;
  try {
    const chtConfPath = path.resolve(process.cwd(), './node_modules/.bin/cht');
    const { stdout } = await exec(`${chtConfPath} --url=${url} ${action} --force --debug`, { cwd: dirPath });
    return stdout;
  } catch (err) {
    throw err.stdout || err.stderr || err.message;
  }
};

const getDirPath = () => path.join(__dirname, 'config-temp');

// todo: When no longer supporting Node.js -v.12, replace with: fs.rmdirSync(outputPath, { recursive: true });
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
  // project eslint needs to be root, as cht-core eslint rules fail for the "default" layout
  const eslintPath = path.join(dir, '.eslintrc');
  const eslintRules = JSON.parse(fs.readFileSync(eslintPath, 'utf-8'));
  eslintRules.root = true;
  fs.writeFileSync(eslintPath, JSON.stringify(eslintRules));
};

const compileNoolsConfig = async ({ tasks, targets, contactSummary }) => {
  const dir = getDirPath();

  if (tasks && fs.existsSync(tasks)) {
    fs.copyFileSync(tasks, path.join(dir, 'tasks.js'));
  }
  if (targets && fs.existsSync(targets)) {
    fs.copyFileSync(targets, path.join(dir, 'targets.js'));
  }
  if (contactSummary && fs.existsSync(contactSummary)) {
    fs.unlinkSync(path.join(dir, 'contact-summary.js'));
    fs.copyFileSync(contactSummary, path.join(dir, 'contact-summary.templated.js'));
  }

  await runCommand('compile-app-settings', dir);
  const appSettings = require(path.join(dir, 'app_settings.json'));

  const compiledConfig = {};
  if (tasks || targets) {
    compiledConfig.tasks = appSettings.tasks;
  }
  if (contactSummary) {
    compiledConfig.contactSummary = appSettings.contact_summary;
  }

  return compiledConfig;
};

const compileAndUploadAppForms = async (formsDir) => {
  const dir = getDirPath();

  if (!fs.existsSync(formsDir)) {
    return;
  }

  const configForms = path.join(dir, 'forms', 'app');
  fs.readdirSync(formsDir).forEach(file => {
    fs.copyFileSync(path.join(formsDir, file), path.join(configForms, file));
  });

  await runCommand('convert-app-forms', dir);
  await runCommand('upload-app-forms', dir);
};

const uploadDocs = async seed => {
  if(seed){
    for(let i; i<seed; i++){
      await exec(`cp report.pregnancy.csv "report1${i}i.csv"`, { cwd: 'config/default/csv' });
    }
  }
  await runCommand('csv-to-docs upload-docs create-users', 'config/default');
};

module.exports = {
  runCommand,
  compileNoolsConfig,
  initializeConfigDir,
  compileAndUploadAppForms,
  uploadDocs,
};
