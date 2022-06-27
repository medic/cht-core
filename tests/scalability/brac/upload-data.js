const path = require('path');
const { spawn } = require('child_process');
const rpn = require('request-promise-native');

const [,, instanceUrl, dataDir] = process.argv;
const dataDirPath = path.resolve(dataDir || __dirname);

const uploadUsers = async () => {
  console.log('Creating users....');
  const users = require(path.resolve(dataDirPath, 'users.json'));
  const results = await rpn.post({
    url: `${instanceUrl}/api/v1/users`,
    json: true,
    body: users,
  });
  const errors = results.filter(result => result.error);
  if (errors.length) {
    console.error(errors);
    throw new Error('Errors while creating users');
  }
  console.log('Users created successfully.');
};

const uploadDocs = () => {
  const chtConfPath = path.join(__dirname, '..', 'node_modules/.bin/cht');
  const params = `--url=${instanceUrl} upload-docs --force`.split(' ');
  const proc = spawn(chtConfPath, params, { stdio: ['ignore', 'pipe', 'pipe'], cwd: dataDirPath });

  return new Promise((resolve, reject) => {
    proc.stdout.on('data', data => console.log(data.toString()));
    proc.stderr.on('data', data => console.error(data.toString()));
    proc.on('error', (err) => {
      console.error(err);
      reject(err);
    });
    proc.on('close', resolve);
  });
};

const indexView = async (ddoc, view) => {
  do {
    try {
      return await rpn.get({
        url: `${instanceUrl}/medic/_design/${ddoc}/_view/${view}?limit=1`,
      });
    } catch (err) {
      // timeout
    }
    // eslint-disable-next-line no-constant-condition
  } while (true);
};

const indexViews = async () => {
  const ddocs = await rpn.get({
    url: `${instanceUrl}/medic/_design_docs?include_docs=true`,
    json: true,
  });

  // switch to Array.prototype.flat when in 4.0
  const indexViewsPromises = [];
  ddocs.rows.forEach(ddoc => {
    const ddocName = ddoc.id.replace('_design/', '');
    const promises = Object.keys(ddoc.doc.views || {}).map(view => indexView(ddocName, view));
    indexViewsPromises.push(...promises);
  });

  return await Promise.all(indexViewsPromises);
};

(async () => {
  try {
    await uploadDocs();
    await uploadUsers();
    await indexViews();
  } catch (err) {
    console.error('Error while uploading generated data', err);
    process.exit(1);
  }
})();
