/**
 * Module to ensure changes listeners are singletons. Registering a
 * listener with this module will replace the previously registered
 * listener.
 */
(function () {

  'use strict';

  var callback;
  var inited = false;

  exports.register = function(db, cb) {

    callback = cb;

    if (!inited) {
      inited = true;
      db.changes({ filter: 'medic/data_records' }, function(err, data) {
        if (!err && data && data.results) {
          callback(data.results);
        }
      });
    }

  };
  
}());