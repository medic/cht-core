const auth = require('../auth'),
      db = require('../db-pouch'),
      authorization = require('../services/authorization'),
      _ = require('underscore'),
      serverUtils = require('../server-utils'),
      heartbeatFilter = require('../services/heartbeat-filter'),
      tombstoneUtils = require('@shared-libs/tombstone-utils'),
      uuid = require('uuid/v4'),
      DEFAULT_MAX_DOC_IDS = 100;

let inited = false,
    continuousFeed = false,
    longpollFeeds = [],
    normalFeeds = [],
    MAX_DOC_IDS = DEFAULT_MAX_DOC_IDS,
    currentSeq = 0;

const DEFAULT_LIMIT = 100,
      DEBOUNCE_INTERVAL = 200,
      { COUCH_NODE_NAME, COUCH_URL } = process.env;

const split = (array, count) => {
  if (count === null || count < 1) {
    return [array];
  }
  const result = [];
  while (array.length) {
    result.push(array.splice(0, count));
  }
  return result;
};

const cleanUp = feed => {
  if (feed.heartbeat) {
    clearInterval(feed.heartbeat);
  }
  if (feed.timeout) {
    clearTimeout(feed.timeout);
  }
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
  if (feed.timeout) {
    clearTimeout(feed.timeout);
  }
  if (feed.req.query && feed.req.query.timeout) {
    feed.timeout = setTimeout(() => endFeed(feed), feed.req.query.timeout);
  }
};

const generateResponse = feed => ({
  results: feed.results,
  last_seq: feed.lastSeq
});

const endFeed = (feed, write = true) => {
  if (feed.ended) {
    return;
  }

  feed.ended = true;
  cleanUp(feed);
  longpollFeeds = _.without(longpollFeeds, feed);
  normalFeeds = _.without(normalFeeds, feed);
  if (write) {
    writeDownstream(feed, JSON.stringify(generateResponse(feed)), true);
  }
};

// any doc ID should only appear once in the changes feed, with a list of changed revs attached to it
const appendChange = (results, changeObj) => {
  const result = _.findWhere(results, { id: changeObj.change.id });
  if (!result) {
    return results.push(_.omit(changeObj.change, 'doc'));
  }

  // append missing revs to the list
  _.difference(changeObj.change.changes.map(rev => rev.rev), result.changes.map(rev => rev.rev))
    .forEach(rev => result.changes.push({ rev: rev }));
};

// filters the list of pending changes, appending the allowed ones
// returns whether a user authorization change was detected and the number of changes appended
const processPendingChanges = (feed, results, checkForAuthChange = true) => {
  let authChange  = false,
      shouldCheck = true,
      nbrAppended = 0;

  const checkChange = (changeObj) => {
    if (!authorization.allowedDoc(changeObj.change.doc, feed, changeObj.viewResults)) {
      return;
    }

    if (checkForAuthChange && authorization.isAuthChange(changeObj.change.doc, feed.userCtx)) {
      authChange = true;
      return;
    }

    shouldCheck = true;
    nbrAppended++;
    appendChange(results, changeObj);
    feed.pendingChanges = _.without(feed.pendingChanges, changeObj);
  };

  while (feed.pendingChanges.length && shouldCheck && !authChange) {
    shouldCheck = false;
    feed.pendingChanges.forEach(checkChange);
  }

  return { authChange, nbrAppended };
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
  if (end) {
    feed.res.end();
  }
};

const getChanges = feed => {
  // impose limit to insure that we're getting all changes available for each of the requested doc ids
  const options = {
    since: feed.req.query && feed.req.query.since || 0,
    limit: MAX_DOC_IDS
  };
  _.extend(options, _.pick(feed.req.query, 'style', 'conflicts', 'seq_interval'));

  if (!feed.chunkedAllowedDocIds) {
    feed.chunkedAllowedDocIds = split(feed.allowedDocIds, MAX_DOC_IDS);
  }
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
        return Promise.resolve(getChanges(feed));
      }

      let results = mergeResults(responses);
      if (processPendingChanges(feed, results).authChange) {
        // if critical auth data changes are received, reset the feed completely
        endFeed(feed, false);
        return Promise.resolve(processRequest(feed.req, feed.res, feed.userCtx));
      }

      if (results.length || !isLongpoll(feed.req)) {
        feed.results = results;
        return endFeed(feed);
      }

      // move the feed to the longpoll list to receive new changes
      normalFeeds = _.without(normalFeeds, feed);
      longpollFeeds.push(feed);
    })
    .catch(err => {
      console.log(feed.id +  ' Error while requesting `normal` changes feed');
      console.log(err);
      // cancel ongoing requests
      feed.upstreamRequests.forEach(request => request.cancel());
      return Promise.resolve(getChanges(feed));
    });
};

const processRequest = (req, res, userCtx) => {
  return auth.getUserSettings(userCtx).then(userCtx => {
    initFeed(req, res, userCtx).then(getChanges);
  });
};

const initFeed = (req, res, userCtx) => {
  const feed = {
    id: req.uniqId || uuid(),
    req: req,
    res: res,
    userCtx: userCtx,
    initSeq: req.query && req.query.since || 0,
    lastSeq: req.query && req.query.since || currentSeq,
    pendingChanges: [],
    results: [],
    upstreamRequests: [],
    limit: req.query && req.query.limit || DEFAULT_LIMIT,
  };

  feed.debounceEnd = _.debounce(_.partial(endFeed, feed), DEBOUNCE_INTERVAL);

  defibrillator(feed);
  addTimeout(feed);
  normalFeeds.push(feed);
  req.on('close', () => endFeed(feed, false));

  return authorization
    .getFeedAuthData(userCtx)
    .then(authData => {
      _.extend(feed, authData);
      return authorization.getAllowedDocIds(feed);
    })
    .then(allowedDocIds => {
      feed.allowedDocIds = allowedDocIds;
      return feed;
    });
};

const addChangeToLongpollFeed = (feed, changeObj) => {
  appendChange(feed.results, changeObj);
  // check if this newly added change would update the auth state on any of the previous denied changes
  feed.limit -= processPendingChanges(feed, feed.results, false).nbrAppended + 1;

  if (feed.limit) {
    // debounce sending results if the feed limit is not yet reached
    addTimeout(feed);
    feed.debounceEnd();
    return;
  }

  endFeed(feed);
};

const processChange = (change, seq) => {
  const changeObj = {
    change: tombstoneUtils.isTombstoneId(change.id) ? tombstoneUtils.generateChangeFromTombstone(change, true) : change,
    viewResults: authorization.getViewResults(change.doc)
  };

  // inform the normal feeds that a change was received while they were processing
  normalFeeds.forEach(feed => {
    feed.lastSeq = seq;
    feed.pendingChanges.push(changeObj);
  });

  // send the change through to the longpoll feeds which are allowed to see it
  longpollFeeds.forEach(feed => {
    feed.lastSeq = seq;
    if (!authorization.allowedDoc(changeObj.change.doc, feed, changeObj.viewResults)) {
      feed.pendingChanges.push(changeObj);
      return;
    }

    if (authorization.isAuthChange(changeObj.change.doc, feed.userCtx)) {
      endFeed(feed, false);
      processRequest(feed.req, feed.res, feed.userCtx);
      return;
    }

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
      Promise.resolve().then(() => {
        continuousFeed = initContinuousFeed(currentSeq);
      });
    });
};

const getConfig = () => {
  // As per https://issues.apache.org/jira/browse/COUCHDB-1288, there is a 100 doc
  // limit on processing changes feeds with the _doc_ids filter within a
  // reasonable amount of time.
  // While hardcoded at first, CouchDB 2.1.1 has the option to configure this value
  return db.medic.info()
    .then(info => {
      currentSeq = info.update_seq;
      const url = COUCH_URL.slice(0, COUCH_URL.lastIndexOf(info.db_name)) +
                  `_node/${COUCH_NODE_NAME}/_config/couchdb/changes_doc_ids_optimization_threshold`;
      return new Promise((resolve, reject) => {
        db.medic._ajax({ url: url }, (err, value) => {
          if (err) {
            console.log('Could not read changes_doc_ids_optimization_threshold config value.');
            return reject(err);
          }
          MAX_DOC_IDS = value;
          resolve();
        });
      });
    })
    .catch(err => {
      console.log('Could not read DB info');
      console.log(err);
      MAX_DOC_IDS = DEFAULT_MAX_DOC_IDS;
    });
};

const init = () => {
  if (inited) {
    return Promise.resolve();
  }

  return getConfig().then(() => {
    initContinuousFeed();
    inited = true;
  });
};

const request = (proxy, req, res) => {
  return init().then(() => {
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        if (isLongpoll(req)) {
          // Disable nginx proxy buffering to allow hearbeats for long-running feeds
          // Issue: #2363
          res.setHeader('X-Accel-Buffering', 'no');
        }

        if (auth.isAdmin(userCtx)) {
          return proxy.web(req, res);
        }
        res.type('json');
        return processRequest(req, res, userCtx);
      })
      .catch(() => serverUtils.notLoggedIn(req, res));
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
    _getContinuousFeed: () => continuousFeed,
  });
}
