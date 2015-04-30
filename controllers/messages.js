var db = require('../db');

var getMessages = function(options, district, callback) {
  options = options || {};
  var v_opts = {
    limit: options.limit || 25
  };
  if (v_opts.limit > 1000) {
      return callback({code: 500, message: 'Limit max is 1000'});
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
};

var getMessage = function(id, district, callback) {
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
};

var updateMessage = function(id, body, district, callback) {
  getMessage(id, district, function(err, msg) {
    if (err) {
      callback(err);
    }
    // update requires message_id parameter in JSON body
    body.message_id = id;
    db.medic.updateWithHandler(
      'medic',
      'update_message_task',
      msg._record_id,
      body,
      function(err, data) {
        if (err) {
          // nano creates a new error object merging the error object received
          // from the server.
          return callback({code: err.statusCode, message: err.payload.error});
        }
        callback(null, {
          success: data.payload.success,
          id: id
        });
    });
  });
};

module.exports = {
  getMessage: getMessage,
  getMessages: getMessages,
  updateMessage: updateMessage
};
