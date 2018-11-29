module.exports = {
  loadTranslations: function(values) {
    Object.keys(values).forEach(function(key) {
      var value = values[key];
      if(value.indexOf('${') > -1) {
        var ids = value.match(/\${[^}\r\n]*}/g);
        ids.forEach(function(id) {
          var idKey = id.replace(/[${}]/g, '');
          value = value.replace(id, values[idKey] || id);
        });
        values[key] = value;
      }
    });
    return values;
  }
};
