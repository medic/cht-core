const auth = require('../auth'),
      db = require('../db-pouch'),
      authorization = require('../services/authorization'),
      _ = require('underscore'),
      config = require('../config'),
      serverUtils = require('../server-utils'),
      tombstoneUtils = require('@shared-libs/tombstone-utils');

//todo Alex's heartbeat!
let inited        = false,
    longpollFeeds = [],
    normalFeeds   = [],
    MAX_DOC_IDS   = 100,
    currentSeq;

const cleanUp = (feed) => {
  //console.log(feed.feedId +  ' cleanup');
  if (feed.heartbeat) {
    clearInterval(feed.heartbeat);
  }
  if (feed.timeout) {
    clearTimeout(feed.timeout);
  }
  if (feed.upstreamRequests.length) {
    feed.upstreamRequests.forEach(request => request.cancel());
  }
};

const isLongpoll = (req) => {
  return ['longpoll', 'continuous', 'eventsource'].indexOf(req.query.feed) !== -1;
};

const split = (array, count) => {
  if (count === null || count < 1) {
    return [];
  }
  const result = [];
  let i = 0,
      length = array.length;
  while (i < length) {
    result.push(array.slice(i, i += count));
  }
  return result;
};

const defibrillator = (feed) => {
  if (feed.req.query && feed.req.query.heartbeat) {
    const heartbeat = feed.req.query.heartbeat !== true ? feed.req.query.heartbeat : 9000;
    feed.heartbeat = setInterval(() => module.exports.writeDownstream(feed, '\n'), heartbeat);
  }

  const timeout = feed.req.query.timeout ? Math.min(60000, feed.req.query.timeout) : 60000;
  feed.timeout = setTimeout(() => module.exports.endFeed(feed), timeout);
};

module.exports.endFeed = (feed) => {
  cleanUp(feed);
  module.exports.writeDownstream(feed, JSON.stringify(prepareResponse(feed)), true);
  longpollFeeds = _.reject(longpollFeeds, feed);
  normalFeeds = _.reject(normalFeeds, feed);
};

// any doc ID should only appear once in the changes feed, with a list of changed revs attached to it
module.exports.appendChange = (results, changeObj) => {
  const result = _.findWhere(results, { id: changeObj.change.id });
  if (!result) {
    results.push(changeObj.change);
    return results;
  }
  // append missing revs to the list
  _.difference(changeObj.change.changes.map(rev => rev.rev), result.changes.map(rev => rev.rev))
    .forEach(rev => result.changes.push({ rev: rev }));

  return results;
};

// filters the list of pending changes
module.exports.processPendingChanges = (feed, results) => {
  feed.pendingChanges
    .filter(changeObj => authorization.isAllowedFeed(feed, changeObj))
    .forEach(changeObj => results = module.exports.appendChange(results, changeObj));

  return results;
};

module.exports.mergeResults = (responses) => {
  let results = [];
  responses.forEach(response => results = results.concat(response.results));
  results.forEach((change, idx) => {
    if (tombstoneUtils().isTombstoneId(change.id)) {
      results[idx] = tombstoneUtils().generateChangeFromTombstone(change);
    }
  });

  return results;
};

module.exports.getChanges = (feed) => {
  // impose limit to insure that we're getting all changes available for each of the requested doc ids
  const options = {
    since: feed.req.query.since || 0,
    limit: MAX_DOC_IDS
  };
  const queryOpts = ['style', 'conflicts', 'descending', 'att_encoding_info', 'view', 'include_docs', 'seq_interval'];
  _.extend(options, _.pick(feed.req.query, ...queryOpts));

  const chunks = split(feed.validatedIds, MAX_DOC_IDS);
  feed.upstreamRequests = chunks.map(docIds => {
    return db.medic
      .changes(_.extend({ doc_ids: docIds }, options))
      .on('complete', info => feed.lastSeq = info.lastSeq);
  });

  return Promise
    .all(feed.upstreamRequests)
    .then(responses => {
      let results = module.exports.mergeResults(responses);
      results = module.exports.processPendingChanges(feed, results);

      if (results.length || !isLongpoll(feed.req)) {
        feed.results = results;
        cleanUp(feed);
        return module.exports.writeDownstream(feed, JSON.stringify(prepareResponse(feed)), true);
      }

      // move the feed to the longpoll list to receive new changes
      normalFeeds = _.without(normalFeeds, feed);
      longpollFeeds.push(feed);
    })
    .catch(err => {
      console.log(feed.feedId +  ' Error while requesting `normal` changes feed');
      console.log(err);

      //cancel ongoing requests
      feed.upstreamRequests.forEach(request => request.cancel());
      module.exports.getChanges(feed);
    });
};

module.exports.writeDownstream = (feed, content, end) => {
  if (feed.res.finished) {
    return;
  }
  feed.res.write(content);
  if (end) {
    feed.res.end();
  }
};

const prepareResponse = (feed) => {
  const response = {
    results: feed.results,
    last_seq: feed.lastSeq
  };

  return response;
};

module.exports.debouncedKillFeed = _.debounce(module.exports.endFeed, 200);

module.exports.processChange = (change, seq) => {
  let changeObj;
  if (tombstoneUtils().isTombstoneId(change.id)) {
    changeObj = {
      change: tombstoneUtils().generateChangeFromTombstone(change),
      authData: authorization.getViewResults(tombstoneUtils().extractDoc(change.doc))
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
  // sending responses back through the feed is debounced, so multiple updates are caught
  longpollFeeds.forEach(feed => {
    feed.lastSeq = seq;
    if (!authorization.isAllowedFeed(feed, changeObj)) {
      return;
    }
    module.exports.appendChange(feed.results, changeObj);
    module.exports.debouncedKillFeed(feed);
  });
};

module.exports.init = (since) => {
  inited = true;
  db.medic
    .changes({
      live: true,
      include_docs: true,
      since: since || 'now',
      timeout: false,
      //heartbeat: true
    })
    .on('change', (change, pending, seq) => {
      module.exports.processChange(change, seq);
      currentSeq = seq;
    })
    .on('error', () => {
      module.exports.init(currentSeq);
    });
};

module.exports.initFeed = (feed) => {
  _.extend(feed, {
    depth: authorization.getDepth(feed.userCtx),
    initSeq: currentSeq,
    lastSeq: currentSeq,
    pendingChanges: [],
    results: [],
    upstreamRequests: []
  });

  defibrillator(feed);
  normalFeeds.push(feed);

  return authorization
    .getSubjectIds(feed.userCtx)
    .then(subjectIds => {
      return authorization
        .getValidatedDocIds(subjectIds, feed.userCtx)
        .then(validatedIds => {
          _.extend(feed, { subjectIds: subjectIds, validatedIds: validatedIds });
          return feed;
        });
    });
};

module.exports.request = (proxy, req, res) => {
  if (!inited) {
    // As per https://issues.apache.org/jira/browse/COUCHDB-1288, there is a 100 doc
    // limit on processing changes feeds with the _doc_ids filter within a
    // reasonable amount of time.
    // While hardcoded at first, CouchDB 2.1.1 has the option to configure this value
    MAX_DOC_IDS = config.get('changes_doc_ids_optimization_threshold') || MAX_DOC_IDS;
    module.exports.init();

    db.medic.setMaxListeners(100);
  }
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

      auth
        .hydrate(userCtx)
        .then(userCtx => {
          const feedId = Date.now();
          const feed = { req, res, userCtx, feedId };

          req.on('close', function() {
            cleanUp(feed);
          });

          res.type('json');
          module.exports.initFeed(feed).then(module.exports.getChanges);
        });
    })
    .catch(() => serverUtils.notLoggedIn(req, res));
};
