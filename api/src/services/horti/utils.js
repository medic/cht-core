const rpn = require('request-promise-native');
const fs = require('fs');
const path = require('path');

const db = require('../../db');
const logger = require('../../logger');
const environment = require('../../environment');

const LOCAL_VERSION = 'local';
const DDOC_PREFIX = '_design/';
const BUILD_DOC_PREFIX = 'medic:medic:';
const STAGED_DDOC_PREFIX = `${DDOC_PREFIX}:staged:`;
const SOCKET_TIMEOUT_ERROR_CODE = 'ESOCKETTIMEDOUT';

const DATABASES = [
  {
    name: 'medic',
    dbObject: db.medic,
    jsonFileName: 'medic.json',
    index: true,
  },
  {
    name: 'sentinel',
    dbObject: db.sentinel,
    jsonFileName: 'sentinel.json',
  },
  {
    name: 'logs',
    dbObject: db.medicLogs,
    jsonFileName: 'logs.json',
  },
  {
    name: 'usersMeta',
    dbObject: db.medicUsersMeta,
    jsonFileName: 'users-meta.json',
  }
];

const isStagedDdoc = ddocId => ddocId.startsWith(STAGED_DDOC_PREFIX);


const cleanup = async () => {
  logger.info('Deleting existent staged ddocs');

  const deferredJobs = [];
  for (const database of DATABASES) {
    const currentDdocs = await getStagedDdocs(database);
    console.log('current Ddocs', currentDdocs);
    continue;

    await deleteDocs(database, currentDdocs);
    logger.info(`Running DB compact and cleanup for ${database.name}`);
    deferredJobs.push(database.dbObject.compact(), database.dbObject.viewCleanup());
  }

  return Promise.all(deferredJobs);
};

const getStagedDdocs = async ({ dbObject }) => {
  const result = await dbObject.allDocs({ startkey: STAGED_DDOC_PREFIX, endkey: `${STAGED_DDOC_PREFIX}\ufff0`});
  console.log(result);
  return [];
  //return result.rows.map(row => ({ id: row.id, rev: row.value.rev }));
};

const getDdocs = async ({ dbObject }, includeDocs = false) => {
  const opts = { startKey: DDOC_PREFIX, endkey: `${DDOC_PREFIX}\ufff0`, include_docs: includeDocs };
  const result = await dbObject.allDocs(opts);
  return result.rows.map(row => ({ id: row.id, rev: row.value.rev, doc: row.doc }));
};

const deleteDocs = async ({ dbObject }, docs) => {
  if (!docs.length) {
    return;
  }
  console.log(docs);
  return;

  docs.forEach(doc => doc._deleted = true);
  // todo test for successfull deletion
  return dbObject.bulkDocs(docs);
};

const getDocs = async (dbObject, docIds) => {
  const result = await dbObject.allDocs({ keys: docIds, include_docs: true });
  return result.rows.map(row => row.doc);
};

const indexView = (dbObject, ddocName, viewName) => {
  try {
    return rpn.get({
      uri: `${environment.serverUrl}/${dbObject.name}/${DDOC_PREFIX}${ddocName}/_view/${viewName}`,
      json: true,
      qs: { limit: 1 },
      timeout: 2000,
    });
  } catch (requestError) {
    if (requestError && requestError.error && requestError.error.code === SOCKET_TIMEOUT_ERROR_CODE) {
      return indexView(dbObject, ddocName, viewName);
    }
    throw requestError;
  }
};

const getDdocsToStageFromJson = (json) => {
  const ddocs = json.docs;
  ddocs.forEach(ddoc => {
    ddoc._id = ddoc._id.replace(DDOC_PREFIX, `${DDOC_PREFIX}${STAGED_DDOC_PREFIX}`);
  });
  return ddocs;
};

const saveDocs = ({ dbObject }, ddocs) => dbObject.bulkDocs(ddocs);

const getViewsToIndex = async ({ dbObject }, ddocsToStage) => {
  const viewsToIndex = [];

  const ddocs = await getDocs(ddocsToStage.map(doc => doc._id));
  ddocs.forEach(ddoc => {
    const ddocName = ddoc._id.replace(DDOC_PREFIX, '');
    viewsToIndex.push(...Object.keys(ddoc.views).map(viewName => indexView.bind({}, dbObject, ddocName, viewName)));
  });

  return viewsToIndex;
};

const getDdocsForVersion = async (version) => {
  if (version === LOCAL_VERSION) {
    return;
  }

  try {
    await fs.promises.access(environment.getUpgradePath());
    await fs.promises.rmdir(environment.getUpgradePath());
  } catch (err) {
    // if file doesn't exist, do nothing
  } finally {
    await fs.promises.mkdir(environment.getUpgradePath());
  }

  const docId = `${BUILD_DOC_PREFIX}${version}`;
  const doc = await db.builds.get(docId, { attachments: true });

  for (const database of DATABASES) {
    const attachment = doc._attachments[database.jsonFileName];
    if (!attachment) {
      // throw error
      continue;
    }

    await fs.promises.writeFile(path.join(environment.getUpgradePath(), database.jsonFileName), attachment.data);
  }
};

const getDdocsToStage = ({ jsonFileName }, version) => {
  const ddocsFolderPath = version === LOCAL_VERSION ? environment.getDdocsPath() : environment.getUpgradePath();
  const json = require(path.join(ddocsFolderPath, jsonFileName));
  return getDdocsToStageFromJson(json);
};

const stage = async (version = 'local') => {
  await cleanup();
  await getDdocsForVersion(version);

  const viewsToIndex = [];

  for (const database of DATABASES) {
    const ddocsToStage = getDdocsToStage(database, version);
    await saveDocs(database, ddocsToStage);
    if (database.index) {
      viewsToIndex.push(...await getViewsToIndex(database, ddocsToStage));
    }
  }

  const indexViews = () => viewsToIndex.map(indexView => indexView());
  return indexViews;
};

const complete = async () => {
  for (const database of DATABASES) {
    const ddocs = await getDdocs(database, true);
    for (const ddoc of ddocs) {
      if (!isStagedDdoc(ddoc.id)) {
        continue;
      }

      const ddocName = ddoc.id.replace(STAGED_DDOC_PREFIX, '');
      const ddocToReplace = ddocs.find(ddoc => ddoc._id === `${DDOC_PREFIX}${ddocName}`);
      if (!ddocToReplace) {
        delete ddoc.doc._rev;
      } else {
        ddoc.doc._rev = ddocToReplace.doc._rev;
        ddoc.doc._id = ddocToReplace.doc._id;
      }

      await database.dbObject.put(ddoc.doc);
    }
  }
};

const getStagedDdocId = ddocId => ddocId.replace(DDOC_PREFIX, `${DDOC_PREFIX}${STAGED_DDOC_PREFIX}`);
const getDdocId = stagedDdocId => stagedDdocId.replace(`${DDOC_PREFIX}${STAGED_DDOC_PREFIX}`, DDOC_PREFIX);

module.exports = {
  DDOC_PREFIX,
  STAGED_DDOC_PREFIX,
  DATABASES,

  cleanup,
  stage,
  complete,

  getDdocs,
  isStagedDdoc,
  getStagedDdocId,
  getDdocId,
};
