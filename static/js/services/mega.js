var _ = require('underscore');

angular.module('inboxServices').service('Mega', [
  function() {
    var X = {
      extraAttributesFor: function(conf) {
        var typeString = typeof conf === 'string'? conf: conf.type,
            extras = {};
        if(/^db:/.test(typeString)) {
          extras.appearance = 'dbObject';
          extras['data-db-type'] = typeString.substring(3);
        }
        return extras;
      },
      getBindingType: function(conf) {
        var typeString = typeof conf === 'string'? conf: conf.type;
        if(/^db:/.test(typeString)) {
          return 'string';
        }
        return typeString;
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
      var dataNode = type;
      var xml = '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '<h:head>' +
          '<h:title>' + X.translationFor(type, 'new') + '</h:title>' +
          '<model><instance>' +
          '<' + dataNode + ' id="' + type + '" version="1">';
      _.forEach(schema.fields, function(conf, f) {
        xml += '<' + f + '/>';
      });
      xml += '<meta><instanceID/></meta>' +
          '</' + dataNode + '>' +
          '</instance>';
      _.forEach(schema.fields, function(conf, f) {
        var dataType = X.getBindingType(conf),
            path = X.pathTo(dataNode, f);
        xml += '<bind nodeset="' + path + '" ';
        if(typeof conf !== 'string' && conf.required) {
          xml += 'required="true()" ';
        }
        xml += 'type="' + dataType + '"/>';
      });
      xml += '</model></h:head><h:body>';
      _.forEach(schema.fields, function(conf, f) {
        var path = X.pathTo(dataNode, f),
            tr = X.translationFor(type, f),
            extras = X.extraAttributesFor(conf);
        xml += '<input ref="' + path + '"';
        var extraString = _.map(extras, function(val, name) {
          return name + '="' + val + '"';
        }).join(' ');
        if(extraString) {
          xml += ' ' + extraString;
        }
        xml += '><label>' + tr + '</label></input>';
      });
      xml += '</h:body></h:html>';
      return xml;
    };

    this.jsToFormInstanceData = function(obj) {
      var root = $('<' + obj.type + '>');
      _.each(obj, function(val, key) {
        if(!/^(_|type$)/.test(key)) {
          $('<' + key + '>', { text: val }).appendTo(root);
        }
      });
      return root[0].outerHTML;
    };
  }
]);
