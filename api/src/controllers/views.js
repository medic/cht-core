const url = require('url');
const path = require('path');
const request = require('@medic/couch-request');
const environment = require('@medic/environment');
const serverUtils = require('../server-utils');

const VIEW_MAP = require('../../../ddocs/medic-db/view-map');

const buildViewUrl = (ddoc, viewName, queryString) => {
  const pathname = path.join('/', environment.db, '_design', ddoc, '_view', viewName);
  return url.format({
    protocol: environment.protocol,
    hostname: environment.host,
    port: environment.port,
    pathname: pathname,
  }) + (queryString ? '?' + queryString : '');
};

const forwardRequest = (req, res, next) => {
  const viewName = req.params.view;
  const ddoc = VIEW_MAP[viewName];

  if (!ddoc) {
    return next();
  }

  const queryString = url.parse(req.url).query;
  const viewUrl = buildViewUrl(ddoc, viewName, queryString);

  const options = {
    url: viewUrl,
    json: true,
    auth: { username: environment.username, password: environment.password },
  };

  if (req.method === 'POST' && req.body) {
    options.body = req.body;
  }

  const method = req.method.toLowerCase();
  return request[method](options)
    .then(result => res.json(result))
    .catch(err => serverUtils.error(err, req, res));
};

module.exports = {
  request: forwardRequest,
  VIEW_MAP,
};
