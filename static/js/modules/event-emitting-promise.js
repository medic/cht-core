var EventEmitter = require('event-emitter');

module.exports = exports = function(promise) {
  var ee = new EventEmitter();
  return {
    then: function() {
      return promise.then.apply(promise, arguments);
    },
    catch: function() {
      return promise.catch.apply(promise, arguments);
    },
    on: function() {
      return ee.on.apply(ee, arguments);
    },
    emit: function() {
      return ee.emit.apply(ee, arguments);
    }
  };
};