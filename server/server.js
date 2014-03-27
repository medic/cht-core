var http = require('http'),
  httpProxy = require('http-proxy'),
  auditProxy = require('./audit-proxy'),
  db = require('./db'),
  target = 'http://' + db.client.host + ':' + db.client.port;

// TODO copy couchdb audit in to sentinel and kujua-lite and bump version
var server = http.createServer(function(req, res) {

  if (auditProxy.filter(req)) {
    auditProxy.onMatch(proxy, req, res, target);
  } else {
    proxy.web(req, res, { target: target });
  }

});

var proxy = httpProxy.createProxyServer({});
proxy.on('error', function(e) { 
  console.log(JSON.stringify(e));
});
console.log("proxying requests on port 5985 to " + target);
server.listen(5985);