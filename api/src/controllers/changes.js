const auth = require('../auth');
const db = require('../db');
const authorization = require('../services/authorization');
const _ = require('lodash');
const heartbeatFilter = require('../services/heartbeat-filter');
const tombstoneUtils = require('@medic/tombstone-utils');
const uuid = require('uuid/v4');
const config = require('../config');
const logger = require('../logger');
const serverChecks = require('@medic/server-checks');
const serverUtils = require('../server-utils');
const environment = require('../environment');
const semver = require('semver');
const usersService = require('../services/users');
const purgedDocs = require('../services/purged-docs');
const replicationLimitLog = require('../services/replication-limit-log');

let inited = false;
let continuousFeed = false;
let longpollFeeds = [];
let normalFeeds = [];
let currentSeq = 0;
let limitChangesRequests = null;

const cleanUp = feed => {
  clearInterval(feed.heartbeat);
  clearTimeout(feed.timeout);

  if (feed.upstreamRequest) {
    feed.upstreamRequest.cancel();
  }
};

const isLongpoll = req => {
  return req.query && ['longpoll', 'continuous', 'eventsource'].indexOf(req.query.feed) !== -1;
};

const defibrillator = feed => {
  if (feed.req.query && feed.req.query.heartbeat) {
    const heartbeat = heartbeatFilter(feed.req.query.heartbeat);
    feed.heartbeat = setInterval(() => writeDownstream(feed, '\n'), heartbeat);
  }
};

const addTimeout = feed => {
  clearTimeout(feed.timeout);
  if (feed.req.query && feed.req.query.timeout) {
    feed.timeout = setTimeout(() => endFeed(feed), feed.req.query.timeout);
  }
};

const endFeed = (feed, write = true, debounced = false) => {
  if ((feed.cancelDebouncedEnd && debounced) || feed.ended) {
    return;
  }

  if (feed.hasNewSubjects && !feed.reiterate_changes) {
    return restartNormalFeed(feed);
  }

  if (feed.hasNewSubjects && feed.reiterate_changes) {
    processPendingChanges(feed);
  }

  // in iteration mode OR in restart mode with no new subjects
  feed.ended = true;
  cleanUp(feed);
  longpollFeeds = _.without(longpollFeeds, feed);
  normalFeeds = _.without(normalFeeds, feed);
  if (write) {
    writeDownstream(feed, JSON.stringify(generateResponse(feed)), true);
  }
};

const generateResponse = feed => {
  if (feed.error) {
    return {
      error: 'Error processing your changes'
    };
  }

  return {
    results: feed.results,
    last_seq: feed.lastSeq
  };
};

// any doc ID should only appear once in the changes feed, with a list of changed revs attached to it
const appendChange = (results, changeObj, forceSeq = false) => {
  const result = _.find(results, { id: changeObj.id });
  if (!result) {
    const change = JSON.parse(JSON.stringify(changeObj.change));

    // PouchDB (7.0.0) will pick the seq of the last change in a batch or the last_seq of the whole result to update
    // the Checkpointer doc. It also uses this seq as a since param in the next changes request, to fix
    // https://github.com/pouchdb/pouchdb/issues/6809
    // When batching, because we don't know how far along our whole changes feed we are,
    // we push these changes to our normal feeds every time, even if they are out of place,
    // to avoid the possibility of them being skipped.
    // Therefore, their seq is changed to equal the feed's last change seq to avoid PouchDB setting a Checkpointer
    // with a future seq and to use a correct seq when requesting the next batch of changes.
    if (forceSeq) {
      change.seq = forceSeq;
    }

    return results.push(change);
  }

  // append missing revs to the list
  _.difference(changeObj.change.changes.map(rev => rev.rev), result.changes.map(rev => rev.rev))
    .forEach(rev => result.changes.push({ rev: rev }));

  // add the deleted flag, if needed
  if (changeObj.change.deleted) {
    result.deleted = changeObj.change.deleted;
  }
};

// appends allowed `changes` to feed `results`
const processPendingChanges = (feed, forceSeq = false) => {
  authorization
    .filterAllowedDocs(feed, feed.pendingChanges)
    .forEach(changeObj => appendChange(feed.results, changeObj, forceSeq));
};

// returns true if an authorization change is found
const hasAuthorizationChange = (feed) => {
  return feed.pendingChanges.some(changeObj => {
    return authorization.isAuthChange(changeObj.id, feed.req.userCtx, changeObj.viewResults);
  });
};

const generateTombstones = results => {
  results.forEach((change, idx) => {
    // tombstone changes are converted into their corresponding doc changes
    if (tombstoneUtils.isTombstoneId(change.id)) {
      results[idx] = tombstoneUtils.generateChangeFromTombstone(change);
    }
  });
};

const writeDownstream = (feed, content, end) => {
  if (feed.res.finished) {
    return;
  }
  if (feed.error && !feed.res.headersSent) {
    feed.res.status(500);
  }
  feed.res.write(content);
  feed.res.flush();
  if (end) {
    feed.res.end();
  }
};

const resetFeed = feed => {
  clearTimeout(feed.timeout);

  Object.assign(feed, {
    pendingChanges: [],
    results: [],
    lastSeq: feed.initSeq,
    hasNewSubjects: false
  });
};

// converts previous longpoll feed back to a normal feed when it receives new allowed subjects
const restartNormalFeed = feed => {
  longpollFeeds = _.without(longpollFeeds, feed);
  normalFeeds.push(feed);

  resetFeed(feed);

  return authorization
    .getAllowedDocIds(feed)
    .then(allowedDocIds => {
      feed.allowedDocIds = allowedDocIds;
      return filterPurgedIds(feed);
    })
    .then(() => {
      getChanges(feed);
    });
};

const getChanges = feed => {
  const options = { return_docs: true };
  Object.assign(options, _.pick(feed.req.query, 'since', 'style', 'conflicts'));

  // Prior to version 2.3.0, CouchDB had a bug where requesting _changes filtered by _doc_ids and using limit
  // would yield an incorrect `last_seq`, resulting in overall incomplete changes.
  // `limitChangesRequests` should only be true when CouchDB version is gte 2.3.0
  if (limitChangesRequests && feed.req.query.limit) {
    options.limit = feed.req.query.limit;
  }

  options.doc_ids = feed.allowedDocIds;
  options.since = options.since || 0;

  // Overwrite the default batch_size is 25. By setting it larger than the
  // doc_ids length we ensure that batching is disabled which works around
  // a bug where batching sometimes skips changes between batches.
  options.batch_size = feed.allowedDocIds.length + 1;

  feed.upstreamRequest = db.medic.changes(options);

  return feed.upstreamRequest
    .then(response => {
      const results = response && response.results;
      // if the response was incomplete
      if (!results) {
        feed.lastSeq = feed.initSeq;
        feed.results = [];
        // if the request was canceled on purpose, end the feed
        if (response && response.status === 'cancelled') {
          return endFeed(feed);
        }
        // retry if malformed response
        return getChanges(feed);
      }

      // Fixes race condition where a new doc is added while the changes feed is active,
      // but our continuousFeed listener receives the change after the response has been sent.
      // When receiving empty results, PouchDB considers replication to be complete and
      // uses reponse.last_seq to write it's checkpointer doc.
      // By not advancing the checkpointer seq past our last change, we make sure these docs will be retrieved
      // in the next replication attempt.
      feed.lastSeq = results.length ? results[results.length - 1].seq : feed.currentSeq;

      generateTombstones(results);
      feed.results = results;

      if (hasAuthorizationChange(feed)) {
        // if authorization changes are received, reset the request, refreshing user settings
        return reauthorizeRequest(feed);
      }

      processPendingChanges(feed, limitChangesRequests && feed.lastSeq);

      if (feed.results.length || !isLongpoll(feed.req)) {
        // send response downstream
        return endFeed(feed);
      }

      // move the feed to the longpoll list to receive new changes
      normalFeeds = _.without(normalFeeds, feed);
      longpollFeeds.push(feed);
    })
    .catch(err => {
      logger.info(`${feed.id} Error while requesting 'normal' changes feed`);
      logger.info(err);
      // cancel ongoing requests and send error response
      feed.upstreamRequest.cancel();
      feed.error = err;
      endFeed(feed);
    });
};

const initFeed = (req, res) => {
  const changesControllerConfig = config.get('changes_controller') || {
    reiterate_changes: true,
    changes_limit: 100,
    debounce_interval: 200
  };

  const feed = {
    id: req.id || uuid(),
    req: req,
    res: res,
    initSeq: req.query && req.query.since || 0,
    lastSeq: req.query && req.query.since || currentSeq,
    currentSeq: currentSeq,
    pendingChanges: [],
    results: [],
    limit: req.query && req.query.limit || changesControllerConfig.changes_limit,
    reiterate_changes: changesControllerConfig.reiterate_changes,
    initialReplication: req.query && req.query.initial_replication
  };

  if (changesControllerConfig.debounce_interval) {
    feed.debounceEnd = _.debounce(() => endFeed(feed, true, true), changesControllerConfig.debounce_interval);
  }

  defibrillator(feed);
  addTimeout(feed);
  normalFeeds.push(feed);
  req.on('close', () => endFeed(feed, false));

  return authorization
    .getAuthorizationContext(feed.req.userCtx)
    .then(authorizationContext => {
      Object.assign(feed, authorizationContext);
      return authorization.getAllowedDocIds(feed, { includeTombstones: !feed.initialReplication });
    })
    .then(allowedDocIds => {
      feed.allowedDocIds = allowedDocIds;
      return filterPurgedIds(feed);
    })
    .then(() => {
      if (feed.req.userCtx && feed.req.userCtx.name) {
        replicationLimitLog.put(feed.req.userCtx.name, feed.allowedDocIds.length);
      }

      return feed;
    });
};

const filterPurgedIds = feed => {
  return purgedDocs
    .getUnPurgedIds(feed.userCtx.roles, feed.allowedDocIds)
    .then(unPurgedIds => {
      feed.allowedDocIds = unPurgedIds;
    });
};

const processRequest = (req, res) => {
  return initFeed(req, res)
    .then(feed => {
      // don't return promise - could be a longpoll request
      getChanges(feed);
    });
};

// restarts the request, refreshing user-settings
const reauthorizeRequest = feed => {
  endFeed(feed, false);
  return auth
    .getUserSettings(feed.req.userCtx)
    .then(userCtx => {
      feed.req.userCtx = userCtx;
      processRequest(feed.req, feed.res).catch(err => {
        feed.upstreamRequest.cancel();
        feed.error = err;
        endFeed(feed);
      });
    });
};

const addChangeToLongpollFeed = (feed, changeObj) => {
  appendChange(feed.results, changeObj);
  feed.cancelDebouncedEnd = false;

  if (feed.debounceEnd && --feed.limit) {
    // debounce sending results if the feed limit is not yet reached
    clearTimeout(feed.timeout);
    feed.debounceEnd();
    return;
  }

  endFeed(feed);
};

const processChange = (change, seq) => {
  const changeObj = {
    change: tombstoneUtils.isTombstoneId(change.id) ? tombstoneUtils.generateChangeFromTombstone(change) : change,
    viewResults: authorization.getViewResults(change.doc),
    get id() {
      return this.change.id;
    }
  };
  delete change.doc;

  // inform the normal feeds that a change was received while they were processing
  normalFeeds.forEach(feed => feed.pendingChanges.push(changeObj));

  // send the change through to the longpoll feeds which are allowed to see it
  longpollFeeds.forEach(feed => {
    feed.lastSeq = seq;
    const allowed = authorization.allowedDoc(changeObj.id, feed, changeObj.viewResults);
    const newSubjects = authorization.updateContext(allowed, feed, changeObj.viewResults);

    if (!allowed) {
      return feed.reiterate_changes && feed.pendingChanges.push(changeObj);
    }

    if (authorization.isAuthChange(changeObj.id, feed.req.userCtx, changeObj.viewResults)) {
      return reauthorizeRequest(feed);
    }

    feed.hasNewSubjects = feed.hasNewSubjects || newSubjects;
    addChangeToLongpollFeed(feed, changeObj);
  });
};

const initContinuousFeed = since => {
  continuousFeed = db.medic
    .changes({
      live: true,
      include_docs: true,
      return_docs: false,
      since: since || 'now',
      timeout: false,
    })
    .on('change', (change, pending, seq) => {
      processChange(change, seq);
      currentSeq = seq;
    })
    .on('error', () => {
      continuousFeed.cancel();
      initContinuousFeed(currentSeq);
    });
};

const initServerChecks = () => {
  return serverChecks
    .getCouchDbVersion(environment.serverUrl)
    .then(shouldLimitChangesRequests);
};

const shouldLimitChangesRequests = couchDbVersion => {
  // Prior to version 2.3.0, CouchDB had a bug where requesting _changes filtered by _doc_ids and using limit
  // would yield an incorrect `last_seq`, resulting in overall incomplete changes.
  const MIN_COUCH_VERSION_FOR_LIMITING_CHANGES = '2.3.0';
  limitChangesRequests = semver.valid(couchDbVersion) ?
    semver.lte(MIN_COUCH_VERSION_FOR_LIMITING_CHANGES, couchDbVersion) :
    false;
};

const initCurrentSeq = () => db.medic.info().then(info => currentSeq = info.update_seq);

const init = () => {
  if (!inited) {
    inited = true;
    initContinuousFeed();
    return Promise.all([
      initCurrentSeq(),
      initServerChecks()
    ]);
  }

  return Promise.resolve();
};

const request = (req, res) => {
  res.type('json');
  return init()
    .then(() => processRequest(req, res))
    .catch(err => serverUtils.error(err, req, res));
};

module.exports = {
  request: request,
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  Object.assign(module.exports, {
    _init: init,
    _initFeed: initFeed,
    _processChange: processChange,
    _writeDownstream: writeDownstream,
    _processPendingChanges: processPendingChanges,
    _appendChange: appendChange,
    _generateTombstones: generateTombstones,
    _hasAuthorizationChange: hasAuthorizationChange,
    _generateResponse: generateResponse,
    _reset: () => {
      longpollFeeds = [];
      normalFeeds = [];
      inited = false;
      currentSeq = 0;
      limitChangesRequests = null;
    },
    _getNormalFeeds: () => normalFeeds,
    _getLongpollFeeds: () => longpollFeeds,
    _getCurrentSeq: () => currentSeq,
    _inited: () => inited,
    _getContinuousFeed: () => continuousFeed,
    _shouldLimitChangesRequests: shouldLimitChangesRequests,
    _getLimitChangesRequests: () => limitChangesRequests
  });
}
