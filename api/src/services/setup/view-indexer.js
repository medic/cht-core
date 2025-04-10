const request = require('@medic/couch-request');
const _ = require('lodash');

const upgradeLogService = require('./upgrade-log');
const environment = require('@medic/environment');
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
      if (ddoc.views && _.isObject(ddoc.views)) {
        const ddocViewIndexPromises = Object
          .keys(ddoc.views)
          .map(viewName => indexView.bind({}, database.name, ddoc._id, viewName));
        viewsToIndex.push(...ddocViewIndexPromises);
      }

      if (ddoc.nouveau && _.isObject(ddoc.nouveau)) {
        const ddocNouveauIndexPromises = Object
          .keys(ddoc.nouveau)
          .map(indexName => indexNouveauIndex.bind({}, database.name, ddoc._id, indexName));
        viewsToIndex.push(...ddocNouveauIndexPromises);
      }
    });
  }
  return viewsToIndex;
};

/**
 * Attempts to make a request, retrying on socket timeout errors
 * @param {Object} requestArgs - Arguments for the request
 * @return {Promise} - Resolves with the request result or undefined if stopped
 */
const waitForRequest = async (requestArgs) => {
	const handleRequest = async () => {
    try {
      return await request.get(requestArgs);
    } catch (requestError) {
      if (continueIndexing && !SOCKET_TIMEOUT_ERROR_CODE.includes(requestError?.error?.code)) {
        throw requestError;
      }
    }
	}

  do {
		handleRequest();
  } while (continueIndexing);
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
  return await waitForRequest({
    uri: `${environment.serverUrl}/${dbName}/${ddocId}/_view/${viewName}`,
    json: true,
    qs: { limit: 1 },
  });
};

/**
 * Returns a promise that resolves when a nouveau index is indexed.
 * Retries querying the index until no error is thrown
 * @param {String} dbName
 * @param {String} ddocId
 * @param {String} indexName
 * @return {Promise}
 */
const indexNouveauIndex = async (dbName, ddocId, indexName) => {
  return await waitForRequest({
    uri: `${environment.serverUrl}/${dbName}/_design/${ddocId}/_nouveau/${indexName}`,
    json: true,
    qs: { q: '*:*', limit: 1 },
  });
};

const stopIndexing = () => {
  continueIndexing = false;
};

module.exports = {
  indexViews,
  getViewsToIndex,
  stopIndexing,
};
