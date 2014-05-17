exports.app_settings = function(doc, req) {

  var settings = (doc && doc.app_settings) || {};
  var meta = doc.kanso || doc.couchapp;
  var schema = meta && meta.config && meta.config.settings_schema;

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