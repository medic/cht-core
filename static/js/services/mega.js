var _ = require('underscore');

angular.module('inboxServices').service('Mega', [
  function() {
    var X = {
      getBindingType: function(conf) {
        return typeof conf === 'string'? conf: conf.type;
      },
      getInputType: function(conf) {
        return 'TODO:' + conf;
      },
      pathTo: function() {
        return '/' + Array.prototype.slice.call(arguments).join('/');
      },
      translationFor: function() {
        var key = _.map(arguments, function(v) {
          return v.replace('_', '.');
        }).join('.');
        return '{{\'' + key + '\' | translate}}';
      },
    };

    this.generateXform = function(schema) {
      var type = schema.type;
      var xml = '<h:html><h:head>' +
          '<h:title>' + X.translationFor(type, 'new') + '</h:title>' +
          '<model><instance>' +
          '<' + type + ' id="' + type + '" version="1">';
      _.forEach(schema.fields, function(conf, f) {
        xml += '<' + f + '/>';
      });
      xml += '<meta><instanceID/></meta>' +
          '</' + type + '>' +
          '</instance>';
      _.forEach(schema.fields, function(conf, f) {
        var dataType = X.getBindingType(conf),
            path = X.pathTo(type, f);
        xml += '<bind nodeset="' + path + '" ';
        if(typeof conf !== 'string' && conf.required) {
          xml += 'required="true()" ';
        }
        xml += 'type="' + dataType + '"/>';
      });
      xml += '</model></h:head><h:body>';
      _.forEach(schema.fields, function(conf, f) {
        // TODO input seems to be missing a type, and may also need `appearance` attr
        var path = X.pathTo(type, f),
            tr = X.translationFor(type, f);
        xml += '<input ref="' + path + '"><label>' + tr + '</label></input>';
      });
      xml += '</h:body></h:html>';
      return xml;
    };
  }
]);
