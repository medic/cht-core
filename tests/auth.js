var http = require('http'),
    sinon = require('sinon'),
    auth = require('../auth');

exports.tearDown = function (callback) {
  if (http.get.restore) {
    http.get.restore();
  }
  callback();
};

exports['auth returns error when not logged in'] = function(test) {
  test.expect(2);

  var callbacks = {};
  var get = sinon.stub(http, 'get').callsArgWith(1, {
    on: function(eventType, callback) {
      callbacks[eventType] = callback;
    }
  });

  auth.getUsername({ }, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err, 'Not logged in');
    test.done();
  });

  callbacks.data(JSON.stringify({
    userCtx: { name: null }
  }));

};

exports['auth returns error when http errors'] = function(test) {
  test.expect(2);

  var callbacks = {};
  var get = sinon.stub(http, 'get').callsArgWith(1, {
    on: function(eventType, callback) {
      callbacks[eventType] = callback;
    }
  });

  auth.getUsername({ }, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err, 'some error');
    test.done();
  });

  callbacks.error('some error');

};

exports['auth returns username'] = function(test) {
  test.expect(3);

  var callbacks = {};
  var get = sinon.stub(http, 'get').callsArgWith(1, {
    on: function(eventType, callback) {
      callbacks[eventType] = callback;
    }
  });

  auth.getUsername({ }, function(err, name) {
    test.equals(get.callCount, 1);
    test.equals(err, null);
    test.equals(name, 'steve');
    test.done();
  });

  callbacks.data(JSON.stringify({
    userCtx: { name: 'steve' }
  }));

};