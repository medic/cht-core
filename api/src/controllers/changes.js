const auth = require('../auth');
const db = require('../db');
const authorization = require('../services/authorization');
const _ = require('lodash');
const heartbeatFilter = require('../services/heartbeat-filter');
const tombstoneUtils = require('@medic/tombstone-utils');
const uuid = require('uuid').v4;
const config = require('../config');
const logger = require('../logger');
const serverUtils = require('../server-utils');
const purgedDocs = require('../services/purged-docs');
const replicationLimitLog = require('../services/replication-limit-log');

let inited = false;
let continuousFeed = false;
let changesFeeds = [];
let currentSeq = 0;

const cleanUp = feed => {
  clearInterval(feed.heartbeat);
  clearTimeout(feed.timeout);

  if (feed.upstreamRequest) {
    feed.upstreamRequest.cancel();
  }
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

const endFeed = (feed, write = true) => {
  feed.ended = true;
  cleanUp(feed);
  changesFeeds = _.without(changesFeeds, feed);
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
const processPendingChanges = (feed) => {
  authorization
    .filterAllowedDocs(feed, feed.pendingChanges)
    .forEach(changeObj => appendChange(feed.results, changeObj, feed.lastSeq));
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

const getChanges = feed => {
  const options = { return_docs: true };
  Object.assign(options, _.pick(feed.req.query, 'since', 'style', 'conflicts', 'limit'));

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
      // uses response.last_seq to write it's checkpointer doc.
      // By not advancing the checkpointer seq past our last change, we make sure these docs will be retrieved
      // in the next replication attempt.
      feed.lastSeq = results.length ? results[results.length - 1].seq : feed.currentSeq;

      generateTombstones(results);
      feed.results = results;

      if (hasAuthorizationChange(feed)) {
        // if authorization changes are received, reset the request, refreshing user settings
        return reauthorizeRequest(feed);
      }

      // avoid race condition where the continuous listener receives a change immediately after we ended the feed
      return Promise.resolve().then(() => {
        processPendingChanges(feed);
        return endFeed(feed);
      });
    })
    .catch(err => {
      logger.info(`${feed.id} Error while requesting changes feed`);
      logger.info(err);
      // cancel ongoing requests and send error response
      feed.upstreamRequest.cancel();
      feed.error = err;
      endFeed(feed);
    });
};

const initFeed = (req, res) => {
  const changesControllerConfig = config.get('changes_controller') || {
    changes_limit: 100,
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
    initialReplication: req.query && req.query.initial_replication
  };

  defibrillator(feed);
  addTimeout(feed);
  changesFeeds.push(feed);
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
    .then(feed => getChanges(feed));
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

const processChange = (change) => {
  const changeObj = {
    change: tombstoneUtils.isTombstoneId(change.id) ? tombstoneUtils.generateChangeFromTombstone(change) : change,
    viewResults: authorization.getViewResults(change.doc),
    get id() {
      return this.change.id;
    }
  };
  delete change.doc;

  // inform feeds that a change was received while they were processing
  changesFeeds.forEach(feed => feed.pendingChanges.push(changeObj));
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

const initCurrentSeq = () => db.medic.info().then(info => currentSeq = info.update_seq);

const init = () => {
  if (!inited) {
    inited = true;
    initContinuousFeed();
    return initCurrentSeq();
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
