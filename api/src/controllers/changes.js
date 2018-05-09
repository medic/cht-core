const auth = require('../auth'),
      db = require('../db-pouch'),
      authorization = require('../services/authorization'),
      _ = require('underscore'),
      config = require('../config'),
      serverUtils = require('../server-utils'),
      heartbeatFilter = require('../services/heartbeat-filter'),
      tombstoneUtils = require('@shared-libs/tombstone-utils')(db.medic, Promise),
      uuid = require('uuid/v4');

let inited        = false,
    continuousFeed = false,
    longpollFeeds = [],
    normalFeeds   = [],
    MAX_DOC_IDS   = 100,
    currentSeq    = 0;

const DEFAULT_TIMEOUT = 60000,
      DEFAULT_LIMIT = 100,
      DEBOUNCE_INTERVAL = 200;

const split = (array, count) => {
  if (count === null || count < 1) {
    return array;
  }
  const result = [];
  let i = 0,
      length = array.length;
  while (i < length) {
    result.push(array.slice(i, i += count));
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

  const timeout = (feed.req.query && feed.req.query.timeout) ?
    Math.min(DEFAULT_TIMEOUT, feed.req.query.timeout) : DEFAULT_TIMEOUT;
  feed.timeout = setTimeout(() => endFeed(feed), timeout);
};

const prepareResponse = feed => ({
  results: feed.results,
  last_seq: feed.lastSeq
});

const endFeed = feed => {
  cleanUp(feed);
  writeDownstream(feed, JSON.stringify(prepareResponse(feed)), true);
  longpollFeeds = _.reject(longpollFeeds, feed);
  normalFeeds = _.reject(normalFeeds, feed);
};

// any doc ID should only appear once in the changes feed, with a list of changed revs attached to it
const appendChange = (results, changeObj) => {
  const result = _.findWhere(results, { id: changeObj.change.id });
  if (!result) {
    return results.push(changeObj.change);
  }

  // append missing revs to the list
  _.difference(changeObj.change.changes.map(rev => rev.rev), result.changes.map(rev => rev.rev))
    .forEach(rev => result.changes.push({ rev: rev }));
};

// filters the list of pending changes
const processPendingChanges = (feed, results) => {
  feed.pendingChanges
    .filter(changeObj => authorization.isAllowedFeed(feed, changeObj))
    .forEach(changeObj => appendChange(results, changeObj));
};

// checks that all changes requests responses are correct
const validResults = responses => {
  return responses.every(response => response && response.results);
};

const mergeResults = responses => {
  let results = [];
  responses.forEach(response => {
    results.push.apply(results, response.results);
  });
  results.forEach((change, idx) => {
    if (tombstoneUtils.isTombstoneId(change.id)) {
      results[idx] = tombstoneUtils.generateChangeFromTombstone(change);
    }
  });

  return results;
};

const getChanges = feed => {
  // impose limit to insure that we're getting all changes available for each of the requested doc ids
  const options = {
    since: feed.req.query && feed.req.query.since || 0,
    limit: MAX_DOC_IDS
  };
  const queryOpts = ['style', 'conflicts', 'seq_interval'];
  _.extend(options, _.pick(feed.req.query, ...queryOpts));

  const chunks = split(feed.validatedIds, MAX_DOC_IDS);
  feed.upstreamRequests = chunks.map(docIds => {
    return db.medic
      .changes(_.extend({ doc_ids: docIds }, options))
      .on('complete', info => feed.lastSeq = info && info.last_seq || feed.lastSeq);
  });

  return Promise
    .all(feed.upstreamRequests)
    .then(responses => {
      // if any of the responses was incomplete, send empty response
      if (!validResults(responses)) {
        feed.results = [];
        feed.lastSeq = feed.initSeq;
        return endFeed(feed);
      }

      let results = mergeResults(responses);
      processPendingChanges(feed, results);

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
      getChanges(feed);
    });
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

const addChangeToLongpollFeed = (feed, changeObj) => {
  appendChange(feed.results, changeObj);

  if (--feed.limit) {
    // debounce sending results if the feed limit is not yet reached
    addTimeout(feed);
    feed.debounceEnd();
    return;
  }

  endFeed(feed);
};

const initFeed = (req, res, userCtx) => {
  const feed = {
    id: req.uniqId || uuid(),
    req: req,
    res: res,
    userCtx: userCtx,
    depth: authorization.getDepth(userCtx),
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
  req.on('close', () => cleanUp(feed));

  return authorization
    .getSubjectIds(feed.userCtx)
    .then(subjectIds => {
      return authorization
        .getValidatedDocIds(subjectIds, feed.userCtx)
        .then(validatedIds => _.extend(feed, { subjectIds: subjectIds, validatedIds: validatedIds }));
    });
};

const processChange = (change, seq) => {
  let changeObj;
  if (tombstoneUtils.isTombstoneId(change.id)) {
    changeObj = {
      change: tombstoneUtils.generateChangeFromTombstone(change),
      authData: authorization.getViewResults(tombstoneUtils.extractDoc(change.doc))
    };
  } else {
    changeObj = {
      change: change,
      authData: authorization.getViewResults(change.doc)
    };
  }
  // inform the normal changes feed that a change was received while they were processing
  normalFeeds.forEach(feed => {
    feed.lastSeq = seq;
    feed.pendingChanges.push(changeObj);
  });

  // send the change through to the longpoll feeds which are allowed to see it
  longpollFeeds.forEach(feed => {
    feed.lastSeq = seq;
    if (!authorization.isAllowedFeed(feed, changeObj)) {
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

const init = () => {
  if (inited) {
    return;
  }
  // As per https://issues.apache.org/jira/browse/COUCHDB-1288, there is a 100 doc
  // limit on processing changes feeds with the _doc_ids filter within a
  // reasonable amount of time.
  // While hardcoded at first, CouchDB 2.1.1 has the option to configure this value
  // https://github.com/apache/couchdb/commit/e09b8074fec59a508905b700c5252df7eb5b5338
  MAX_DOC_IDS = config.get('changes_doc_ids_optimization_threshold') || MAX_DOC_IDS;
  db.medic.setMaxListeners(100);
  initContinuousFeed();
  inited = true;
};

const request = (proxy, req, res) => {
  init();

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

      return auth
        .hydrate(userCtx)
        .then(userCtx => {
          res.type('json');
          initFeed(req, res, userCtx).then(getChanges);
        });
    })
    .catch(() => serverUtils.notLoggedIn(req, res));
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
    _tombstoneUtils: tombstoneUtils,
    _: _,

    _reset: () => {
      longpollFeeds = [];
      normalFeeds = [];
      inited = false;
      currentSeq = 0;
      MAX_DOC_IDS = 100;
    },
    _getNormalFeeds: () => normalFeeds,
    _getLongpollFeeds: () => longpollFeeds,
    _getCurrentSeq: () => currentSeq,
    _inited: () => inited,
    _getContinuousFeed: () => continuousFeed,
  });
}
