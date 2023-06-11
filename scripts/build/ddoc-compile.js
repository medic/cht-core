const util = require('util');
const couchCompile = util.promisify(require('couchdb-compile'));
const { writeFile, readdir } = require('node:fs/promises');

const getSubDirs = async (base) => {
  const dirs = await readdir(base);
  return dirs.map(dir => `${base}/${dir}`);
};

const compilePrimary = async () => {
  const dirs = await getSubDirs('build/ddocs/medic-db');
  await compile(dirs, 'build/ddocs/medic.json');
};

const compileStaging = async () => {
  await compile([ 'build/staging' ], 'build/staging.json');
};

const compileSecondary = async () => {
  await compile([ 'build/ddocs/sentinel-db/sentinel' ], 'build/ddocs/sentinel.json');
  await compile([ 'build/ddocs/users-meta-db/users-meta' ], 'build/ddocs/users-meta.json');
  await compile([ 'build/ddocs/logs-db/logs' ], 'build/ddocs/logs.json');
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

const compile = async (inputDirs, outputFile) => {
  const docs = await Promise.all(inputDirs.map(dir => couchCompile(dir)));
  await writeFile(outputFile, JSON.stringify({ docs }, null, 2));
  console.log(`ddoc compiled successfully: ${outputFile}`);
};

(async () => {
  await getCommand()();
})();
