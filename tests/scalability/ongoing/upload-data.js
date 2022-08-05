const path = require('path');
const { spawn } = require('child_process');
const rpn = require('request-promise-native');
const fs = require('fs');
const config = require('./config');

const [,, instanceUrl, dataDir] = process.argv;
const dataDirPath = path.resolve(dataDir || __dirname);
const jsonDirPath = path.join(dataDirPath, 'json_docs');
const FILE_EXTENSION = '.doc.json';

const expectedNbr = config.contactsNbr.district_hospital *
                    config.contactsNbr.health_center *
                    config.contactsNbr.clinic *
                    config.contactsNbr.person * 3;
let savedDocs = 0;

const createJsonDir = async () => {
  if (fs.existsSync(jsonDirPath)) {
    const stats = await fs.promises.stat(jsonDirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Data location ${jsonDirPath} exists and is not a directory`);
    }

    const contents = await fs.promises.readdir(jsonDirPath);
    if (contents.length) {
      throw new Error(`json_docs folder ${jsonDirPath} already exists and is not empty.`);
    }
  }

  try {
    await fs.promises.mkdir(jsonDirPath);
  } catch (err) {
    throw new Error(`Could not create ${jsonDirPath} folder.`);
  }
};

const saveJson = (doc) => {
  const docName = `${doc._id}${FILE_EXTENSION}`;
  savedDocs++;
  if (savedDocs % 1000 === 0) {
    console.log(`Generated ${savedDocs} of approx ${expectedNbr}`);
  }
  return fs.promises.writeFile(path.join(jsonDirPath, docName), JSON.stringify(doc, null, 2));
};

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

const deleteJsonDocs = async () => {
  const files = await fs.promises.readdir(jsonDirPath);
  for (const file of files) {
    await fs.promises.unlink(path.join(jsonDirPath, file));
  }
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

const generateLoginList = (users) => {
  return fs.promises.writeFile(path.join(dataDirPath, 'users.json'), JSON.stringify(users, null, 2 ));
};

const uploadGeneratedDocs = async () => {
  await uploadDocs();
  await deleteJsonDocs();
};

module.exports = {
  uploadGeneratedDocs,
  uploadUsers,
  indexViews,
  saveJson,
  generateLoginList,
  createJsonDir,
};
