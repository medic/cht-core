var http = require('http'),
  httpProxy = require('http-proxy'),
  auditProxy = require('./audit-proxy'),
  db = require('./db'),
  target = 'http://' + db.client.host + ':' + db.client.port;

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
  process.exit(1);
});
console.log("proxying requests on port 5988 to " + target);
server.listen(5988);