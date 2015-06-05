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

  auth.check({ }, null, null, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err.message, 'Not logged in');
    test.equals(err.code, 401);
    test.done();
  });

  callbacks.data(JSON.stringify({ userCtx: { name: null } }));
  callbacks.end();

};

exports['auth returns error when cannot parse json'] = function(test) {
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

  auth.check({ }, null, null, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err.message, 'Could not parse response');
    test.equals(err.code, 401);
    test.done();
  });

  callbacks.data('not valid json');
  callbacks.end();

};

exports['auth returns error when no user context'] = function(test) {
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

  auth.check({ }, null, null, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err.message, 'Not logged in');
    test.equals(err.code, 401);
    test.done();
  });

  callbacks.data(JSON.stringify({ roles: [] }));
  callbacks.end();

};

exports['auth returns error when http errors'] = function(test) {
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

  auth.check({ }, null, null, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err.message, 'some error');
    test.equals(err.code, 401);
    test.done();
  });

  callbacks.error('some error');

};

exports['auth returns error when no has insufficient privilege'] = function(test) {
  test.expect(4);

  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz' ] } };

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

  auth.check({ }, 'can_edit', district, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err.message, 'Insufficient privileges');
    test.equals(err.code, 403);
    test.done();
  });

  callbacks.data(JSON.stringify(userCtx));
  callbacks.end();

};

exports['auth returns username for admin'] = function(test) {
  test.expect(5);

  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ '_admin' ] } };

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

  auth.check({ }, 'can_edit', district, function(err, ctx) {
    test.equals(get.callCount, 1);
    test.equals(err, null);
    test.equals(ctx.user, 'steve');
    test.equals(ctx.district, null);
    test.done();
  });

  callbacks.data(JSON.stringify(userCtx));
  callbacks.end();

};

exports['auth returns username and district'] = function(test) {
  test.expect(6);

  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };

  var callbacks = { first: {}, second: {} };
  var get = sinon.stub(http, 'get');
  get.onFirstCall()
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks.first[eventType] = callback;
      }
    });
  get.onSecondCall()
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks.second[eventType] = callback;
      }
    });

  auth.check({ }, 'can_edit', district, function(err, ctx) {
    test.equals(get.callCount, 2);
    test.equals(err, null);
    test.equals(ctx.user, 'steve');
    test.equals(ctx.district, district);
    test.done();
  });

  callbacks.first.data(JSON.stringify(userCtx));
  callbacks.first.end();

  callbacks.second.data(JSON.stringify({ facility_id: district }));
  callbacks.second.end();

};

exports['auth returns error when requesting unallowed facility'] = function(test) {
  test.expect(5);

  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };

  var callbacks = { first: {}, second: {} };
  var get = sinon.stub(http, 'get');
  get.onFirstCall()
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks.first[eventType] = callback;
      }
    });
  get.onSecondCall()
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks.second[eventType] = callback;
      }
    });

  auth.check({ }, 'can_edit', '789', function(err) {
    test.equals(get.callCount, 2);
    test.equals(err.message, 'Insufficient privileges');
    test.equals(err.code, 403);
    test.done();
  });

  callbacks.first.data(JSON.stringify(userCtx));
  callbacks.first.end();

  callbacks.second.data(JSON.stringify({ facility_id: '123' }));
  callbacks.second.end();

};

exports['checkUrl requests the given url and returns status'] = function(test) {
  test.expect(5);

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

exports['auth accepts multiple required roles'] = function(test) {
  test.expect(6);

  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };

  var callbacks = { first: {}, second: {} };
  var get = sinon.stub(http, 'get');
  get.onFirstCall()
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks.first[eventType] = callback;
      }
    });
  get.onSecondCall()
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks.second[eventType] = callback;
      }
    });

  auth.check({ }, [ 'can_export_messages', 'can_export_contacts' ], district, function(err, ctx) {
    test.equals(get.callCount, 2);
    test.equals(err, null);
    test.equals(ctx.user, 'steve');
    test.equals(ctx.district, district);
    test.done();
  });

  callbacks.first.data(JSON.stringify(userCtx));
  callbacks.first.end();

  callbacks.second.data(JSON.stringify({ facility_id: district }));
  callbacks.second.end();

};


exports['auth checks all required roles'] = function(test) {
  test.expect(4);

  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };

  var callbacks = { first: {}, second: {} };
  var get = sinon.stub(http, 'get');
  get.onFirstCall()
    .returns({
      on: function(e) {
        test.equals(e, 'error');
      }
    })
    .callsArgWith(1, {
      on: function(eventType, callback) {
        callbacks.first[eventType] = callback;
      }
    });

  auth.check({ }, [ 'can_export_messages', 'can_export_server_logs' ], district, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err.message, 'Insufficient privileges');
    test.equals(err.code, 403);
    test.done();
  });

  callbacks.first.data(JSON.stringify(userCtx));
  callbacks.first.end();

};