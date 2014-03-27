var passStream = require('pass-stream'),
  db = require('./db'),
  audit,
  dataBuffer = '';

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

  // TODO tests?

module.exports = {

  filter: function(req) {
    return req.url.indexOf(db.name) === 0 
        && ['PUT','POST','DELETE'].indexOf(req.method) !== -1
  },

  onMatch: function(proxy, req, res, target) {
    audit = audit || require('couchdb-audit').withNode(db, db.user);
    dataBuffer = '';

    var ps = passStream(writeFn, endFn);
    var buffer = req.pipe(ps);
    buffer.destroy = function(){};

    proxy.web(req, res, {
      target: target, 
      buffer: buffer,
      omitHeaders: ['content-length']
    });
  }

}