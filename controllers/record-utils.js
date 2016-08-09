var _ = require('underscore'),
    db = require('../db');

var exists = function(val) {
  return val !== '' && typeof val !== 'undefined';
};

var request = function(opts, callback) {
  opts.path = db.getPath() + '/add';
  opts.method = 'POST';
  db.request(opts, function(err, results) {
    if (err) {
      return callback(err);
    }
    callback(null, {
      success: results.payload.success,
      id: results.payload.id
    });
  });
};

var createByForm = function(data, callback) {
  var required = ['message', 'from'],
      optional = ['reported_date', 'locale', 'gateway_ref'];
  for (var k in required) {
    if (required.hasOwnProperty(k)) {
      if (!exists(data[required[k]])) {
        return callback(new Error('Missing required field: ' + required[k]));
      }
    }
  }
  // filter out any unwanted fields
  var content = _.pick(data, required.concat(optional));
  request({
    form: content,
    content_type: 'application/x-www-form-urlencoded'
  }, callback);
};

var createRecordByJSON = function(data, callback) {
  var required = ['from', 'form'],
      optional = ['reported_date', 'locale'];
  // check required fields are in _meta property
  if (!exists(data._meta)) {
    return callback(new Error('Missing _meta property.'));
  }
  for (var k in required) {
    if (required.hasOwnProperty(k)) {
      if (!exists(data._meta[required[k]])) {
        return callback(new Error('Missing required field: ' + required[k]));
      }
    }
  }
  // filter out any unwanted fields
  data._meta = _.pick(data._meta, required.concat(optional));
  // no need to pass the content type as nano.request defaults to json.
  request({ body: data }, callback);
};

module.exports = {
  createRecordByJSON: createRecordByJSON,
  createByForm: createByForm
};
