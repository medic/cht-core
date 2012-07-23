module.exports = {
  run: function(root, path, settings, doc, callback) {
    var config, data, key, lib, showId, value;
    lib = doc.lib;
    config = settings['kanso-config'] || {};
    showId = config.showId || 'config';
    key = config.keyKey || 'key';
    value = config.valueKey || 'value';
    values = config.valuesKey || 'values';
    data = config.dataKey || 'kanso-config';
    if (lib != null) {
      lib.shows += "exports['" + showId + "'] = function(doc, req) {\n" +
        "  return {\n" +
        "    body: \"\\n\" +\n" +
        "    \"(function($) {\\n\" +\n" +
        "    \"  var config,\\n\" +\n    \"      values;\\n\" +\n" +
        "    \"  values = \" + JSON.stringify(doc['" + values + "']) + \" || [];\\n\" +\n" +
        "    \"  config = values.reduce(function(memo, value) {\\n\" +\n" +
        "    \"    memo[value['" + key + "']] = value['" + value + "'];\\n\" +\n" +
        "    \"    return memo;\\n\" +\n" +
        "    \"  }, {});\\n\" +\n" +
        "    \"  $(document).data('" + data + "', config);\\n\" +\n" +
        "    \"  $.kansoconfig = function(key, noFallback) {\\n\" +\n" +
        "    \"    var result = config[key];\\n\" +\n" +
        "    \"    return arguments.length === 0 ? config : noFallback ? result : result || key;\\n\" +\n" +
        "    \"  };\\n\" + \n" +
        "    \"})(jQuery)\",\n" +
        "    headers: { 'Content-Type': 'text/javascript' }\n" +
        "  }\n" +
        "};";
    }
    return callback(null, doc);
  }
};
