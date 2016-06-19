var _ = require('underscore'),
    auth = require('../auth'),
    config = require('../config'),
    serverUtils = require('../server-utils'),
    db = require('../db'),
    ALL_KEY = [ '_all' ], // key in the doc_by_place view for records everyone can access
    UNASSIGNED_KEY = [ '_unassigned' ], // key in the doc_by_place view for unassigned records
    inited = false,
    continuousFeeds = [];

var error = function(code, message) {
  return JSON.stringify({ code: code, message: message });
};

var bindViewKeys = function(feed, callback) {
  auth.getFacilityId(feed.req, feed.userCtx, function(err, facilityId) {
    if (err) {
      return callback(err);
    }
    var keys = [ ALL_KEY ];
    if (facilityId) {
      keys.push([ facilityId ]);
    }
    if (config.get('district_admins_access_unallocated_messages') &&
        auth.hasAllPermissions(feed.userCtx, 'can_view_unallocated_data_records')) {
      keys.push(UNASSIGNED_KEY);
    }
    feed.keys = keys;
    callback();
  });
};

var bindValidatedDocIds = function(feed, callback) {
  db.medic.view('medic', 'doc_by_place', { keys: feed.keys }, function(err, viewResult) {
    if (err) {
      return callback(err);
    }
    var ids = _.pluck(viewResult.rows, 'id');
    ids.push('org.couchdb.user:' + feed.userCtx.name);
    feed.validatedIds = ids;
    callback();
  });
};

var bindRequestedIds = function(feed, callback) {
  var ids = [];
  if (feed.req.body && feed.req.body.doc_ids) {
    // POST request
    ids = feed.req.body.doc_ids;
  } else if (feed.req.query && feed.req.query.doc_ids) {
    // GET request
    try {
      ids = JSON.parse(feed.req.query.doc_ids);
    } catch(e) {
      return callback({ code: 400, message: 'Invalid doc_ids param' });
    }
  }
  feed.requestedIds = ids;
  return callback();
};

var defibrillator = function(feed) {
  if (feed.req.query && feed.req.query.heartbeat) {
    feed.heartbeat = setInterval(function() {
      feed.res.write('\n');
    }, feed.req.query.heartbeat);
  }
};

var prepareResponse = function(feed, changes) {
  var rejected = _.reject(changes.results, function(change) {
    return change.deleted || _.contains(feed.validatedIds, change.id);
  });
  if (rejected.length) {
    console.error('User attempting to replicate these docs without permission: ', _.pluck(rejected, 'id'));
    return feed.res.write(error(403, 'Forbidden'));
  }
  feed.res.write(JSON.stringify(changes));
};

var getChanges = function(feed) {
  // we cannot call 'changes' in nano because it only uses GET requests and
  // our query string might be too long for GET
  feed.changesReq = db.request({
    db: db.settings.db,
    path: '_changes',
    qs:  _.pick(feed.req.query, 'timeout', 'style', 'heartbeat', 'since', 'feed', 'limit', 'filter'),
    body: { doc_ids: _.union(feed.requestedIds, feed.validatedIds) },
    method: 'POST'
  }, function(err, changes) {
    if (feed.heartbeat) {
      clearInterval(feed.heartbeat);
    }
    if (err) {
      feed.res.write(error(503, 'Error processing your changes'));
    } else {
      prepareResponse(feed, changes);
    }
    feed.res.end();
    continuousFeeds = _.reject(continuousFeeds, function(feed) {
      return feed.res.finished;
    });
  });
};

var initFeed = function(feed, callback) {
  bindRequestedIds(feed, function(err) {
    if (err) {
      return callback(err);
    }
    bindViewKeys(feed, function(err) {
      if (err) {
        return callback(err);
      }
      bindValidatedDocIds(feed, callback);
    });
  });
};

// returns if it is true that for any document in the feed the user
// should be able to see it AND they don't already
var hasNewApplicableDoc = function(feed, docs) {
  return _.some(docs, function(doc) {
    return !_.contains(feed.validatedIds, doc.id) &&
      _.some(doc.keys, function(key) {
        return !!_.find(feed.keys, function(feedKey) {
          return feedKey[0] === key[0];
        });
      });
  });
};

// WARNING: If updating this function also update the doc_by_place view in lib/views.js
var extractKeysFromDoc = function(doc) {
  if (doc._id === 'resources') {
    return [[ ALL_KEY ]];
  }
  var keys = [];
  var emitPlace = function(place) {
    if (!place) {
      keys.push([ UNASSIGNED_KEY ]);
      return;
    }
    while (place) {
      if (place._id) {
        keys.push([ place._id ]);
      }
      place = place.parent;
    }
  };
  switch (doc.type) {
    case 'data_record':
      var place;
      if (doc.kujua_message === true) {
        // outgoing message
        place = doc.tasks &&
                doc.tasks[0] &&
                doc.tasks[0].messages &&
                doc.tasks[0].messages[0] &&
                doc.tasks[0].messages[0].contact;
      } else {
        // incoming message
        place = doc.contact;
      }
      emitPlace(place);
      break;
    case 'form':
      keys.push([ ALL_KEY ]);
      break;
    case 'clinic':
    case 'district_hospital':
    case 'health_center':
    case 'person':
      emitPlace(doc);
      break;
  }
  return keys;
};

var updateFeeds = function(changes) {
  var modifiedKeys = changes.results.map(function(change) {
    return {
      id: change.id,
      keys: extractKeysFromDoc(change.doc)
    };
  });
  continuousFeeds.forEach(function(feed) {
    // check if new and relevant
    if (hasNewApplicableDoc(feed, modifiedKeys)) {
      if (feed.changesReq) {
        feed.changesReq.abort();
      }
      bindValidatedDocIds(feed, function(err) {
        if (err) {
          return serverUtils.error(err, feed.req, feed.res);
        }
        getChanges(feed);
      });
    }
  });
};

var init = function(since) {
  inited = true;
  var options = {
    since: since || 'now',
    heartbeat: true,
    feed: 'longpoll',
    include_docs: true
  };
  db.medic.changes(options, function(err, changes) {
    if (!err) {
      updateFeeds(changes);
    }
    // use setTimeout to break recursion so stack doesn't blow out
    setTimeout(function() {
      init(changes.last_seq);
    }, 1000);
  });
};

module.exports = {
  request: function(proxy, req, res) {
    if (!inited) {
      init();
    }
    auth.getUserCtx(req, function(err, userCtx) {
      if (err) {
        return serverUtils.error(err, req, res);
      }
      if (auth.hasAllPermissions(userCtx, 'can_access_directly') ||
          (req.query.filter === '_doc_ids' && req.query.doc_ids === '["_design/medic"]')) {
        proxy.web(req, res);
      } else {
        var feed = {
          req: req,
          res: res,
          userCtx: userCtx
        };
        initFeed(feed, function(err) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          if (req.query.feed === 'longpoll') {
            // watch for newly added docs
            continuousFeeds.push(feed);
          }
          res.type('json');
          defibrillator(feed);
          getChanges(feed);
        });
      }
    });
  },
  // used for testing
  _reset: function() {
    continuousFeeds = [];
    inited = false;
  }
};
