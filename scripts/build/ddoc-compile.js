const util = require('util');
const couchCompile = util.promisify(require('couchdb-compile'));
const { writeFile } = require('node:fs/promises');

const compilePrimary = async () => {
  await compile('build/ddocs/medic-db/', 'build/ddocs/medic.json');
};

const compileStaging = async () => {
  await compile('build/staging', 'build/staging.json');
};

const compileSecondary = async () => {
  await compile('build/ddocs/sentinel-db', 'build/ddocs/sentinel.json');
  await compile('build/ddocs/users-meta-db', 'build/ddocs/users-meta.json');
  await compile('build/ddocs/logs-db', 'build/ddocs/logs.json');
};

const commands = {
  'primary': compilePrimary,
  'staging': compileStaging,
  'secondary': compileSecondary,
};

const getCommand = () => {
  const cmdKey = process.argv.length > 2 && process.argv[2];
  const cmd = cmdKey && commands[cmdKey];
  if (!cmd) {
    throw new Error(`Unknown command: "${cmdKey}"`);
  }
  return cmd;
};

const compile = async (inputDir, outputFile) => {
  const doc = await couchCompile(inputDir);
  await writeFile(outputFile, JSON.stringify(doc, null, 2));
  console.log('ddoc compiled successfully');
};

(async () => {
  await getCommand()();
})();
