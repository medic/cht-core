var _ = require('underscore'),
    auth = require('../auth'),
    config = require('../config'),
    serverUtils = require('../server-utils'),
    db = require('../db'),
    ALL_KEY = [ '_all' ], // key in the doc_by_place view for records everyone can access
    UNASSIGNED_KEY = [ '_unassigned' ]; // key in the doc_by_place view for unassigned records

var getViewKeys = function(req, userCtx, callback) {
  auth.getFacilityId(req, userCtx, function(err, facilityId) {
    if (err) {
      return callback(err);
    }
    var keys = [ ALL_KEY ];
    if (facilityId) {
      keys.push([ facilityId ]);
    }
    if (config.get('district_admins_access_unallocated_messages') &&
        auth.hasAllPermissions(userCtx, 'can_view_unallocated_data_records')) {
      keys.push(UNASSIGNED_KEY);
    }
    callback(null, keys);
  });
};

var getUsersDocIds = function(req, userCtx, callback) {
  getViewKeys(req, userCtx, function(err, keys) {
    if (err) {
      return callback(err);
    }
    db.medic.view('medic', 'doc_by_place', { keys: keys }, function(err, viewResult) {
      if (err) {
        return callback(err);
      }
      var ids = _.pluck(viewResult.rows, 'id');
      ids.push('resources');
      ids.push('org.couchdb.user:' + userCtx.name);
      callback(null, ids);
    });
  });
};

var getChanges = function(req, callback) {
  var params = _.pick(req.query, 'timeout', 'style', 'heartbeat', 'since', 'feed');
  db.medic.changes(params, callback);
};

var prepareResponse = function(req, res, changes, ids) {
  var result = {
    results: [],
    last_seq: req.query.since
  };
  var len = changes.results.length;
  var limit = req.query.limit || len;
  for (var i = 0; i < len && result.results.length < limit; i++) {
    var change = changes.results[i];
    // update last_seq whether or not this change applies
    result.last_seq = change.seq;
    // Send all deletions to the client even for docs they're not
    // allowed to see. This only leaks the _id and _rev.
    if (change.deleted || _.contains(ids, change.id)) {
      result.results.push(change);
    }
  }
  res.json(result);
};

module.exports = function(proxy, req, res) {
  auth.getUserCtx(req, function(err, userCtx) {
    if (err) {
      return serverUtils.error(err, req, res);
    }
    if (auth.hasAllPermissions(userCtx, 'can_access_directly') ||
        (req.query.filter === '_doc_ids' && req.query.doc_ids === '["_design/medic"]')) {
      proxy.web(req, res);
    } else {
      getChanges(req, function(err, changes) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        getUsersDocIds(req, userCtx, function(err, ids) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          prepareResponse(req, res, changes, ids);
        });
      });
    }
  });
};
