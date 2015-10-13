var _ = require('underscore');

/**
 * An internal representation of an XML node.
 */
function N(tagName, text, attrs, children) {
  var self = this;
  self.tagName = tagName;
  if(arguments.length === 2) {
    if(_.isArray(text)) {
      children = text; text = null;
    } else if(typeof text === 'object') {
      attrs = text; text = null;
    }
  } else if(arguments.length === 3) {
    if(_.isArray(attrs)) {
      children = attrs; attrs = null;
      if(typeof text === 'object') {
        attrs = text;
        text = null;
      }
    }
  }

  self.text = text;
  self.attrs = attrs || {};
  self.children = children || [];

  self.prepend = function(child) {
    self.children.unshift(child);
  };

  self.append = function(child_or_children) {
    if(_.isArray(child_or_children)) {
      self.children = self.children.concat(child_or_children);
    } else {
      self.children.push(child_or_children);
    }
  };

  self.appendTo = function(parent) {
    parent.children.push(self);
  };

  self.xml = function() {
    var xml = '<' + self.tagName;
    _.each(Object.keys(self.attrs).sort(), function(key) {
      xml += ' ' + key + '="' + self.attrs[key] + '"';
    });
    if(self.text || self.children.length) {
      xml += '>';
      if(self.text) {
        xml += self.text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
      }
      if(self.children) {
        _.each(self.children, function(child) {
          xml += child.xml();
        });
      }
      xml += '</' + tagName + '>';
    } else {
      xml += '/>';
    }
    return xml;
  };
}


angular.module('inboxServices').service('EnketoTranslation', [
  '$translate',
  function($translate) {
    function extraAttributesFor(conf) {
      var extras = {};
      var typeString = conf.type;
      if(typeString === 'text') {
        extras.appearance = 'multiline';
      } else if(/^db:/.test(typeString)) {
        extras.appearance = 'db-object';
      }
      return extras;
    }

    function getBindingType(conf) {
      return conf.type;
    }

    function translationFor() {
      var key = Array.prototype.slice.call(arguments).join('.');
      return $translate.instant(key);
    }

    function modelFor(schema, rootNode) {
      var node = new N(rootNode || schema.type);
      _.each(schema.fields, function(conf, name) {
        node.append(new N(name));
      });
      return node;
    }

    function generateXformWithOptions(principle, extras) {
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
          var modelData = modelFor(principle);
          modelData.attrs.id = principle.type;
          modelData.attrs.version = 1;
          modelData.append(meta);
          instance.append(modelData);
        }
        // add some meta (not sure what this is for)

        // bindings
        var bindingsFor = function(schema, mapping) {
          _.each(schema.fields, function(conf, f) {
            if (conf.hide_in_form) {
              return;
            }
            var props = {
              nodeset: xPath(mapping, f),
              type: getBindingType(conf),
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
        var body = new N('h:body');
        if(extras) {
          body.attrs.class = 'pages';
        }

        var groupFor = function(schema, mapping) {
          return new N('group',
              { appearance: 'field-list', ref: xPath(mapping) },
              fieldsFor(schema, mapping));
        };

        var fieldsFor = function(schema, mapping) {
          var fields = [];
          _.each(schema.fields, function(conf, f) {
            if (conf.hide_in_form) {
              return;
            }
            var attrs = _.extend({ ref: xPath(mapping, f) }, extraAttributesFor(conf));
            if (extras && extras.hasOwnProperty(f)) {
              if (attrs.appearance) {
                attrs.appearance += ' allow-new';
              } else {
                attrs.appearance = 'allow-new';
              }
            }
            var input = new N('input', attrs);
            input.append(new N('label', translationFor(schema.type, 'field', f)));
            fields.push(input);
          });
          return fields;
        };

        if(extras) {
          body.append(groupFor(principle, principle.type));
        } else {
          body.append(fieldsFor(principle, principle.type));
        }

        _.each(extras, function(extra, mapping) {
          var group = groupFor(extra, mapping);
          group.prepend(new N('label', translationFor('contact.type', extra.type, 'new')));
          body.append(group);
        });

        return body;
      }());
      root.append(body);

      return root.xml();
    }

    this.generateXform = function(schema, options) {
      if(options || true) {
        return generateXformWithOptions(schema, options);
      }
    };

    this.jsToFormInstanceData = function(obj, fields) {
      if (!obj || !obj.type) {
        return;
      }
      var root = new N(obj.type);
      _.each(obj, function(val, key) {
        if(_.contains(fields, key)) {
          root.append(new N(key, val._id || val));
        }
      });
      if (root.children.length === 0) {
        return;
      }
      return root.xml();
    };

    var nodesToJs = function(data) {
      var fields = {};
      _.each(data, function(n) {
        if(n.nodeType !== Node.ELEMENT_NODE ||
            n.nodeName === 'meta') {
          return;
        }
        fields[n.nodeName] = n.textContent;
      });
      return fields;
    };

    this.recordToJs = function(record) {
      var root = $.parseXML(record).firstChild;
      if(root.nodeName === 'data') {
        var siblings = {};
        var first = null;
        _.each(root.childNodes, function(child) {
          if(child.nodeType !== Node.ELEMENT_NODE ||
              child.nodeName === 'meta' ||
              child.nodeName === 'inputs') {
            return;
          }
          if(!first) {
            first = child;
            return;
          }
          siblings[child.nodeName] = nodesToJs(child.childNodes);
        });
        return [ nodesToJs(first.childNodes), siblings ];
      }
      return nodesToJs(root.childNodes);
    };
  }
]);
