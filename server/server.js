var http = require('http'),
  httpProxy = require('http-proxy'),
  passStream = require('pass-stream'),
  db = require('./db');

var proxy = httpProxy.createProxyServer({});

var server = http.createServer(function(req, res) {

  // TODO pull out auditing proxy module
  // TODO copy couchdb audit in to sentinel and kujua-lite and bump version
  // TODO tests?

  var db = require('./db');

  if (req.url.indexOf(db.name) === 0 
    && ['PUT','POST','DELETE'].indexOf(req.method) !== -1) {

    var audit = require('couchdb-audit').withNode(db, db.user);
    var dataBuffer = '';

    function writeFn(data, encoding, cb) {
      // do not push data until audited
      dataBuffer += data;
      cb();
    }

    function endFn(cb) {
      var self = this;
      var doc = JSON.parse(dataBuffer);
      audit.log([doc], function(err) {
        if (!err) {
          self.push(JSON.stringify(doc));
        }
        cb(err);
      });
    }

    var ps = passStream(writeFn, endFn);
    var buffer = req.pipe(ps);
    buffer.destroy = function(){};
    proxy.on('error', function(e) { 
      console.log(JSON.stringify(e));
    });
    proxy.web(req, res, { 
      target: 'http://localhost:5984', 
      buffer: buffer,
      omitHeaders: ['content-length']
    });
  } else {
    proxy.web(req, res, { target: 'http://localhost:5984' });
  }

});

console.log("listening on port 5985");
server.listen(5985);