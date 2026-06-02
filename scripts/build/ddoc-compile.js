const util = require('util');
const couchCompile = util.promisify(require('couchdb-compile'));
const { writeFile, readdir } = require('node:fs/promises');
const { getCommand } = require('./get-command');

const getSubDirs = async (base) => {
  const dirs = await readdir(base);
  return dirs.map(dir => `${base}/${dir}`);
};

const compileStaging = async () => {
  await compile(['build/staging'], 'build/staging.json');
};

const compilePrimary = async () => {
  const dirs = await getSubDirs('build/ddocs/medic-db');
  await compile(dirs, 'build/ddocs/medic.json');
  await compile(['build/ddocs/sentinel-db/sentinel'], 'build/ddocs/sentinel.json');
  await compile(['build/ddocs/users-meta-db/users-meta'], 'build/ddocs/users-meta.json');
  await compile(['build/ddocs/logs-db/logs'], 'build/ddocs/logs.json');
  await compile(['build/ddocs/users-db/users'], 'build/ddocs/users.json');
};

const commands = {
  'primary': compilePrimary,
  'staging': compileStaging,
};

const compile = async (inputDirs, outputFile) => {
  const docs = await Promise.all(inputDirs.map(dir => couchCompile(dir)));
  await writeFile(outputFile, JSON.stringify({ docs }, null, 2));
  console.log(`ddoc compiled successfully: ${outputFile}`);
};

(async () => {
  try {
    await getCommand({ commands, scriptName: 'scripts/build/ddoc-compile.js' })();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
