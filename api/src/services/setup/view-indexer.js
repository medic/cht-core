const rpn = require('request-promise-native');
const _ = require('lodash');

const upgradeLogService = require('./upgrade-log');
const environment = require('../../environment');
const { DATABASES } = require('./databases');
const ddocsService = require('./ddocs');

const SOCKET_TIMEOUT_ERROR_CODE = ['ESOCKETTIMEDOUT', 'ETIMEDOUT'];
let continueIndexing;

const indexViews = async (viewsToIndex) => {
  continueIndexing = true;

  if (!Array.isArray(viewsToIndex)) {
    await upgradeLogService.setIndexed();
    return;
  }

  await upgradeLogService.setIndexing();
  const indexResult = await Promise.all(viewsToIndex.map(indexView => indexView()));
  if (continueIndexing) {
    await upgradeLogService.setIndexed();
  }

  return indexResult;
};


/**
 * Returns an array of functions that, when called, start indexing all views of staged ddocs
 * and return view indexing promises
 * @return {Promise<[function]>}
 */
const getViewsToIndex = async () => {
  const viewsToIndex = [];

  for (const database of DATABASES) {
    const stagedDdocs = await ddocsService.getStagedDdocs(database);
    stagedDdocs.forEach(ddoc => {
      if (!ddoc.views || !_.isObject(ddoc.views)) {
        return;
      }

      const ddocViewIndexPromises = Object
        .keys(ddoc.views)
        .map(viewName => indexView.bind({}, database.name, ddoc._id, viewName));
      viewsToIndex.push(...ddocViewIndexPromises);
    });
  }
  return viewsToIndex;
};

/**
 * Returns a promise that resolves when a view is indexed.
 * Retries querying the view until no error is thrown
 * @param {String} dbName
 * @param {String} ddocId
 * @param {String} viewName
 * @return {Promise}
 */
const indexView = async (dbName, ddocId, viewName) => {
  do {
    try {
      return await rpn.get({
        uri: `${environment.serverUrl}/${dbName}/${ddocId}/_view/${viewName}`,
        json: true,
        qs: { limit: 1 },
        timeout: 2000,
      });
    } catch (requestError) {
      if (!continueIndexing) {
        return;
      }

      if (!requestError || !requestError.error || !SOCKET_TIMEOUT_ERROR_CODE.includes(requestError.error.code)) {
        throw requestError;
      }
    }
  } while (continueIndexing);
};

const stopIndexing = () => {
  continueIndexing = false;
};

module.exports = {
  indexViews,
  getViewsToIndex,
  stopIndexing,
};
