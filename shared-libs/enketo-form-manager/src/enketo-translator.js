const getHiddenFieldListRecursive = (nodes, prefix, current) => {
  nodes.forEach(node => {
    const path = prefix + node.nodeName;
    const attr = node.attributes.getNamedItem('tag');
    if (attr && attr.value === 'hidden') {
      current.push(path);
    } else {
      const children = EnketoTranslationUtils.withElements(node.childNodes);
      getHiddenFieldListRecursive(children, path + '.', current);
    }
  });
};

const findCurrentElement = (elem, name, childMatcher) => {
  if (childMatcher) {
    const matcher = childMatcher(name);
    const found = elem.find(matcher);
    if (found.length > 1) {
      // eslint-disable-next-line no-console
      console.warn(`Enketo bindJsonToXml: Using the matcher "${matcher}" we found ${found.length} elements. ` +
        'We should only ever bind one.', elem);
    }
    return found;
  } else {
    return elem.children(name);
  }
};

class EnketoTranslator {
  static bindJsonToXml(elem, data, childMatcher) {
    Object.keys(data).forEach((key) => {
      const value = data[key];
      const current = findCurrentElement(elem, key, childMatcher);
      if (value !== null && typeof value === 'object') {
        if (current.children().length) {
          // childMatcher intentionally does not recurse. It exists to
          // allow the initial layer of binding to be flexible.
          EnketoTranslator.bindJsonToXml(current, value);
        } else {
          current.text(value._id);
        }
      } else {
        current.text(value);
      }
    });
  }

  static getHiddenFieldList (model) {
    model = $.parseXML(model).firstChild;
    if (!model) {
      return;
    }
    const children = EnketoTranslationUtils.withElements(model.childNodes);
    const fields = [];
    getHiddenFieldListRecursive(children, '', fields);
    return fields;
  }

  static getRepeatPaths(formXml) {
    return $(formXml)
      .find('repeat[nodeset]')
      .map((idx, element) => {
        return $(element).attr('nodeset');
      })
      .get();
  }

  static reportRecordToJs(record, formXml) {
    const root = $.parseXML(record).firstChild;
    if (!formXml) {
      return EnketoTranslationUtils.nodesToJs(root.childNodes);
    }
    const repeatPaths = EnketoTranslator.getRepeatPaths(formXml);
    return EnketoTranslationUtils.nodesToJs(root.childNodes, repeatPaths, '/' + root.nodeName);
  }
}

class EnketoTranslationUtils {
  static withElements(nodes) {
    return Array
      .from(nodes)
      .filter((node) => node.nodeType === Node.ELEMENT_NODE);
  }

  static nodesToJs(data, repeatPaths, path) {
    repeatPaths = repeatPaths || [];
    path = path || '';
    const result = {};
    EnketoTranslationUtils.withElements(data).forEach((n) => {
      const dbDocAttribute = n.attributes.getNamedItem('db-doc');
      if (dbDocAttribute && dbDocAttribute.value === 'true') {
        return;
      }

      const typeAttribute = n.attributes.getNamedItem('type');
      const updatedPath = path + '/' + n.nodeName;
      let value;

      const hasChildren = EnketoTranslationUtils.withElements(n.childNodes).length > 0;
      if (hasChildren) {
        value = EnketoTranslationUtils.nodesToJs(n.childNodes, repeatPaths, updatedPath);
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
  }
}

module.exports = {
  EnketoTranslator,
  EnketoTranslationUtils
};
