require('./common');

var
  callbacks = {
    A: false,
    B: false,
    C: false,
    D: false,
    E: false,
    F: false,
  };

client
  .request('/_uuids', function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.A = true;
    assert.ok(1, r.uuids.length);
  });

client
  .request('/_uuids', {count: 2}, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.B = true;
    assert.ok(2, r.uuids.length);
  });

client
  .request('GET', '/_uuids', {count: 3}, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.C = true;
    assert.ok(3, r.uuids.length);
  });

client
  .request({
    path: '/_uuids',
    query: {count: 4},
  }, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.D = true;
    assert.ok(4, r.uuids.length);
  });

client
  .request({
    path: '/_uuids',
    query: {count: 5},
    full: true
  }, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.E = true;
    assert.ok('headers' in r);
    assert.ok(5, r.json.uuids.length);
  });

client
  .request('post', '/_uuids', function(r) {
    callbacks.F = true;
    assert.equal('method_not_allowed', r.error);
  });

process.on('exit', function() {
  checkCallbacks(callbacks);
});