
/**
 * @private
 * @param {Object} obj
 * @param {String} path
 */
var _objectpath = function(obj, path) {
    if (typeof path !== 'string') {
        return;
    }
    path = path.split('.');

    while (obj && path.length) {
        obj = obj[path.shift()];
    }
    return obj;
};

exports.app_settings = function(doc, req) {

  log('shows.app_settings req');
  log(JSON.stringify(req,null,2));

  var settings = (doc && doc.app_settings) || {},
      meta = doc.kanso || doc.couchapp,
      schema = meta && meta.config && meta.config.settings_schema,
      path = req.query.objectpath;

  if (path) {
      settings = _objectpath(settings, path);
  }

  return {
    body: JSON.stringify({
      settings: settings,
      schema: schema
    }),
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    }
  };

};
