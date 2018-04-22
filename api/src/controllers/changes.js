var _ = require('underscore'),
    async = require('async'),
    auth = require('../auth'),
    config = require('../config'),
    serverUtils = require('../server-utils'),
    db = require('../db-nano'),
    ALL_KEY = '_all', // key in the docs_by_replication_key view for records everyone can access
    UNASSIGNED_KEY = '_unassigned', // key in the docs_by_replication_key view for unassigned records
    CONTACT_TYPES = ['person', 'clinic', 'health_center', 'district_hospital'],
    inited = false,
    continuousFeeds = [];

/**
 * As per https://issues.apache.org/jira/browse/COUCHDB-1288, there is a 100 doc
 * limit on processing changes feeds with the _doc_ids filter within a
 * reasonable amount of time.
 */
const MAX_DOC_IDS = 100;

var getDepth = function(userCtx) {
  if (!userCtx.roles || !userCtx.roles.length) {
    return -1;
  }
  var settings = config.get('replication_depth');
  if (!settings) {
    return -1;
  }
  var depth = -1;
  userCtx.roles.forEach(function(role) {
    // find the role with the deepest depth
    var setting = _.findWhere(settings, { role: role });
    var settingDepth = setting && parseInt(setting.depth, 10);
    if (!isNaN(settingDepth) && settingDepth > depth) {
      depth = settingDepth;
    }
  });
  return depth;
};

const getSubjectIds = (facilityId, userCtx, callback) => {
  const keys = [];
  const depth = getDepth(userCtx);
  if (depth >= 0) {
    for (let i = 0; i <= depth; i++) {
      keys.push([ facilityId, i ]);
    }
  } else {
    // no configured depth limit
    keys.push([ facilityId ]);
  }
  db.medic.view('medic', 'contacts_by_depth', { keys: keys }, (err, result) => {
    if (err) {
      return callback(err);
    }
    const subjectIds = [];
    result.rows.forEach(row => {
      subjectIds.push(row.id);
      if (row.value) {
        subjectIds.push(row.value);
      }
    });
    subjectIds.push(ALL_KEY);
    if (config.get('district_admins_access_unallocated_messages') &&
        auth.hasAllPermissions(userCtx, 'can_view_unallocated_data_records')) {
      subjectIds.push(UNASSIGNED_KEY);
    }
    callback(null, subjectIds);
  });
};

/**
 * Method to ensure users don't see reports submitted by their boss about the user
 */
var isSensitive = function(contactId, facilityId, subjectIds, subject, submitter) {
  if (!subject || !submitter) {
    // either not sure who it's about, or who submitted it - not sensitive
    return false;
  }
  if (subject !== contactId && subject !== facilityId) {
    // must be about a descendant - not sensitive
    return false;
  }
  // submitted by someone the user can't see
  return subjectIds.indexOf(submitter) === -1;
};

const getValidatedDocIds = (contactId, facilityId, subjectIds, userCtx, callback) => {
  const startTime = startTimer();
  db.medic.view('medic', 'docs_by_replication_key', { keys: subjectIds }, function(err, viewResult) {
    endTimer('bindValidatedDocIds().docs_by_replication_key', startTime);
    if (err) {
      return callback(err);
    }
    const validatedIds = viewResult.rows.reduce(function(ids, row) {
      if (!isSensitive(contactId, facilityId, subjectIds, row.key, row.value.submitter)) {
        ids.push(row.id);
      }
      return ids;
    }, [ '_design/medic-client', 'org.couchdb.user:' + userCtx.name ]);
    endTimer('bindValidatedDocIds().before-callback', startTime);
    callback(null, validatedIds);
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
  if (feed.res.finished) {
    // Don't write to the response if it has already ended. The change
    // will be picked up in the subsequent changes request.
    return;
  }
  // filter out records the user isn't allowed to see
  changes.results = changes.results.filter(function(change) {
    return change.deleted || _.contains(feed.validatedIds, change.id);
  });
  feed.res.write(JSON.stringify(changes));
};

var abortAllChangesRequests = feed => {
  if (feed.changesReqs) {
    feed.changesReqs.forEach(req => req && req.abort());
  }
};

var cleanUp = function(feed) {
  if (feed.heartbeat) {
    clearInterval(feed.heartbeat);
  }
  var index = _.indexOf(continuousFeeds, feed);
  if (index !== -1) {
    continuousFeeds.splice(index, 1);
  }
  abortAllChangesRequests(feed);
};

// returns true if superset contains all elements in subset
const containsAll = (superset, subset) =>
  subset.every(element => superset.indexOf(element) !== -1);

const errorResponse = (feed, message) => {
  cleanUp(feed);
  if (feed.res.finished) {
    // Don't write to the response if it has already ended. The change
    // will be picked up in the subsequent changes request.
    return;
  }
  feed.res.write(JSON.stringify({
    code: 503,
    message: message || 'Error processing your changes'
  }));
  feed.res.end();
};

const getChanges = feed => {
  const startTime = startTimer();

  const allIds = _.union(feed.requestedIds, feed.validatedIds);
  const chunks = [];

  if (feed.req.query.feed === 'longpoll') {
    chunks.push(allIds);
  } else {
    while (allIds.length) {
      chunks.push(allIds.splice(0, MAX_DOC_IDS));
    }
  }

  feed.changesReqs = [];
  // we cannot call 'changes' in nano because it only uses GET requests and
  // our query string might be too long for GET
  async.map(
    chunks,
    (docIds, callback) => {
      feed.changesReqs.push(db.request({
        db: db.settings.db,
        path: '_changes',
        qs:  _.pick(feed.req.query, 'timeout', 'style', 'heartbeat', 'since', 'feed', 'limit', 'filter'),
        body: { doc_ids: docIds },
        method: 'POST'
      }, callback));
    },
    (err, responses) => {
      endTimer(`getChanges().requests:${chunks.length}`, startTime);
      if (err) {
        return errorResponse(feed);
      }

      // if relevant ids have changed, update validated ids, getChanges again
      const originalValidatedIds = feed.validatedIds;
      bindServerIds(feed, err => {
        if (err) {
          return errorResponse(feed);
        }
        if (!containsAll(originalValidatedIds, feed.validatedIds)) {
          // getChanges again with the updated ids
          abortAllChangesRequests(feed);
          // setTimeout to stop recursive stack overflow
          setTimeout(() => {
            getChanges(feed);
          });
          return;
        }
        const malformedResponse = responses.find(response => {
          if (!response || !response.results) {
            // See: https://github.com/medic/medic-webapp/issues/3099
            // This should never happen, but apparently it does sometimes.
            // Attempting to log out the response usefully to see what's occuring
            console.error('No _changes error, but malformed response:', JSON.stringify(responses));
            return true;
          }
        });
        if (malformedResponse) {
          return errorResponse(feed, 'No _changes error, but malformed response.');
        }
        cleanUp(feed);
        const changes = responses.length === 1 ? responses[0] : mergeChangesResponses(responses);
        prepareResponse(feed, changes);
        feed.res.end();
        endTimer('getChanges().end', startTime);
      });
    }
  );
};

const mergeChangesResponses = responses => {
  let lastSeqNum = 0;
  let lastSeq;
  const results = [];

  responses.forEach(changes => {
    results.push(changes.results);
    const numericSeq = numericSeqFrom(changes.last_seq);
    if (numericSeq > lastSeqNum) {
      lastSeq = changes.last_seq;
      lastSeqNum = numericSeq;
    }
  });

  const merged = Array.prototype.concat(...results); // flatten the result sets
  merged.sort((a, b) => numericSeqFrom(a.seq) - numericSeqFrom(b.seq));

  return {
    last_seq: lastSeq,
    results: merged
  };
};

const numericSeqFrom = seq => typeof seq === 'number' ? seq : Number.parseInt(seq.split('-')[0]);

const bindServerIds = (feed, callback) => {
  const startTime = startTimer();
  async.parallel([
    callback => auth.getFacilityId(feed.req, feed.userCtx, callback),
    callback => auth.getContactId(feed.userCtx, callback)
  ], (err, [facilityId, contactId]) => {
    if (err) {
      return callback(err);
    }
    getSubjectIds(facilityId, feed.userCtx, (err, subjectIds) => {
      if (err) {
        return callback(err);
      }
      getValidatedDocIds(contactId, facilityId, subjectIds, feed.userCtx, (err, validatedIds) => {
        if (err) {
          return callback(err);
        }
        feed.contactId = contactId;
        feed.facilityId = facilityId;
        feed.subjectIds = subjectIds;
        feed.validatedIds = validatedIds;
        endTimer('bindServerIds().before-callback', startTime);
        callback();
      });
    });
  });
};

var initFeed = function(feed, callback) {
  bindRequestedIds(feed, function(err) {
    if (err) {
      return callback(err);
    }
    bindServerIds(feed, callback);
  });
};

// returns if it is true that for any document in the feed the user
// should be able to see it AND they don't already
var hasNewApplicableDoc = function(feed, changes) {
  return _.some(changes, function(change) {
    if (_.contains(feed.validatedIds, change.id)) {
      // feed already knows about doc
      return false;
    }
    if (isSensitive(feed, change.subject, change.submitter)) {
      // don't show sensitive information
      return false;
    }
    if (feed.subjectIds.indexOf(change.subject) !== -1) {
      // this is relevant to the feed
      return true;
    }
    if (CONTACT_TYPES.indexOf(change.doc.type) === -1) {
      // only people and places are subjects so we don't need to update
      // the subject list for non-contact types.
      return false;
    }
    var depth = getDepth(feed.userCtx);
    if (depth < 0) {
      depth = Infinity;
    }
    var parent = change.doc.parent;
    while (depth >= 0 && parent) {
      if (feed.subjectIds.indexOf(parent._id) !== -1) {
        // this is relevant to the feed
        return true;
      }
      depth--;
      parent = parent.parent;
    }
    return false;
  });
};

// WARNING: If updating this function also update the docs_by_replication_key view in lib/views.js
var getReplicationKey = function(doc) {
  if (doc._id === 'resources' ||
      doc._id === 'appcache' ||
      doc._id === 'zscore-charts' ||
      doc.type === 'form' ||
      doc.type === 'translations') {
    return [ '_all', {} ];
  }
  var getSubject = function() {
    if (doc.form) {
      // report
      if (doc.contact && doc.errors && doc.errors.length) {
        for (var i = 0; i < doc.errors.length; i++) {
          // no patient found, fall back to using contact. #3437
          if (doc.errors[i].code === 'registration_not_found') {
            return doc.contact._id;
          }
        }
      }
      return (doc.patient_id || (doc.fields && doc.fields.patient_id)) ||
             (doc.place_id || (doc.fields && doc.fields.place_id)) ||
             (doc.contact && doc.contact._id);
    }
    if (doc.sms_message) {
      // incoming message
      return doc.contact && doc.contact._id;
    }
    if (doc.kujua_message) {
      // outgoing message
      return doc.tasks &&
             doc.tasks[0] &&
             doc.tasks[0].messages &&
             doc.tasks[0].messages[0] &&
             doc.tasks[0].messages[0].contact &&
             doc.tasks[0].messages[0].contact._id;
    }
  };
  switch (doc.type) {
    case 'data_record':
      var subject = getSubject() || '_unassigned';
      var value = {};
      if (doc.form && doc.contact) {
        value.submitter = doc.contact._id;
      }
      return [ subject, value ];
    case 'clinic':
    case 'district_hospital':
    case 'health_center':
    case 'person':
      return [ doc._id, {} ];
  }
};

var updateFeeds = function(changes) {
  if (!changes || !changes.results) {
    // See: https://github.com/medic/medic-webapp/issues/3099
    // This should never happen, but apparently it does sometimes.
    // Attempting to log out the response usefully to see what's occuring
    console.error('No _changes error, but malformed response:', JSON.stringify(changes));
    return;
  }

  var modifiedChanges = changes.results.map(function(change) {
    var result = {
      id: change.id,
      doc: change.doc
    };
    var row = getReplicationKey(change.doc);
    if (row && row.length) {
      result.subject = row[0];
      result.submitter = row[1].submitter;
    }
    return result;
  });
  continuousFeeds.forEach(function(feed) {
    // check if new and relevant
    if (hasNewApplicableDoc(feed, modifiedChanges)) {
      abortAllChangesRequests(feed);
      bindServerIds(feed, function(err) {
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
  since = since || 'now';
  var options = {
    since: since,
    heartbeat: true,
    feed: 'longpoll',
    include_docs: true
  };
  db.medic.changes(options, function(err, changes) {
    if (!err) {
      updateFeeds(changes);
      since = changes.last_seq;
    }
    // use setTimeout to break recursion so stack doesn't blow out
    setTimeout(function() {
      init(since);
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

      if (req.query.feed === 'longpoll' ||
          req.query.feed === 'continuous' ||
          req.query.feed === 'eventsource') {
        // Disable nginx proxy buffering to allow hearbeats for long-running feeds
        // Issue: #2363
        res.setHeader('X-Accel-Buffering', 'no');
      }

      if (auth.isAdmin(userCtx)) {
        proxy.web(req, res);
      } else {
        var feed = {
          req: req,
          res: res,
          userCtx: userCtx
        };
        req.on('close', function() {
          cleanUp(feed);
        });
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
  _getReplicationKey: getReplicationKey // used for testing
};

function startTimer() {
  return Date.now();
}

function endTimer(name, start) {
  var diff = Date.now() - start;
  console.log('TIMED SECTION COMPLETE', name, diff, 'ms');
}

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _reset: function() {
      continuousFeeds = [];
      inited = false;
    },
    _getFeeds: function() {
      return continuousFeeds;
    }
  });
}
