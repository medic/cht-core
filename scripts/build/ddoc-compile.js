const util = require('util');
const path = require('path');
const couchCompile = util.promisify(require('couchdb-compile'));
const { writeFile, readdir, mkdir, cp, access, rm } = require('node:fs/promises');

const VIEW_MAP = require('../../ddocs/medic-db/view-map');

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const getSubDirs = async (base) => {
  const entries = await readdir(base, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => `${base}/${entry.name}`);
};

const assembleViews = async () => {
  const medicDbPath = 'build/ddocs/medic-db';
  const viewsSourcePath = `${medicDbPath}/views`;

  // Group views by ddoc
  const ddocViews = {};
  for (const [viewName, ddocName] of Object.entries(VIEW_MAP)) {
    if (!ddocViews[ddocName]) {
      ddocViews[ddocName] = [];
    }
    ddocViews[ddocName].push(viewName);
  }

  // Create each ddoc directory with _id and views
  for (const [ddocName, views] of Object.entries(ddocViews)) {
    const ddocPath = `${medicDbPath}/${ddocName}`;
    const ddocViewsPath = `${ddocPath}/views`;

    // Remove any existing views directory to start fresh
    if (await exists(ddocViewsPath)) {
      await rm(ddocViewsPath, { recursive: true });
    }

    await mkdir(ddocViewsPath, { recursive: true });

    // Write _id file (overwrite if exists)
    await writeFile(`${ddocPath}/_id`, `_design/${ddocName}`);

    // Copy views
    for (const viewName of views) {
      const src = `${viewsSourcePath}/${viewName}`;
      const dest = `${ddocViewsPath}/${viewName}`;
      await cp(src, dest, { recursive: true });
    }
  }
};

const compileStaging = async () => {
  await compile([ 'build/staging' ], 'build/staging.json');
};

const compilePrimary = async () => {
  await assembleViews();
  const dirs = await getSubDirs('build/ddocs/medic-db');
  // Filter out the central views directory
  const ddocDirs = dirs.filter(dir => !dir.endsWith('/views'));
  await compile(ddocDirs, 'build/ddocs/medic.json');
  await compile([ 'build/ddocs/sentinel-db/sentinel' ], 'build/ddocs/sentinel.json');
  await compile([ 'build/ddocs/users-meta-db/users-meta' ], 'build/ddocs/users-meta.json');
  await compile([ 'build/ddocs/logs-db/logs' ], 'build/ddocs/logs.json');
  await compile([ 'build/ddocs/users-db/users' ], 'build/ddocs/users.json');
};

const commands = {
  'primary': compilePrimary,
  'staging': compileStaging,
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
