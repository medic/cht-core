require('./common');

var query = couchdb.toQuery({
  key: 'bar',
  very: true,
  stale: 'ok'
});
assert.equal('key=%22bar%22&very=true&stale=ok', query);