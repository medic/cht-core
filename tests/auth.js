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
  test.expect(3);

  var callbacks = {};
  var get = sinon.stub(http, 'get')
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks[eventType] = callback;
      }
    });

  auth.getUserCtx({ }, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err, 'Not logged in');
    test.done();
  });

  callbacks.data(JSON.stringify({ userCtx: { name: null } }));
  callbacks.end();

};

exports['auth returns error when cannot parse json'] = function(test) {
  test.expect(3);

  var callbacks = {};
  var get = sinon.stub(http, 'get')
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks[eventType] = callback;
      }
    });

  auth.getUserCtx({ }, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err, 'Not logged in');
    test.done();
  });

  callbacks.data('not valid json');
  callbacks.end();

};

exports['auth returns error when no user context'] = function(test) {
  test.expect(3);

  var callbacks = {};
  var get = sinon.stub(http, 'get')
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks[eventType] = callback;
      }
    });

  auth.getUserCtx({ }, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err, 'Not logged in');
    test.done();
  });

  callbacks.data(JSON.stringify({ roles: [] }));
  callbacks.end();

};

exports['auth returns error when http errors'] = function(test) {
  test.expect(3);

  var callbacks = {};
  var get = sinon.stub(http, 'get')
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks[eventType] = callback;
      }
    });

  auth.getUserCtx({ }, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err, 'some error');
    test.done();
  });

  callbacks.error('some error');

};

exports['auth returns username'] = function(test) {
  test.expect(4);

  var callbacks = {};
  var get = sinon.stub(http, 'get')
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks[eventType] = callback;
      }
    });

  auth.getUserCtx({ }, function(err, ctx) {
    test.equals(get.callCount, 1);
    test.equals(err, null);
    test.equals(ctx.name, 'steve');
    test.done();
  });

  callbacks.data(JSON.stringify({ userCtx: { name: 'steve' } }));
  callbacks.end();

};

exports['checkUrl requests the given url and returns status'] = function(test) {
  test.expect(5);

  var callbacks = {};
  var request = sinon.stub(http, 'request')
    .returns({
      on: function(e) {
        test.equals(e, 'error');
        return {
          end: function() {
            test.done();
          }
        };
      }
    })
    .callsArgWith(1, { statusCode: 444 });

  auth.checkUrl({ params: { path: '/home/screen' } }, function(err, output) {
    test.equals(request.callCount, 1);
    test.equals(request.firstCall.args[0].path, '/home/screen');
    test.equals(err, null);
    test.equals(output.status, 444);
  });

};