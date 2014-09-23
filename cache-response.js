var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    send = require('send'),
    rimraf = require('rimraf'),
    mkdirp = require('mkdirp'),
    cacheDir = '.cache';

var store = function(cachePath, data, callback) {
  mkdirp(path.dirname(cachePath), function(err) {
    if (err) {
      return callback(err);
    }
    fs.writeFile(cachePath, data, callback);
  });
};

var retrieve = function(req, res, next, cachePath, options) {
  var stream = send(req, cachePath, options);
  stream.on('error', function(err) {
    next(err.status === 404 ? null : err);
  });
  stream.pipe(res);
};

exports = module.exports = function cacheResponse(target, options) {

  // Delete cache directory on start
  rimraf.sync(cacheDir);

  return function (req, res, next) {

    if (req.method !== 'GET') {
      return next();
    }

    var cachePath = cacheDir + req.originalUrl;
    if (fs.existsSync(cachePath)) {
      return retrieve(req, res, next, cachePath, options);
    }
    
    http.get(target + req.originalUrl, function(cres) {

      var data = [];

      cres.on('data', function(chunk) {
        data.push(chunk);
      });

      cres.on('close', function() {
        res.end();
      });

      cres.on('end', function() {
        var status = cres.statusCode;
        if (status === 304 || (status >= 200 && status < 300)) {
          store(cachePath, data.join(''), function(err) {
            if (err) {
              return next(err);
            }
            return retrieve(req, res, next, cachePath, options);
          });
        } else {
          // let the request fall through
          return next();
        }
      });

    }).on('error', function(err) {
      next(err.message);
    });

  };
};