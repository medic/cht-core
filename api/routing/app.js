const express = require('express'),
      createDomain = require('domain').create,
      bodyParser = require('body-parser'),
      morgan = require('morgan'),
      path = require('path'),
      serverUtils = require('../server-utils');

// requires content-type application/json header
const jsonParser = bodyParser.json({limit: '32mb'});
// requires content-type application/x-www-form-urlencoded header
const formParser = bodyParser.urlencoded({limit: '32mb', extended: false});

/**
 * Boots express, sets general app-side preferences and does basic login routing
 */
module.exports = {
  jsonParser: jsonParser,
  formParser: formParser,
  init: () => {
    const app = express();

    const handleJsonRequest = (method, path, callback) => {
      app[method](path, jsonParser, (req, res) => {
        const contentType = req.headers['content-type'];
        if (!contentType || contentType !== 'application/json') {
          return serverUtils.error({
            code: 400,
            message: 'Content-Type must be application/json'
          }, req, res);
        } else {
          callback(req, res);
        }
      });
    };
    app.deleteJson = (path, callback) => handleJsonRequest('delete', path, callback);
    app.postJson   = (path, callback) => handleJsonRequest('post',   path, callback);
    app.putJson    = (path, callback) => handleJsonRequest('put',    path, callback);

    app.set('strict routing', true);

    app.use(morgan('combined', {
      immediate: true
    }));

    app.use(function(req, res, next) {
      var domain = createDomain();
      domain.on('error', function(err) {
        console.error('UNCAUGHT EXCEPTION!');
        serverUtils.serverError(err, req, res);
        domain.dispose();
        process.exit(1);
      });
      domain.enter();
      next();
    });

    app.use(express.static(path.join(__dirname, 'public')));

    return app;
  }
};
