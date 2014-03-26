var http = require('http'),
  httpProxy = require('http-proxy'),
  Readable = require('stream').Readable,
  util = require('util'),
  passStream = require('pass-stream'),
  db = require('./db');

var proxy = httpProxy.createProxyServer({});

var server = http.createServer(function(req, res) {
  // TODO only handle kujua-lite
  // TODO ignore non document requests somehow (eg: login)

  var db = require('./db');
  var audit = require('couchdb-audit').withNode(db, db.user);

  console.log("received request " + req.method);
  // console.log(JSON.stringify(db));
  
  // TODO delete, any others?
  if (req.method === 'PUT' || req.method === 'POST') {

    var dataBuffer = '';

    function writeFn(data, encoding, cb) {
      // do not push data until audited
      dataBuffer += data;
      cb();
    }

    function endFn(cb) {
      var self = this;
      var doc = JSON.parse(dataBuffer);
      audit.log([doc], function(err, b) {
        if (err) {
          // TODO handle error
          console.log('err', err);
        } else {
          self.push(JSON.stringify(doc));
          cb();
        }
      });
    }

    var ps = passStream(writeFn, endFn);
    var buffer = req.pipe(ps);
    buffer.destroy = function(){};
    proxy.on('error', function(e) { 
      console.log('error!');
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