const withElements = (nodes) => {
  return Array
    .from(nodes)
    .filter((node) => node.nodeType === Node.ELEMENT_NODE);
};

const nodesToJs = (data, repeatPaths, path) => {
  repeatPaths = repeatPaths || [];
  path = path || '';
  const result = {};
  withElements(data).forEach((n) => {
    const typeAttribute = n.attributes.getNamedItem('type');
    const updatedPath = path + '/' + n.nodeName;
    let value;

    const hasChildren = withElements(n.childNodes).length > 0;
    if(hasChildren) {
      value = nodesToJs(n.childNodes, repeatPaths, updatedPath);
    } else if(typeAttribute && typeAttribute.value === 'binary') {
      // this is attached to the doc instead of inlined
      value = '';
    } else {
      value = n.textContent;
    }

    if(repeatPaths.indexOf(updatedPath) !== -1) {
      if(!result[n.nodeName]) {
        result[n.nodeName] = [];
      }
      result[n.nodeName].push(value);
    } else {
      result[n.nodeName] = value;
    }
  });
  return result;
};

const getHiddenFieldListRecursive = (nodes, prefix, current) => {
  nodes.forEach(node => {
    const path = prefix + node.nodeName;
    const attr = node.attributes.getNamedItem('tag');
    if (attr && attr.value && attr.value.toLowerCase() === 'hidden') {
      current.add(path);
    } else {
      const children = withElements(node.childNodes);
      getHiddenFieldListRecursive(children, path + '.', current);
    }
  });
};

const findCurrentElement = (elem, name, childMatcher) => {
  if(childMatcher) {
    const matcher = childMatcher(name);
    const found = elem.find(matcher);
    if(found.length > 1) {
      // eslint-disable-next-line no-console
      console.warn(`Enketo bindJsonToXml: Using the matcher "${matcher}" we found ${found.length} elements. ` +
        'We should only ever bind one.', elem, name);
    }
    return found;
  }

  return elem.children(name);
};

const findChildNode = (root, childNodeName) => {
  return withElements(root.childNodes)
    .find((node) => node.nodeName === childNodeName);
};

const repeatsToJs = (data) => {
  const repeatNode = findChildNode(data, 'repeat');
  if(!repeatNode) {
    return;
  }

  const repeats = {};

  withElements(repeatNode.childNodes).forEach((repeated) => {
    const key = repeated.nodeName + '_data';
    if(!repeats[key]) {
      repeats[key] = [];
    }
    repeats[key].push(nodesToJs(repeated.childNodes));
  });

  return repeats;
};

const bindJsonToXml = (elem, data, childMatcher) => {
  // Enketo will remove all elements that have the "template" attribute
  // https://github.com/enketo/enketo-core/blob/51c5c2f494f1515a67355543b435f6aaa4b151b4/src/js/form-model.js#L436-L451
  elem.removeAttr('jr:template');
  elem.removeAttr('template');

  if (data === null || typeof data !== 'object') {
    elem.text(data);
    return;
  }

  if (Array.isArray(data)) {
    const parent = elem.parent();
    elem.remove();

    data.forEach((dataEntry) => {
      const clone = elem.clone();
      bindJsonToXml(clone, dataEntry);
      parent.append(clone);
    });
    return;
  }

  if (!elem.children().length) {
    bindJsonToXml(elem, data._id);
  }

  Object.keys(data).forEach((key) => {
    const value = data[key];
    const current = findCurrentElement(elem, key, childMatcher);
    bindJsonToXml(current, value);
  });
};

const getRepeatPaths = (formXml) => {
  return $(formXml)
    .find('repeat[nodeset]')
    .map((idx, element) => {
      return $(element).attr('nodeset');
    })
    .get();
};

const reportRecordToJs = (record, formXml) => {
  const root = $.parseXML(record).firstChild;
  if(!formXml) {
    return nodesToJs(root.childNodes);
  }
  const repeatPaths = getRepeatPaths(formXml);
  return nodesToJs(root.childNodes, repeatPaths, '/' + root.nodeName);
};

module.exports = {
  bindJsonToXml,

  getHiddenFieldList: (model, dbDocFields) => {
    model = $.parseXML(model).firstChild;
    if(!model) {
      return;
    }
    const children = withElements(model.childNodes);
    const fields = new Set(dbDocFields);
    getHiddenFieldListRecursive(children, '', fields);
    return [...fields];
  },

  getRepeatPaths,

  reportRecordToJs,

  /*
   * Given a record, returns the parsed doc and associated docs
   * result.doc: the main document
   * result.siblings: more documents at the same level. These docs are docs
   *   that must link to the main doc, but the main doc must also link to them,
   *   for example the main doc may be a place, and a CHW a sibling.
   *   see: contacts-edit.component.ts:saveSiblings
   * result.repeats: documents from repeat nodes. These docs are simple docs
   *   that we wish to save independently of the main document.
   *   see: contacts-edit.component.ts:saveRepeated
   */
  contactRecordToJs: (record) => {
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
      .filter((node) => !NODE_NAMES_TO_IGNORE.includes(node.nodeName) && node.childElementCount > 0)
      .forEach((child) => {
        if (!result.doc) {
          // First child is the main result, rest are siblings
          result.doc = nodesToJs(child.childNodes);
          return;
        }
        result.siblings[child.nodeName] = nodesToJs(child.childNodes);
      });

    return result;
  }
};
