angular.module('inboxServices').service('EnketoTranslation',
  function(
    $log
  ) {
    'use strict';
    'ngInject';

    const withElements = nodes => {
      return Array.from(nodes)
        .filter(node => node.nodeType === Node.ELEMENT_NODE);
    };

    const findChildNode = function(root, childNodeName) {
      return withElements(root.childNodes)
        .find(node => node.nodeName === childNodeName);
    };

    const getHiddenFieldList = (nodes, prefix, current) => {
      nodes.forEach(node => {
        const path = prefix + node.nodeName;
        const attr = node.attributes.getNamedItem('tag');
        if (attr && attr.value === 'hidden') {
          current.push(path);
        } else {
          const children = withElements(node.childNodes);
          getHiddenFieldList(children, path + '.', current);
        }
      });
    };

    const nodesToJs = function(data, repeatPaths, path) {
      repeatPaths = repeatPaths || [];
      path = path || '';
      const result = {};
      withElements(data).forEach(function(n) {
        const dbDocAttribute = n.attributes.getNamedItem('db-doc');
        if (dbDocAttribute && dbDocAttribute.value === 'true') {
          return;
        }

        const typeAttribute = n.attributes.getNamedItem('type');
        const updatedPath = path + '/' + n.nodeName;
        let value;

        const hasChildren = withElements(n.childNodes).length > 0;
        if (hasChildren) {
          value = nodesToJs(n.childNodes, repeatPaths, updatedPath);
        } else if (typeAttribute && typeAttribute.value === 'binary') {
          // this is attached to the doc instead of inlined
          value = '';
        } else {
          value = n.textContent;
        }

        if (repeatPaths.indexOf(updatedPath) !== -1) {
          if (!result[n.nodeName]) {
            result[n.nodeName] = [];
          }
          result[n.nodeName].push(value);
        } else {
          result[n.nodeName] = value;
        }
      });
      return result;
    };

    const repeatsToJs = function(data) {
      const repeatNode = findChildNode(data, 'repeat');
      if(!repeatNode) {
        return;
      }

      const repeats = {};

      withElements(repeatNode.childNodes).forEach(function(repeated) {
        const key = repeated.nodeName + '_data';
        if(!repeats[key]) {
          repeats[key] = [];
        }
        repeats[key].push(nodesToJs(repeated.childNodes));
      });

      return repeats;
    };

    const findCurrentElement = function(elem, name, childMatcher) {
      if (childMatcher) {
        const matcher = childMatcher(name);
        const found = elem.find(matcher);
        if (found.length > 1) {
          $log.warn(`Enketo bindJsonToXml: Using the matcher "${matcher}" we found ${found.length} elements. ` +
            'We should only ever bind one.', elem);
        }
        return found;
      } else {
        return elem.children(name);
      }
    };

    const bindJsonToXml = function(elem, data, childMatcher) {
      Object.keys(data).forEach(function(key) {
        const value = data[key];
        const current = findCurrentElement(elem, key, childMatcher);
        if (value !== null && typeof value === 'object') {
          if (current.children().length) {
            // childMatcher intentionally does not recurse. It exists to
            // allow the initial layer of binding to be flexible.
            bindJsonToXml(current, value);
          } else {
            current.text(value._id);
          }
        } else {
          current.text(value);
        }
      });
    };

    return {
      getHiddenFieldList: function(model) {
        model = $.parseXML(model).firstChild;
        if (!model) {
          return;
        }
        const children = withElements(model.childNodes);
        const fields = [];
        getHiddenFieldList(children, '', fields);
        return fields;
      },

      reportRecordToJs: function(record, formXml) {
        const root = $.parseXML(record).firstChild;
        if (!formXml) {
          return nodesToJs(root.childNodes);
        }
        const repeatPaths = $(formXml)
          .find('repeat[nodeset]')
          .map(function() {
            return $(this).attr('nodeset');
          })
          .get();
        return nodesToJs(root.childNodes, repeatPaths, '/' + root.nodeName);
      },

      /*
       * Given a record, returns the parsed doc and associated docs
       * result.doc: the main document
       * result.siblings: more documents at the same level. These docs are docs
       *   that must link to the main doc, but the main doc must also link to them,
       *   for example the main doc may be a place, and a CHW a sibling.
       *   see: contacts-edit.js:saveSiblings
       * result.repeats: documents from repeat nodes. These docs are simple docs
       *   that we wish to save independently of the main document.
       *   see: contacts-edit.js:saveRepeated
       */
      contactRecordToJs: function(record) {
        const root = $.parseXML(record).firstChild;

        const result = {
          doc: null,
          siblings: {},
        };
        const repeats = repeatsToJs(root);
        if (repeats) {
          result.repeats = repeats;
        }

        const NODE_NAMES_TO_IGNORE = ['meta', 'inputs', 'repeat'];

        withElements(root.childNodes)
          .filter(node => !NODE_NAMES_TO_IGNORE.includes(node.nodeName))
          .forEach(function(child) {
            // First child is the main result, rest are siblings
            if(!result.doc) {
              result.doc = nodesToJs(child.childNodes);
            } else {
              result.siblings[child.nodeName] = nodesToJs(child.childNodes);
            }
          });
        return result;
      },

      bindJsonToXml: bindJsonToXml
    };
  }
);
