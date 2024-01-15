/*
 * Simple module for calculating XPath of an element using the browser's built-
 * in XML support.
 *
 * Copyright (c) 2009, Mozilla Foundation
 *
 * Taken from Firebug, licensed under BSD:
 * https://github.com/firebug/firebug/blob/master/extension/content/firebug/lib/xpath.js
 */

export const Xpath:any = {};

// ********************************************************************************************* //
// XPATH

/**
 * Gets an XPath for an element which describes its hierarchical location.
 */
Xpath.getElementXPath = function(element)
{
    if (element && element.id)
        return '//*[@id="' + element.id + '"]';
    else
        return Xpath.getElementTreeXPath(element);
};

Xpath.getElementTreeXPath = function(element)
{
    var paths: string[] = [];

    // Use nodeName (instead of localName) so namespace prefix is included (if any).
    for (; element && element.nodeType == Node.ELEMENT_NODE; element = element.parentNode)
    {
        var index = 0;
        var hasFollowingSiblings = false;
        for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling)
        {
            // Ignore document type declaration.
            if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
                continue;

            if (sibling.nodeName == element.nodeName)
                ++index;
        }

        for (var sibling = element.nextSibling; sibling && !hasFollowingSiblings;
            sibling = sibling.nextSibling)
        {
            if (sibling.nodeName == element.nodeName)
                hasFollowingSiblings = true;
        }

        var tagName = (element.prefix ? element.prefix + ":" : "") + element.localName;
        var pathIndex = (index || hasFollowingSiblings ? "[" + (index + 1) + "]" : "");
        paths.splice(0, 0, tagName + pathIndex);
    }

    return paths.length ? "/" + paths.join("/") : null;
};
