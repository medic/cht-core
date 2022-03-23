/*
 * Simple module for calculating XPath of an element using the browser's built-
 * in XML support.
 *
 * Copyright (c) 2009, Mozilla Foundation
 *
 * Taken from Firebug, licensed under BSD:
 * https://github.com/firebug/firebug/blob/master/extension/content/firebug/lib/xpath.js
 */

/**
 * Gets an XPath for an element which describes its hierarchical location.
 */
const getElementXPath = function(element) {
  if(element && element.id) {
    return '//*[@id="' + element.id + '"]';
  } else {
    return getElementTreeXPath(element);
  }
};

const getElementTreeXPath = function(element) {
  const paths = [];

  // Use nodeName (instead of localName) so namespace prefix is included (if any).
  for(; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
    let index = 0;
    let hasFollowingSiblings = false;
    for(let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
      // Ignore document type declaration.
      if(sibling.nodeType === Node.DOCUMENT_TYPE_NODE) {
        continue;
      }

      if(sibling.nodeName === element.nodeName) {
        ++index;
      }
    }

    for(let sibling = element.nextSibling; sibling && !hasFollowingSiblings;
      sibling = sibling.nextSibling) {
      if(sibling.nodeName === element.nodeName) {
        hasFollowingSiblings = true;
      }
    }

    const tagName = (element.prefix ? element.prefix + ':' : '') + element.localName;
    const pathIndex = (index || hasFollowingSiblings ? '[' + (index + 1) + ']' : '');
    paths.splice(0, 0, tagName + pathIndex);
  }

  return paths.length ? '/' + paths.join('/') : null;
};

module.exports = {
  getElementXPath
};
