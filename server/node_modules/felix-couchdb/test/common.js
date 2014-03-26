var util = require('util');
global.p = util.p;
global.puts = util.puts;

global.couchdb = require('../lib/couchdb');
global.assert = require('assert');
global.checkCallbacks = function(callbacks) {
  for (var k in callbacks) {
    assert.ok(callbacks[k], 'Callback '+k+' fired');
  }
};

// Provide a port/host here if your local db has a non-default setup
GLOBAL.client = couchdb.createClient(undefined, undefined, undefined, undefined, 0);