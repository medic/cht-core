var async = require('async'),
    _ = require('underscore'),
    db = require('../db'),
    config = require('../config'),
    forms;

var namespace = function(id, callback) {
  db.medic.get(id, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        return callback();
      }
      return callback(err);
    }
    if (doc.fields || !doc.form) {
      return callback();
    }
    form = forms[doc.form];
    if (!form) {
      return callback();
    }
    doc.fields = {};
    _.keys(form.fields).forEach(function(key) {
      doc.fields[key] = doc[key];
      delete doc[key];
    });
    db.medic.insert(doc, callback);
  });
};

module.exports = {
  name: 'namespace-form-fields',
  created: new Date(2015, 5, 19, 10, 30, 0, 0),
  run: function(callback) {
    config.load(function() {
      forms = config.get('forms');
      db.medic.view('medic', 'data_records', { }, function(err, result) {
        if (err) {
          return callback(err);
        }
        var ids = _.uniq(_.pluck(result.rows, 'id'));
        async.eachSeries(ids, namespace, callback);
      });
    });
  }
};