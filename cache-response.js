var request = require('request'),
    fs = require('fs'),
    path = require('path'),
    send = require('send'),
    rimraf = require('rimraf'),
    mkdirp = require('mkdirp'),
    cacheDir = '.cache';

var retrieve = function(req, res, next, cachePath, options) {
  send(req, cachePath, options)
    .on('error', function(err) {
      next(err.status === 404 ? null : err);
    })
    .pipe(res);
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

    mkdirp(path.dirname(cachePath), function(err) {
      if (err) {
        return next(err);
      }
      request(target + req.originalUrl)
        .pipe(fs.createWriteStream(cachePath))
        .on('close', function() {
          return retrieve(req, res, next, cachePath, options);
        })
        .on('error', function(err) {
          return next(err);
        });
    });

  };
};