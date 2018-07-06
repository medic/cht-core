const auth = require('../auth'),
      db = require('../db-pouch'),
      authorization = require('../services/authorization'),
      _ = require('underscore'),
      heartbeatFilter = require('../services/heartbeat-filter'),
      dbConfig = require('../services/db-config'),
      tombstoneUtils = require('@shared-libs/tombstone-utils'),
      uuid = require('uuid/v4'),
      config = require('../config'),
      DEFAULT_MAX_DOC_IDS = 100;

let inited = false,
    continuousFeed = false,
    longpollFeeds = [],
    normalFeeds = [],
    currentSeq = 0,
    MAX_DOC_IDS;

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

  if (feed.upstreamRequests && feed.upstreamRequests.length) {
    feed.upstreamRequests.forEach(request => request.cancel());
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

const generateResponse = feed => ({
  results: feed.results,
  last_seq: feed.lastSeq
});

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

// checks that all changes requests responses are valid
const validResults = responses => {
  return responses.every(response => response && response.results);
};

const canceledResults = responses => {
  return responses.find(response => response && response.status === 'cancelled');
};

const mergeResults = responses => {
  let results = [];
  if (responses.length === 1) {
    results = responses[0].results;
  } else {
    responses.forEach(response => {
      results.push.apply(results, response.results);
    });
  }
  results.forEach((change, idx) => {
    // tombstone changes are converted into their corresponding doc changes
    if (tombstoneUtils.isTombstoneId(change.id)) {
      results[idx] = tombstoneUtils.generateChangeFromTombstone(change);
    }
  });

  return results;
};

const writeDownstream = (feed, content, end) => {
  if (feed.res.finished) {
    return;
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
    chunkedAllowedDocIds: false,
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
  const options = {
    since: feed.req.query && feed.req.query.since || 0,
    batch_size: MAX_DOC_IDS // PouchDB parameter
  };
  _.extend(options, _.pick(feed.req.query, 'style', 'conflicts', 'seq_interval'));

  feed.chunkedAllowedDocIds = feed.chunkedAllowedDocIds || split(feed.allowedDocIds, MAX_DOC_IDS);
  feed.upstreamRequests = feed.chunkedAllowedDocIds.map(docIds => {
    return db.medic
      .changes(_.extend({ doc_ids: docIds }, options))
      .on('complete', info => feed.lastSeq = info && info.last_seq || feed.lastSeq);
  });

  return Promise
    .all(feed.upstreamRequests)
    .then(responses => {
      // if any of the responses was incomplete
      if (!validResults(responses)) {
        feed.lastSeq = feed.initSeq;
        feed.results = [];
        // if the request was canceled on purpose, end the feed
        if (canceledResults(responses)) {
          return endFeed(feed);
        }
        // retry if malformed response
        return getChanges(feed);
      }

      feed.results = mergeResults(responses);
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
      console.log(feed.id +  ' Error while requesting `normal` changes feed');
      console.log(err);
      // cancel ongoing requests and restart
      feed.upstreamRequests.forEach(request => request.cancel());
      getChanges(feed);
    });
};

const initFeed = (req, res) => {
  const feed = {
    id: req.uniqId || uuid(),
    req: req,
    res: res,
    initSeq: req.query && req.query.since || 0,
    lastSeq: req.query && req.query.since || currentSeq,
    pendingChanges: [],
    results: [],
    upstreamRequests: [],
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

const getCouchDbConfig = () => {
  // As per https://issues.apache.org/jira/browse/COUCHDB-1288, there is a 100 doc
  // limit on processing changes feeds with the _doc_ids filter within a
  // reasonable amount of time.
  // While hardcoded at first, CouchDB 2.1.1 has the option to configure this value
  return dbConfig.get('couchdb', 'changes_doc_ids_optimization_threshold')
    .catch(err => {
      console.log('Could not read changes_doc_ids_optimization_threshold config value.');
      console.log(err);
      return DEFAULT_MAX_DOC_IDS;
    })
    .then(value => {
      MAX_DOC_IDS = value;
    });
};

const init = () => {
  if (inited) {
    return Promise.resolve();
  }
  inited = true;

  return getCouchDbConfig().then(() => initContinuousFeed());
};

const request = (req, res) => {
  return init().then(() => {
    res.type('json');
    return processRequest(req, res);
  });
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
    _mergeResults: mergeResults,
    _hasAuthorizationChange: hasAuthorizationChange,
    _split: split,
    _reset: () => {
      longpollFeeds = [];
      normalFeeds = [];
      inited = false;
      currentSeq = 0;
      MAX_DOC_IDS = DEFAULT_MAX_DOC_IDS;
    },
    _getNormalFeeds: () => normalFeeds,
    _getLongpollFeeds: () => longpollFeeds,
    _getCurrentSeq: () => currentSeq,
    _getMaxDocIds: () => MAX_DOC_IDS,
    _inited: () => inited,
    _getContinuousFeed: () => continuousFeed
  });
}
