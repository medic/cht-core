var _ = require('underscore');

angular.module('inboxServices').service('Mega', [
  function() {
    var X = {
      extraAttributesFor: function(conf) {
        var extras = {};
        var typeString = conf.type;
        if(/^db:/.test(typeString)) {
          extras.appearance = 'db-object';
        }
        return extras;
      },
      getBindingType: function(conf) {
        return conf.type;
      },
      getInputType: function(conf) {
        return 'TODO:' + conf;
      },
      pathTo: function() {
        return '/' + Array.prototype.slice.call(arguments).join('/');
      },
      translationFor: function() {
        var key = Array.prototype.slice.call(arguments).join('.');
        return '{{\'' + key + '\' | translate}}';
      },
    };

    var N = function(tagName, text, attrs, children) {
      this.tagName = tagName;
      if(arguments.length === 2) {
        if(_.isArray(text)) {
          children = text; text = null;
        } else if(typeof text === 'object') {
          attrs = text; text = null;
        }
      } else if(arguments.length === 3) {
        if(_.isArray(attrs)) {
          children = attrs; attrs = null;
        }
      }

      this.text = text;
      this.attrs = attrs;
      this.children = children || [];

      this.prepend = function(child) {
        this.children.unshift(child);
      };

      this.append = function(child) {
        this.children.push(child);
      };

      this.appendTo = function(parent) {
        parent.children.push(this);
      };

      this.xml = function() {
        var xml = '<' + this.tagName;
        _.each(this.attrs, function(val, name) {
          xml += ' ' + name + '="' + val + '"';
        });
        if(this.text || this.children.length) {
          xml += '>';
          if(this.text) {
            xml += text;
          }
          if(this.children) {
            _.each(this.children, function(child) {
              xml += child.xml();
            });
          }
          xml += '</' + tagName + '>';
        } else {
          xml += '/>';
        }
        return xml;
      };
    };

    var modelFor = function(schema, rootNode) {
      var node = new N(rootNode || schema.type);
      _.each(schema.fields, function(conf, name) {
        if(!_.contains([ 'contactfor' ], name)) { // TODO surely this check is unnecessary - contactfor does not appear in any schema
          node.append(new N(name));
        }
      });
      return node;
    };

    var generateXformWithOptions = function(principle, extras) {
      console.log('generateXformWithOptions()', principle, extras);

      var xPath = function() {
        var path = Array.prototype.slice.call(arguments).join('/');
        if(extras) {
          return '/data/' + path;
        } else {
          return '/' + path;
        }
      };

      var root = new N('h:html', {
        xmlns: 'http://www.w3.org/2002/xforms',
        'xmlns:ev': 'http://www.w3.org/2001/xml-events',
        'xmlns:h': 'http://www.w3.org/1999/xhtml',
        'xmlns:jr': 'http://openrosa.org/javarosa',
        'xmlns:orx': 'http://openrosa.org/xforms/',
        'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
      });

      var head = (function generateHead() {
        var head = new N('h:head');
        head.append(new N('h:title', X.translationFor(principle.type, 'new')));
        var model = new N('model');
        head.append(model);
        var instance = new N('instance');
        model.append(instance);
        var meta = new N('meta', [ new N('instanceID') ]);
        if(extras) {
          var instanceContainer = new N('data', { id:principle.type, version:1 });
          instance.append(instanceContainer);
          instanceContainer.append(modelFor(principle));
          _.each(extras, function(extra, mapping) {
            instanceContainer.append(modelFor(extra, mapping));
          });
          instanceContainer.append(meta);
        } else {
          instance.append(modelFor(principle));
          instance.append(meta);
        }
        // add some meta (not sure what this is for)

        // bindings
        var bindingsFor = function(schema, mapping) {
          _.each(schema.fields, function(conf, f) {
            var props = {
              nodeset: xPath(mapping, f),
              type: X.getBindingType(conf),
            };
            if(conf.required) {
              props.required = 'true()';
            }
            model.append(new N('bind', props));
          });
        };
        bindingsFor(principle, principle.type);
        _.each(extras, function(extra, mapping) {
          model.append(new N('bind', { nodeset: xPath(mapping), relevant: xPath(principle.type, mapping) + ' = \'NEW\'' }));
          bindingsFor(extra, mapping);
        });

        return head;
      }());
      root.append(head);

      var body = (function generateBody() {
        // N.B. we may not want pages for single-object forms
        var body = new N('h:body', { class: 'pages' });

        var fieldsFor = function(schema, mapping) {
          var group = new N('group', { appearance: 'field-list', ref: xPath(mapping) });
          _.each(schema.fields, function(conf, f) {
            var attrs = _.extend({ ref: xPath(mapping, f) }, X.extraAttributesFor(conf));
            var input = new N('input', attrs);
            input.append(new N('label', X.translationFor(schema.type, f)));
            group.append(input);
          });
          return group;
        };

        body.append(fieldsFor(principle, principle.type));

        _.each(extras, function(extra, mapping) {
          var group = fieldsFor(extra, mapping);
          group.prepend(new N('label', X.translationFor(extra.type, 'new')));
          body.append(group);
        });

        return body;
      }());
      root.append(body);

      return root.xml();
    };

    this.generateXform = function(schema, options) {
      if(options) {
        return generateXformWithOptions(schema, options);
      }
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
        if(conf.required) {
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

    this.jsToFormInstanceData = function(obj, fields) {
      if(arguments.length !== 2) {
        throw new Error('Illegal args.');
      }
      var root = $('<' + obj.type + '>');
      _.each(obj, function(val, key) {
        if(_.contains(fields, key)) {
          val = val._id || val;
          $('<' + key + '>', { text: val }).appendTo(root);
        }
      });
      return root[0].outerHTML;
    };
  }
]);
