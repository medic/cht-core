var _ = require('underscore'),
    db = require('../db-nano'),
    logger = console;

var _exists = function(val) {
    if (val === '') {
        return false;
    }
    if (typeof val === 'undefined') {
        return false;
    }
    return true;
};

module.exports = {
  createRecord: function(data, district, callback) {
    var opts = {
      path: db.getPath() + '/add',
      method: 'POST',
      content_type: 'application/x-www-form-urlencoded'
    };
    var required = ['message', 'from'],
        optional = ['reported_date', 'locale'];
    for (var k in required) {
      if (!_exists(data[required[k]])) {
        return callback(new Error('Missing required fields: ' + required[k]));
      }
    }
    // filter out any unwanted fields
    opts.form = _.pick(data, required.concat(optional));
    db.request(opts, function(err, results) {
        if (err) {
          return callback(err);
        }
        callback(null, {
          success: results.payload.success,
          id: results.payload.id
        });
    });
  },
  createRecordJSON: function(data, district, callback) {
    // nano.request defaults to json content type.
    var opts = {
      path: db.getPath() + '/add',
      method: 'POST'
    };
    var required = ['from', 'form'],
        optional = ['reported_date', 'locale'];
    // check required fields are in _meta property
    if (!_exists(data._meta)) {
      return callback(new Error('Missing _meta property.'));
    }
    for (var k in required) {
      if (!_exists(data._meta[required[k]])) {
        return callback(new Error('Missing required fields: ' + required[k]));
      }
    }
    // filter out any unwanted fields
    data._meta = _.pick(data._meta, required.concat(optional));
    opts.body = data;
    db.request(opts, function(err, results) {
        if (err) {
          // nano creates a new error object merging the error object received
          // from the server, reformat it.
          return callback(err);
        }
        callback(null, {
          success: results.payload.success,
          id: results.payload.id
        });
    });
  }
};
