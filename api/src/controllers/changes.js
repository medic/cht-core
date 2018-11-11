const auth = require('../auth'),
      db = require('../db-pouch'),
      authorization = require('../services/authorization'),
      _ = require('underscore'),
      heartbeatFilter = require('../services/heartbeat-filter'),
      tombstoneUtils = require('@shared-libs/tombstone-utils'),
      uuid = require('uuid/v4'),
      config = require('../config'),
      logger = require('../logger');

let inited = false,
    continuousFeed = false,
    longpollFeeds = [],
    normalFeeds = [],
    currentSeq = 0;

const split = (array, count) => {
  count = Number.parseInt(count);
  if (Number.isNaN(count) || count < 1) {
    return [array];
  }
  const result = [];
  while (array.length) {
    result.push(array.splice(0, count));
  }
  return result;
};

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
const appendChange = (results, changeObj) => {
  const result = _.findWhere(results, { id: changeObj.id });
  if (!result) {
    return results.push(JSON.parse(JSON.stringify(changeObj.change)));
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
    .forEach(changeObj => appendChange(feed.results, changeObj));
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

  _.extend(feed, {
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
      getChanges(feed);
  });
};

const getChanges = feed => {
  const options = { return_docs: true };
  _.extend(options, _.pick(feed.req.query, 'since', 'style', 'conflicts', 'seq_interval'));
  options.doc_ids = feed.allowedDocIds;
  options.since = options.since || 0;

  // Overwrite the default batch_size is 25. By setting it larger than the
  // doc_ids length we ensure that batching is disabled which works around
  // a bug where batching sometimes skips changes between batches.
  options.batch_size = feed.allowedDocIds.length + 1;

  feed.upstreamRequest = db.medic.changes(options).on('complete', info => {
    feed.lastSeq = info && info.last_seq || feed.lastSeq;
  });

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

      generateTombstones(results);
      feed.results = results;

      if (hasAuthorizationChange(feed)) {
        // if authorization changes are received, reset the request, refreshing user settings
        return reauthorizeRequest(feed);
      }

      processPendingChanges(feed);

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
  const feed = {
    id: req.id || uuid(),
    req: req,
    res: res,
    initSeq: req.query && req.query.since || 0,
    lastSeq: req.query && req.query.since || currentSeq,
    pendingChanges: [],
    results: [],
    limit: req.query && req.query.limit || config.get('changes_controller').changes_limit,
    reiterate_changes: config.get('changes_controller').reiterate_changes
  };

  if (config.get('changes_controller').debounce_interval) {
    feed.debounceEnd = _.debounce(() => endFeed(feed, true, true), config.get('changes_controller').debounce_interval);
  }

  defibrillator(feed);
  addTimeout(feed);
  normalFeeds.push(feed);
  req.on('close', () => endFeed(feed, false));

  return authorization
    .getAuthorizationContext(feed.req.userCtx)
    .then(authorizationContext => {
      _.extend(feed, authorizationContext);
      return authorization.getAllowedDocIds(feed);
    })
    .then(allowedDocIds => {
      feed.allowedDocIds = allowedDocIds;
      return feed;
    });
};

const processRequest = (req, res) => {
  initFeed(req, res).then(getChanges);
};

// restarts the request, refreshing user-settings
const reauthorizeRequest = feed => {
  endFeed(feed, false);
  return auth
    .getUserSettings(feed.req.userCtx)
    .then(userCtx => {
      feed.req.userCtx = userCtx;
      processRequest(feed.req, feed.res);
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
  normalFeeds.forEach(feed => {
    feed.lastSeq = seq;
    feed.pendingChanges.push(changeObj);
  });

  // send the change through to the longpoll feeds which are allowed to see it
  longpollFeeds.forEach(feed => {
    feed.lastSeq = seq;
    const allowed = authorization.allowedDoc(changeObj.id, feed, changeObj.viewResults),
          newSubjects = authorization.updateContext(allowed, feed, changeObj.viewResults);

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

const init = () => {
  if (!inited) {
    inited = true;
    initContinuousFeed();
  }
};

const request = (req, res) => {
  init();
  res.type('json');
  processRequest(req, res);
};

module.exports = {
  request: request,
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _init: init,
    _initFeed: initFeed,
    _processChange: processChange,
    _writeDownstream: writeDownstream,
    _processPendingChanges: processPendingChanges,
    _appendChange: appendChange,
    _generateTombstones: generateTombstones,
    _hasAuthorizationChange: hasAuthorizationChange,
    _generateResponse: generateResponse,
    _split: split,
    _reset: () => {
      longpollFeeds = [];
      normalFeeds = [];
      inited = false;
      currentSeq = 0;
    },
    _getNormalFeeds: () => normalFeeds,
    _getLongpollFeeds: () => longpollFeeds,
    _getCurrentSeq: () => currentSeq,
    _inited: () => inited,
    _getContinuousFeed: () => continuousFeed
  });
}
