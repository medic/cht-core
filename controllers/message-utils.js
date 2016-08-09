var db = require('../db');

var updateCouchDB = function(record_id, body, callback) {
  db.medic.updateWithHandler(
    'medic',
    'update_message_task',
    record_id,
    body,
    callback
  );
};

var getTaskMessages = function(options, callback) {
  db.medic.view('medic', 'tasks_messages', options, callback);
};

module.exports = {
  getMessages: function(options, callback) {
    options = options || {};
    var viewOptions = {
      limit: options.limit || 25,
    };
    if (viewOptions.limit > 1000) {
      return callback({ code: 500, message: 'Limit max is 1000' });
    }
    if (typeof options.descending !== 'undefined') {
      viewOptions.descending = true;
    }
    if (options.state) {
      viewOptions.startkey = [ options.state ];
      viewOptions.endkey = [ options.state ];
      if (viewOptions.descending) {
        viewOptions.startkey.push({});
      } else {
        viewOptions.endkey.push({});
      }
    }
    getTaskMessages(viewOptions, function(err, data) {
      if (err) {
        return callback(err);
      }
      var msgs = data.rows.map(function(row) {
        return row.value;
      });
      callback(null, msgs);
    });
  },
  updateMessage: function(id, body, callback) {
    module.exports.getMessage(id, function(err, msg) {
      if (err) {
        return callback(err);
      }
      // update requires message_id parameter in JSON body
      body.message_id = id;
      updateCouchDB(msg._record_id, body, function(err, data) {
        if (err) {
          return callback(err);
        }
        callback(null, {
          id: id,
          success: data.payload.success
        });
      });
    });
  },
  getMessage: function(id, callback) {
    if (!id) {
      return callback({ code: 500, message: 'Missing "id" parameter.' });
    }
    getTaskMessages({ key: id }, function(err, data) {
      if (err) {
        return callback(err);
      }
      if (data.rows.length === 0) {
        return callback({ code: 404, message: 'Not Found' });
      }
      callback(null, data.rows[0].value);
    });
  },
};