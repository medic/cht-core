var db = require('../db');

module.exports = {

  getMessages: function(options, district, callback) {
    options = options || {};
    var v_opts = {
      limit: options.limit || 25,
    };
    if (v_opts.limit > 1000) {
        return callback({code: 500, message: 'Limit max is 1000'});
    }
    if (typeof options.descending !== 'undefined') {
      v_opts.descending = true;
    }
    if (options.state) {
      v_opts.startkey = [options.state];
      v_opts.endkey = [options.state,{}];
      if (v_opts.descending) {
        v_opts.startkey = [options.state, {}];
        v_opts.endkey = [options.state];
      }
    }
    db.medic.view('medic', 'tasks_messages', v_opts, function(err, data) {
      if (err) {
        return callback(err);
      }
      if (!data) {
        return callback({code: 500, message: 'Data missing.'});
      }
      var msgs = [];
      data.rows.forEach(function(row) {
        msgs.push(row.value);
      });
      callback(null, msgs);
    });
  },

  getMessage: function(id, district, callback) {
    if (!id) {
      return callback({code: 500, message: 'Missing "id" parameter.'});
    }
    db.medic.view('medic', 'tasks_messages', {key: id}, function(err, data) {
      if (err) {
        return callback(err);
      }
      if (data.rows.length === 0) {
        return callback({code: 404, message: 'Not Found'});
      }
      callback(null, data.rows[0].value);
    });
  },

  _updateCouchDB: function(record_id, body, callback) {
    db.medic.updateWithHandler(
      'medic',
      'update_message_task',
      record_id,
      body,
      function(err, data) {
        if (err) {
          // nano creates a new error object merging the error object received
          // from the server.
          return callback(err);
        }
        callback(null, {
          success: data.payload.success,
          id: body.message_id
        });
    });
  },

  updateMessage: function(id, body, district, callback) {
    module.exports.getMessage(id, district, function(err, msg) {
      if (err) {
        return callback(err);
      }
      // update requires message_id parameter in JSON body
      body.message_id = id;
      module.exports._updateCouchDB(msg._record_id, body, callback);
    });
  }

};
