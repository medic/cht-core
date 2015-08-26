require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={
    "widgets": [
        "./src/widget/note/notewidget",
        "./src/widget/select-desktop/selectpicker",
        "./src/widget/select-mobile/selectpicker",
        "./src/widget/table/tablewidget",
        "./src/widget/radio/radiopicker",
        "./src/widget/date/datepicker-extended",
        "./src/widget/time/timepicker-extended",
        "./src/widget/datetime/datetimepicker-extended",
        "./src/widget/horizontal-choices/horizontalchoices"
    ]
}

},{}],2:[function(require,module,exports){
module.exports = window.jQuery;

},{}],3:[function(require,module,exports){
/**
 * XML merging class
 * Merge multiple XML sources
 * 
 * @package     MergeXML
 * @author      Vallo Reima
 * @copyright   (C)2014
 */

/**
 * AMD/CommonJS wrapper
 * @param {object} root
 * @param {function} factory
 */
(function(root, factory) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module
    define([], factory);
  } else if (typeof exports === 'object') {
    // Does not work with strict CommonJS, 
    // but only CommonJS-like environments 
    // that support module.exports, like Node
    module.exports = factory();
  } else {
    // Direct call, root is the owner (window)
    root.MergeXML = factory();
  }
}(this, function() {
  /**
   * Return a function as the exported value
   * @param {object} opts -- stay, join, updn (see readme)
   */
  return function(opts) {

    var mde;        /* access mode 0,1,2 */
    var msv;        /* MS DOM version */
    var psr;        /* DOM parser object */
    var nse;        /* parsererror namespace */
    var xpe;        /* xPath evaluator */
    var nsr;        /* namespace resolver */
    var nsd = '_';  /* default namespace prefix */
    var stay;       /* overwrite protection */
    var join;       /* joining root name and status*/
    var updn;       /* update nodes sequentially by name */
    var XML_ELEMENT_NODE = 1;
    var XML_TEXT_NODE = 3;
    var XML_COMMENT_NODE = 8;
    var XML_PI_NODE = 7;
    var that = this;

    that.Init = function() {
      that.dom = null; /* result DOM object */
      that.nsp = {};   /* namespaces */
      that.count = 0; /* adding counter */
      join[1] = false;
      if (mde > 0) {
        that.error = {code: '', text: ''};
      }
      return (mde > 0);
    };

    /**
     * add XML file
     * @param {object} file -- FileList element
     * @return {object|false}
     */
    that.AddFile = function(file) {
      var rlt;
      if (!file || !file.target) {
        rlt = Error('nof');
      } else if (!file.target.result) {
        rlt = Error('emf');
      } else {
        rlt = that.AddSource(file.target.result);
      }
      return rlt;
    };

    /**
     * add XML string
     * @param {string|oobject} xml
     * @return mixed -- false - bad content
     *                  object - result
     */
    that.AddSource = function(xml) {
      var rlt, doc;
      if (typeof xml === 'object') {
        doc = that.Get(1, xml) ? xml : false;
        if (doc && ((mde === 1 && !window.DOMParser) || (mde === 2 && !doc.selectSingleNode('/')))) {
          doc = null; /* not compatible */
        }
      } else {
        try {
          doc = Load(xml);
        } catch (e) {
          doc = false;
        }
      }
      if (doc === null) {
        rlt = Error('nos');
      } else if (doc === false) {
        rlt = Error('inv');
      } else if (doc === true) {
        that.nsp = NameSpaces(that.dom.documentElement);
        that.count = 1;
        rlt = that.dom;
      } else if (CheckSource(doc)) {
        Merge(doc, '/');  /* add to existing */
        if (join[1] === true) {
          var tmp = that.dom.createTextNode("\r\n");
          that.dom.documentElement.appendChild(tmp);
        }
        that.count++;
        rlt = that.dom;
      } else {
        rlt = false;
      }
      return rlt;
    };

    /**
     * load the source into dom object
     * @param {object|string} src -- the source
     * @return {mixed} -- false - error
     *                    true - 1st load
     *                    object - loaded doc
     */
    var Load = function(src) {
      var rlt, doc;
      if (mde === 1) {
        if (that.dom) {
          doc = psr.parseFromString(src, 'text/xml');
          rlt = ParseError(doc) ? doc : false;
        } else {
          that.dom = psr.parseFromString(src, 'text/xml');
          rlt = ParseError(that.dom) ? true : false;
        }
      } else if (that.dom) {
        doc = new ActiveXObject(msv);
        doc.async = false;
        rlt = doc.loadXML(src) ? doc : false;
      } else {
        that.dom = new ActiveXObject(msv);
        that.dom.async = false;
        that.dom.setProperty('SelectionLanguage', 'XPath');
        rlt = that.dom.loadXML(src) ? true : false;
      }
      return rlt;
    };

    /**
     * check for xml syntax (mode 1)
     * @param {object} doc
     * @return {bool} -- true - ok
     */
    var ParseError = function(doc) {
      return doc.getElementsByTagNameNS(nse, 'parsererror').length === 0;
    };

    /**
     * 
     * @param {object} doc
     * @return {bool} -- true - ok
     */
    var CheckSource = function(doc) {
      var rlt = true;
      if (doc.inputEncoding !== that.dom.inputEncoding || doc.xmlEncoding !== that.dom.xmlEncoding) {
        rlt = Error('enc');
      } else if (doc.documentElement.namespaceURI !== that.dom.documentElement.namespaceURI) { /* $dom->documentElement->lookupnamespaceURI(NULL) */
        rlt = Error('nse');
      } else if (doc.documentElement.nodeName !== that.dom.documentElement.nodeName) {
        if (!join[0]) {
          rlt = Error('dif');
        } else if (!join[1]) {
          var enc = that.dom.inputEncoding ? that.dom.inputEncoding : (that.dom.xmlEncoding ? that.dom.xmlEncoding : 'utf-8'),
                  ver = that.dom.xmlVersion ? that.dom.xmlVersion : '1.0';
          var xml = '<?xml version="' + ver + '" encoding="' + enc + "\"?>\r\n<" + join[0] + ">\r\n</" + join[0] + '>';
          var d = Load(xml);
          if (d) {
            var tmp = that.dom.documentElement.cloneNode(true);
            d.documentElement.appendChild(tmp);
            tmp = d.createTextNode("\r\n");
            d.documentElement.appendChild(tmp);
            that.dom = d;
            join[1] = true;
          } else {
            rlt = Error('jne');
            join[1] = null;
          }
        }
      }
      if (rlt) {
        var a = NameSpaces(doc.documentElement);
        for (var c in a) {
          if (!that.nsp[c]) {
            that.dom.documentElement.setAttribute('xmlns:' + c, a[c]);
            that.nsp[c] = a[c];
          }
        }
        if (!updn) {
          nsr = null;
        } else if (mde === 1) {
          nsr = Resolver;
        } else {
          ResolverIE();
        }
      }
      return rlt;
    };
    /**
     * join 2 dom objects recursively
     * @param {object} src -- current source node
     * @param {string} pth -- current source path
     */
    var Merge = function(src, pth) {
      for (var i = 0; i < src.childNodes.length; i++) {
        var tmp;
        var node = src.childNodes[i]; //$node->getNodePath()
        var path = GetNodePath(src.childNodes, node, pth, i);
        var obj = that.Query(path);
        if (node.nodeType === XML_ELEMENT_NODE) {
          var flg = true;  /* replace existing node by default */
          if (obj === null || obj.namespaceURI !== node.namespaceURI) {
            tmp = node.cloneNode(true); /* take existing node */
            obj = that.Query(pth); /* destination parent */
            obj.appendChild(tmp); /* add a node */
          } else {
            if (ArraySearch(obj.getAttribute('stay'), stay) !== false) {
              flg = false; /* don't replace */
            }
            if (flg) {
              try {
                for (var j = 0; j < node.attributes.length; j++) { /* add/replace attributes */
                  obj.setAttribute(node.attributes[j].nodeName, node.attributes[j].nodeValue);
                }
              } catch (e) {
                /* read-only node */
              }
            }
          }
          if (node.hasChildNodes() && flg) {
            Merge(node, path); /* go to subnodes */
          }
        } else if (node.nodeType === XML_TEXT_NODE || node.nodeType === XML_COMMENT_NODE) { /* leaf node */
          if (obj === null || obj.nodeType !== node.nodeType) {
            obj = that.Query(pth);    /* destination parent node */
            if (node.nodeType === XML_TEXT_NODE) {
              tmp = that.dom.createTextNode(node.nodeValue); /* add text */
            } else {
              tmp = that.dom.createComment(node.nodeValue);  /* add comment */
            }
            obj.appendChild(tmp); /* add leaf */
          } else {
            obj.nodeValue = node.nodeValue; /* replace leaf */
          }
        }
      }
    };

    /**
     * form the node xPath
     * @param {object} nodes -- child nodes
     * @param {object} node -- current child
     * @param {string} pth -- parent path
     * @param {int} eln -- element sequence number
     * @return {string} query path
     */
    var GetNodePath = function(nodes, node, pth, eln) {
      var p, i;
      var j = 0;
      if (node.nodeType === XML_ELEMENT_NODE) {
        for (i = 0; i <= eln; i++) {
          if ((updn && nodes[i].nodeType === node.nodeType && nodes[i].nodeName === node.nodeName) ||
                  (!updn && nodes[i].nodeType !== XML_PI_NODE)) {
            j++;
          }
        }
        if (updn) {
          var f = false;
          var a = NameSpaces(node);
          for (var c in a) {
            if (c !== nsd) {
              that.nsp[c] = a[c];
              f = (mde === 2);
            }
          }
          if (f) {
            ResolverIE();
          }
          if (node.prefix) {
            p = node.prefix + ':';
          } else if (that.nsp[nsd]) {
            p = nsd + ':';
          } else {
            p = '';
          }
          p += (node.localName ? node.localName : node.baseName);
        } else {
          p = 'node()';
        }
      } else if (node.nodeType === XML_TEXT_NODE || node.nodeType === XML_COMMENT_NODE) {
        for (i = 0; i <= eln; i++) {
          if (nodes[i].nodeType === node.nodeType) {
            j++;
          }
        }
        p = node.nodeType === XML_TEXT_NODE ? 'text()' : 'comment()';
      } else {
        p = pth;
      }
      if (j) {
        p = pth + (pth.slice(-1) === '/' ? '' : '/') + p + '[' + j + ']';
      }
      return p;
    };

    /**
     * get node's namespaces
     * @param {object} node
     * @return {array} 
     */
    var NameSpaces = function(node) {
      var rlt = {};
      var attrs = node.attributes;
      for (var i = 0; i < attrs.length; ++i) {
        var a = attrs[i].name.split(':');
        if (a[0] === 'xmlns') {
          var c = a[1] ? a[1] : nsd;
          rlt[c] = attrs[i].value;
        }
      }
      return rlt;
    };

    /**
     * xPath query
     * @param {string} qry -- query statement
     * @return {object}
     */
    that.Query = function(qry) {
      var rlt;
      if (join[1]) {
        qry = '/' + that.dom.documentElement.nodeName + (qry === '/' ? '' : qry);
      }
      try {
        if (mde === 1) {
          rlt = xpe.evaluate(qry, that.dom, nsr, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          rlt = rlt.singleNodeValue;
        } else {
          rlt = that.dom.selectSingleNode(qry);
        }
      }
      catch (e) {
        rlt = null; /* no such path */
      }
      return rlt;
    };

    /**
     * XPathNSResolver 
     * @param {string} pfx node prefix
     * @return {string} namespace URI
     */
    var Resolver = function(pfx) {
      return that.nsp[pfx] || null;
    };

    /**
     * XPath IE Resolver 
     */
    var ResolverIE = function() {
      var p = '';
      for (var c in that.nsp) {
        p += ' xmlns:' + c + '=' + "'" + that.nsp[c] + "'";
      }
      if (p) {
        that.dom.setProperty('SelectionNamespaces', p.substr(1));
      }
    };

    /**
     * find array memeber by value
     * @param {array} arr
     * @param {mixed} val
     * @returns {mixed}
     */
    var ArraySearch = function(arr, val) {
      var rlt = false;
      for (var key in arr) {
        if (arr[key] === val) {
          rlt = key;
          break;
        }
      }
      return rlt;
    };

    /**
     * get result
     * @param {int} flg -- 0 - object
     *                     1 - xml
     *                     2 - html
     * @param {object} doc
     * @return {mixed}
     */
    that.Get = function(flg, doc) {
      var rlt;
      if (flg && !doc) {
        doc = that.dom;
      }
      if (!flg) {
        rlt = that.dom;
      } else if (!doc) {
        rlt = '';
      } else if (doc.xml) {
        rlt = doc.xml;
      } else {
        try {
          rlt = (new XMLSerializer()).serializeToString(doc);
        } catch (e) {
          rlt = null;
        }
      }
      if (rlt && flg === 2) { /* make html view */
        if (join[1]) {
          var k = rlt.indexOf('<' + join[0]);
          rlt = rlt.substr(0, k) + "\r\n" + rlt.substr(k);
        }
        rlt = rlt.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ |\t/g, '&nbsp;'); /* tags and spaces */
        rlt = rlt.replace(/(\r\n|\n|\r)/g, '<br>');  /* line breaks */
      }
      return rlt;
    };

    /**
     * set error message
     * @param {string} err -- token
     * @return {false}
     */
    var Error = function(err) {
      var errs = {
        nod: 'XML DOM is not supported in this browser',
        nox: 'xPath is not supported in this browser',
        nos: 'Incompatible source object',
        nof: 'File not found',
        emf: 'File is empty', /* possible delivery fault */
        inv: 'Invalid XML source',
        enc: 'Different encoding',
        dif: 'Different root nodes',
        jne: 'Invalid join parameter',
        nse: 'Namespace incompatibility',
        und: 'Undefined error'
      };
      that.error.code = errs[err] ? err : 'und';
      that.error.text = errs[that.error.code];
      return false;
    };

    /**
     * identify browser functionality
     * @return {int|string} mode number or error code
     */
    var GetMode = function() {
      var m;
      var f = false;
      var vers = [
        'MSXML2.DOMDocument.6.0',
        'MSXML2.DOMDocument.3.0',
        'MSXML2.DOMDocument',
        'Microsoft.XmlDom'
      ];
      var n = vers.length;
      for (var i = 0; i < n; i++) {
        try {
          var d = new ActiveXObject(vers[i]);
          d.async = false;
          f = true;   /* DOM supported */
          if (d.loadXML('<x></x>') && d.selectSingleNode('/')) {
            break;    /* xPath supported */
          }
        } catch (e) {
          /* skip */
        }
      }
      if (f) {
        if (i < n) {
          msv = vers[i];
          m = 2;  /* IE mode */
        } else {
          m = 'nox';  /* no xPath */
        }
      } else if (!window.DOMParser) {
        m = 'nod';  /* no DOM */
      } else if (!window.XPathEvaluator) {
        m = 'nox';  /* no xPath */
      } else {
        psr = new DOMParser();
        var e = psr.parseFromString('Invalid', 'text/xml'); /* to detect source error */
        nse = e.getElementsByTagName('parsererror')[0].namespaceURI;
        xpe = new XPathEvaluator();
        m = 1;  /*  Firefox, Safari, Chrome, Opera */
      }
      return m;
    };

    if (typeof opts !== 'object') {
      opts = {};
    }
    /* set stay attribute value to check */
    if (typeof opts.stay === 'undefined') {
      stay = ['all'];
    } else if (!opts.stay) {
      stay = [];
    } else if (typeof opts.stay === 'object' && opts.stay instanceof Array) {
      stay = opts.stay;
    } else {
      stay = [opts.stay];
    }
    /* set join condtion for different roots */
    if (typeof opts.join === 'undefined') {
      join = ['root'];
    } else {
      join = [opts.join ? String(opts.join) : false];
    }
    /* set update sequence manner */
    if (typeof opts.updn === 'undefined') {
      updn = true;
    } else {
      updn = opts.updn;
    }
    /* detect browser features: 2 - IE, 1 - rest, 0 - N/A */
    mde = GetMode();
    if (typeof mde === 'string') {
      that.error = {};
      Error(mde);
      mde = 0;
    }
    that.Init();
  };
}));

},{}],4:[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        Q = definition();
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(value)) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become fulfilled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be fulfilled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return isObject(object) &&
        typeof object.promiseDispatch === "function" &&
        typeof object.inspect === "function";
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return result.value;
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {String} custom error message (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, message) {
    return Q(object).timeout(ms, message);
};

Promise.prototype.timeout = function (ms, message) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error(message || "Timed out after " + ms + " ms"));
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,require('_process'))
},{"_process":8}],5:[function(require,module,exports){
/*
* @fileOverview TouchSwipe - jQuery Plugin
* @version 1.6.9
*
* @author Matt Bryson http://www.github.com/mattbryson
* @see https://github.com/mattbryson/TouchSwipe-Jquery-Plugin
* @see http://labs.rampinteractive.co.uk/touchSwipe/
* @see http://plugins.jquery.com/project/touchSwipe
*
* Copyright (c) 2010-2015 Matt Bryson
* Dual licensed under the MIT or GPL Version 2 licenses.
*
*/

/*
*
* Changelog
* $Date: 2010-12-12 (Wed, 12 Dec 2010) $
* $version: 1.0.0
* $version: 1.0.1 - removed multibyte comments
*
* $Date: 2011-21-02 (Mon, 21 Feb 2011) $
* $version: 1.1.0 	- added allowPageScroll property to allow swiping and scrolling of page
*					- changed handler signatures so one handler can be used for multiple events
* $Date: 2011-23-02 (Wed, 23 Feb 2011) $
* $version: 1.2.0 	- added click handler. This is fired if the user simply clicks and does not swipe. The event object and click target are passed to handler.
*					- If you use the http://code.google.com/p/jquery-ui-for-ipad-and-iphone/ plugin, you can also assign jQuery mouse events to children of a touchSwipe object.
* $version: 1.2.1 	- removed console log!
*
* $version: 1.2.2 	- Fixed bug where scope was not preserved in callback methods.
*
* $Date: 2011-28-04 (Thurs, 28 April 2011) $
* $version: 1.2.4 	- Changed licence terms to be MIT or GPL inline with jQuery. Added check for support of touch events to stop non compatible browsers erroring.
*
* $Date: 2011-27-09 (Tues, 27 September 2011) $
* $version: 1.2.5 	- Added support for testing swipes with mouse on desktop browser (thanks to https://github.com/joelhy)
*
* $Date: 2012-14-05 (Mon, 14 May 2012) $
* $version: 1.2.6 	- Added timeThreshold between start and end touch, so user can ignore slow swipes (thanks to Mark Chase). Default is null, all swipes are detected
*
* $Date: 2012-05-06 (Tues, 05 June 2012) $
* $version: 1.2.7 	- Changed time threshold to have null default for backwards compatibility. Added duration param passed back in events, and refactored how time is handled.
*
* $Date: 2012-05-06 (Tues, 05 June 2012) $
* $version: 1.2.8 	- Added the possibility to return a value like null or false in the trigger callback. In that way we can control when the touch start/move should take effect or not (simply by returning in some cases return null; or return false;) This effects the ontouchstart/ontouchmove event.
*
* $Date: 2012-06-06 (Wed, 06 June 2012) $
* $version: 1.3.0 	- Refactored whole plugin to allow for methods to be executed, as well as exposed defaults for user override. Added 'enable', 'disable', and 'destroy' methods
*
* $Date: 2012-05-06 (Fri, 05 June 2012) $
* $version: 1.3.1 	- Bug fixes  - bind() with false as last argument is no longer supported in jQuery 1.6, also, if you just click, the duration is now returned correctly.
*
* $Date: 2012-29-07 (Sun, 29 July 2012) $
* $version: 1.3.2	- Added fallbackToMouseEvents option to NOT capture mouse events on non touch devices.
* 			- Added "all" fingers value to the fingers property, so any combination of fingers triggers the swipe, allowing event handlers to check the finger count
*
* $Date: 2012-09-08 (Thurs, 9 Aug 2012) $
* $version: 1.3.3	- Code tidy prep for minefied version
*
* $Date: 2012-04-10 (wed, 4 Oct 2012) $
* $version: 1.4.0	- Added pinch support, pinchIn and pinchOut
*
* $Date: 2012-11-10 (Thurs, 11 Oct 2012) $
* $version: 1.5.0	- Added excludedElements, a jquery selector that specifies child elements that do NOT trigger swipes. By default, this is one select that removes all form, input select, button and anchor elements.
*
* $Date: 2012-22-10 (Mon, 22 Oct 2012) $
* $version: 1.5.1	- Fixed bug with jQuery 1.8 and trailing comma in excludedElements
*					- Fixed bug with IE and eventPreventDefault()
* $Date: 2013-01-12 (Fri, 12 Jan 2013) $
* $version: 1.6.0	- Fixed bugs with pinching, mainly when both pinch and swipe enabled, as well as adding time threshold for multifinger gestures, so releasing one finger beofre the other doesnt trigger as single finger gesture.
*					- made the demo site all static local HTML pages so they can be run locally by a developer
*					- added jsDoc comments and added documentation for the plugin	
*					- code tidy
*					- added triggerOnTouchLeave property that will end the event when the user swipes off the element.
* $Date: 2013-03-23 (Sat, 23 Mar 2013) $
* $version: 1.6.1	- Added support for ie8 touch events
* $version: 1.6.2	- Added support for events binding with on / off / bind in jQ for all callback names.
*                   - Deprecated the 'click' handler in favour of tap.
*                   - added cancelThreshold property
*                   - added option method to update init options at runtime
* $version 1.6.3    - added doubletap, longtap events and longTapThreshold, doubleTapThreshold property
*
* $Date: 2013-04-04 (Thurs, 04 April 2013) $
* $version 1.6.4    - Fixed bug with cancelThreshold introduced in 1.6.3, where swipe status no longer fired start event, and stopped once swiping back.
*
* $Date: 2013-08-24 (Sat, 24 Aug 2013) $
* $version 1.6.5    - Merged a few pull requests fixing various bugs, added AMD support.
*
* $Date: 2014-06-04 (Wed, 04 June 2014) $
* $version 1.6.6 	- Merge of pull requests.
*    				- IE10 touch support 
*    				- Only prevent default event handling on valid swipe
*    				- Separate license/changelog comment
*    				- Detect if the swipe is valid at the end of the touch event.
*    				- Pass fingerdata to event handlers. 
*    				- Add 'hold' gesture 
*    				- Be more tolerant about the tap distance
*    				- Typos and minor fixes
*
* $Date: 2015-22-01 (Thurs, 22 Jan 2015) $
* $version 1.6.7    - Added patch from https://github.com/mattbryson/TouchSwipe-Jquery-Plugin/issues/206 to fix memory leak
*
* $Date: 2015-2-2 (Mon, 2 Feb 2015) $
* $version 1.6.8    - Added preventDefaultEvents option to proxy events regardless.
*					- Fixed issue with swipe and pinch not triggering at the same time
*
* $Date: 2015-9-6 (Tues, 9 June 2015) $
* $version 1.6.9    - Added PR from jdalton/hybrid to fix pointer events
*					- Added scrolling demo
*					- Added version property to plugin
*
*
*/

/**
 * See (http://jquery.com/).
 * @name $
 * @class 
 * See the jQuery Library  (http://jquery.com/) for full details.  This just
 * documents the function and classes that are added to jQuery by this plug-in.
 */
 
/**
 * See (http://jquery.com/)
 * @name fn
 * @class 
 * See the jQuery Library  (http://jquery.com/) for full details.  This just
 * documents the function and classes that are added to jQuery by this plug-in.
 * @memberOf $
 */



(function (factory) {
    if (typeof define === 'function' && define.amd && define.amd.jQuery) {
        // AMD. Register as anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals.
        factory(jQuery);
    }
}(function ($) {
	"use strict";

	//Constants
	var VERSION = "1.6.9",
		LEFT = "left",
		RIGHT = "right",
		UP = "up",
		DOWN = "down",
		IN = "in",
		OUT = "out",

		NONE = "none",
		AUTO = "auto",
		
		SWIPE = "swipe",
		PINCH = "pinch",
		TAP = "tap",
		DOUBLE_TAP = "doubletap",
		LONG_TAP = "longtap",
		HOLD = "hold",
		
		HORIZONTAL = "horizontal",
		VERTICAL = "vertical",

		ALL_FINGERS = "all",
		
		DOUBLE_TAP_THRESHOLD = 10,

		PHASE_START = "start",
		PHASE_MOVE = "move",
		PHASE_END = "end",
		PHASE_CANCEL = "cancel",

		SUPPORTS_TOUCH = 'ontouchstart' in window,
		
		SUPPORTS_POINTER_IE10 = window.navigator.msPointerEnabled && !window.navigator.pointerEnabled,
		
		SUPPORTS_POINTER = window.navigator.pointerEnabled || window.navigator.msPointerEnabled,

		PLUGIN_NS = 'TouchSwipe';



	/**
	* The default configuration, and available options to configure touch swipe with.
	* You can set the default values by updating any of the properties prior to instantiation.
	* @name $.fn.swipe.defaults
	* @namespace
	* @property {int} [fingers=1] The number of fingers to detect in a swipe. Any swipes that do not meet this requirement will NOT trigger swipe handlers.
	* @property {int} [threshold=75] The number of pixels that the user must move their finger by before it is considered a swipe. 
	* @property {int} [cancelThreshold=null] The number of pixels that the user must move their finger back from the original swipe direction to cancel the gesture.
	* @property {int} [pinchThreshold=20] The number of pixels that the user must pinch their finger by before it is considered a pinch. 
	* @property {int} [maxTimeThreshold=null] Time, in milliseconds, between touchStart and touchEnd must NOT exceed in order to be considered a swipe. 
	* @property {int} [fingerReleaseThreshold=250] Time in milliseconds between releasing multiple fingers.  If 2 fingers are down, and are released one after the other, if they are within this threshold, it counts as a simultaneous release. 
	* @property {int} [longTapThreshold=500] Time in milliseconds between tap and release for a long tap
	* @property {int} [doubleTapThreshold=200] Time in milliseconds between 2 taps to count as a double tap
	* @property {function} [swipe=null] A handler to catch all swipes. See {@link $.fn.swipe#event:swipe}
	* @property {function} [swipeLeft=null] A handler that is triggered for "left" swipes. See {@link $.fn.swipe#event:swipeLeft}
	* @property {function} [swipeRight=null] A handler that is triggered for "right" swipes. See {@link $.fn.swipe#event:swipeRight}
	* @property {function} [swipeUp=null] A handler that is triggered for "up" swipes. See {@link $.fn.swipe#event:swipeUp}
	* @property {function} [swipeDown=null] A handler that is triggered for "down" swipes. See {@link $.fn.swipe#event:swipeDown}
	* @property {function} [swipeStatus=null] A handler triggered for every phase of the swipe. See {@link $.fn.swipe#event:swipeStatus}
	* @property {function} [pinchIn=null] A handler triggered for pinch in events. See {@link $.fn.swipe#event:pinchIn}
	* @property {function} [pinchOut=null] A handler triggered for pinch out events. See {@link $.fn.swipe#event:pinchOut}
	* @property {function} [pinchStatus=null] A handler triggered for every phase of a pinch. See {@link $.fn.swipe#event:pinchStatus}
	* @property {function} [tap=null] A handler triggered when a user just taps on the item, rather than swipes it. If they do not move, tap is triggered, if they do move, it is not. 
	* @property {function} [doubleTap=null] A handler triggered when a user double taps on the item. The delay between taps can be set with the doubleTapThreshold property. See {@link $.fn.swipe.defaults#doubleTapThreshold}
	* @property {function} [longTap=null] A handler triggered when a user long taps on the item. The delay between start and end can be set with the longTapThreshold property. See {@link $.fn.swipe.defaults#longTapThreshold}
	* @property (function) [hold=null] A handler triggered when a user reaches longTapThreshold on the item. See {@link $.fn.swipe.defaults#longTapThreshold}
	* @property {boolean} [triggerOnTouchEnd=true] If true, the swipe events are triggered when the touch end event is received (user releases finger).  If false, it will be triggered on reaching the threshold, and then cancel the touch event automatically. 
	* @property {boolean} [triggerOnTouchLeave=false] If true, then when the user leaves the swipe object, the swipe will end and trigger appropriate handlers. 
	* @property {string|undefined} [allowPageScroll='auto'] How the browser handles page scrolls when the user is swiping on a touchSwipe object. See {@link $.fn.swipe.pageScroll}.  <br/><br/>
										<code>"auto"</code> : all undefined swipes will cause the page to scroll in that direction. <br/>
										<code>"none"</code> : the page will not scroll when user swipes. <br/>
										<code>"horizontal"</code> : will force page to scroll on horizontal swipes. <br/>
										<code>"vertical"</code> : will force page to scroll on vertical swipes. <br/>
	* @property {boolean} [fallbackToMouseEvents=true] If true mouse events are used when run on a non touch device, false will stop swipes being triggered by mouse events on non tocuh devices. 
	* @property {string} [excludedElements="button, input, select, textarea, a, .noSwipe"] A jquery selector that specifies child elements that do NOT trigger swipes. By default this excludes all form, input, select, button, anchor and .noSwipe elements. 
	* @property {boolean} [preventDefaultEvents=true] by default default events are cancelled, so the page doesn't move.  You can dissable this so both native events fire as well as your handlers. 
	
	*/
	var defaults = {
		fingers: 1, 		
		threshold: 75, 	
		cancelThreshold:null,	
		pinchThreshold:20,
		maxTimeThreshold: null, 
		fingerReleaseThreshold:250, 
		longTapThreshold:500,
		doubleTapThreshold:200,
		swipe: null, 		
		swipeLeft: null, 	
		swipeRight: null, 	
		swipeUp: null, 		
		swipeDown: null, 	
		swipeStatus: null, 	
		pinchIn:null,		
		pinchOut:null,		
		pinchStatus:null,	
		click:null, //Deprecated since 1.6.2
		tap:null,
		doubleTap:null,
		longTap:null, 		
		hold:null, 
		triggerOnTouchEnd: true, 
		triggerOnTouchLeave:false, 
		allowPageScroll: "auto", 
		fallbackToMouseEvents: true,	
		excludedElements:"label, button, input, select, textarea, a, .noSwipe",
		preventDefaultEvents:true
	};



	/**
	* Applies TouchSwipe behaviour to one or more jQuery objects.
	* The TouchSwipe plugin can be instantiated via this method, or methods within 
	* TouchSwipe can be executed via this method as per jQuery plugin architecture.
	* @see TouchSwipe
	* @class
	* @param {Mixed} method If the current DOMNode is a TouchSwipe object, and <code>method</code> is a TouchSwipe method, then
	* the <code>method</code> is executed, and any following arguments are passed to the TouchSwipe method.
	* If <code>method</code> is an object, then the TouchSwipe class is instantiated on the current DOMNode, passing the 
	* configuration properties defined in the object. See TouchSwipe
	*
	*/
	$.fn.swipe = function (method) {
		var $this = $(this),
			plugin = $this.data(PLUGIN_NS);

		//Check if we are already instantiated and trying to execute a method	
		if (plugin && typeof method === 'string') {
			if (plugin[method]) {
				return plugin[method].apply(this, Array.prototype.slice.call(arguments, 1));
			} else {
				$.error('Method ' + method + ' does not exist on jQuery.swipe');
			}
		}
		//Else not instantiated and trying to pass init object (or nothing)
		else if (!plugin && (typeof method === 'object' || !method)) {
			return init.apply(this, arguments);
		}

		return $this;
	};
	
	/**
	 * The version of the plugin
	 * @readonly
	 */
	$.fn.swipe.version = VERSION;



	//Expose our defaults so a user could override the plugin defaults
	$.fn.swipe.defaults = defaults;

	/**
	* The phases that a touch event goes through.  The <code>phase</code> is passed to the event handlers. 
	* These properties are read only, attempting to change them will not alter the values passed to the event handlers.
	* @namespace
	* @readonly
	* @property {string} PHASE_START Constant indicating the start phase of the touch event. Value is <code>"start"</code>.
	* @property {string} PHASE_MOVE Constant indicating the move phase of the touch event. Value is <code>"move"</code>.
	* @property {string} PHASE_END Constant indicating the end phase of the touch event. Value is <code>"end"</code>.
	* @property {string} PHASE_CANCEL Constant indicating the cancel phase of the touch event. Value is <code>"cancel"</code>.
	*/
	$.fn.swipe.phases = {
		PHASE_START: PHASE_START,
		PHASE_MOVE: PHASE_MOVE,
		PHASE_END: PHASE_END,
		PHASE_CANCEL: PHASE_CANCEL
	};

	/**
	* The direction constants that are passed to the event handlers. 
	* These properties are read only, attempting to change them will not alter the values passed to the event handlers.
	* @namespace
	* @readonly
	* @property {string} LEFT Constant indicating the left direction. Value is <code>"left"</code>.
	* @property {string} RIGHT Constant indicating the right direction. Value is <code>"right"</code>.
	* @property {string} UP Constant indicating the up direction. Value is <code>"up"</code>.
	* @property {string} DOWN Constant indicating the down direction. Value is <code>"cancel"</code>.
	* @property {string} IN Constant indicating the in direction. Value is <code>"in"</code>.
	* @property {string} OUT Constant indicating the out direction. Value is <code>"out"</code>.
	*/
	$.fn.swipe.directions = {
		LEFT: LEFT,
		RIGHT: RIGHT,
		UP: UP,
		DOWN: DOWN,
		IN : IN,
		OUT: OUT
	};
	
	/**
	* The page scroll constants that can be used to set the value of <code>allowPageScroll</code> option
	* These properties are read only
	* @namespace
	* @readonly
	* @see $.fn.swipe.defaults#allowPageScroll
	* @property {string} NONE Constant indicating no page scrolling is allowed. Value is <code>"none"</code>.
	* @property {string} HORIZONTAL Constant indicating horizontal page scrolling is allowed. Value is <code>"horizontal"</code>.
	* @property {string} VERTICAL Constant indicating vertical page scrolling is allowed. Value is <code>"vertical"</code>.
	* @property {string} AUTO Constant indicating either horizontal or vertical will be allowed, depending on the swipe handlers registered. Value is <code>"auto"</code>.
	*/
	$.fn.swipe.pageScroll = {
		NONE: NONE,
		HORIZONTAL: HORIZONTAL,
		VERTICAL: VERTICAL,
		AUTO: AUTO
	};

	/**
	* Constants representing the number of fingers used in a swipe.  These are used to set both the value of <code>fingers</code> in the 
	* options object, as well as the value of the <code>fingers</code> event property.
	* These properties are read only, attempting to change them will not alter the values passed to the event handlers.
	* @namespace
	* @readonly
	* @see $.fn.swipe.defaults#fingers
	* @property {string} ONE Constant indicating 1 finger is to be detected / was detected. Value is <code>1</code>.
	* @property {string} TWO Constant indicating 2 fingers are to be detected / were detected. Value is <code>1</code>.
	* @property {string} THREE Constant indicating 3 finger are to be detected / were detected. Value is <code>1</code>.
	* @property {string} ALL Constant indicating any combination of finger are to be detected.  Value is <code>"all"</code>.
	*/
	$.fn.swipe.fingers = {
		ONE: 1,
		TWO: 2,
		THREE: 3,
		ALL: ALL_FINGERS
	};

	/**
	* Initialise the plugin for each DOM element matched
	* This creates a new instance of the main TouchSwipe class for each DOM element, and then
	* saves a reference to that instance in the elements data property.
	* @internal
	*/
	function init(options) {
		//Prep and extend the options
		if (options && (options.allowPageScroll === undefined && (options.swipe !== undefined || options.swipeStatus !== undefined))) {
			options.allowPageScroll = NONE;
		}
		
        //Check for deprecated options
		//Ensure that any old click handlers are assigned to the new tap, unless we have a tap
		if(options.click!==undefined && options.tap===undefined) {
		    options.tap = options.click;
		}

		if (!options) {
			options = {};
		}
		
        //pass empty object so we dont modify the defaults
		options = $.extend({}, $.fn.swipe.defaults, options);

		//For each element instantiate the plugin
		return this.each(function () {
			var $this = $(this);

			//Check we havent already initialised the plugin
			var plugin = $this.data(PLUGIN_NS);

			if (!plugin) {
				plugin = new TouchSwipe(this, options);
				$this.data(PLUGIN_NS, plugin);
			}
		});
	}

	/**
	* Main TouchSwipe Plugin Class.
	* Do not use this to construct your TouchSwipe object, use the jQuery plugin method $.fn.swipe(); {@link $.fn.swipe}
	* @private
	* @name TouchSwipe
	* @param {DOMNode} element The HTML DOM object to apply to plugin to
	* @param {Object} options The options to configure the plugin with.  @link {$.fn.swipe.defaults}
	* @see $.fh.swipe.defaults
	* @see $.fh.swipe
    * @class
	*/
	function TouchSwipe(element, options) {
        var useTouchEvents = (SUPPORTS_TOUCH || SUPPORTS_POINTER || !options.fallbackToMouseEvents),
            START_EV = useTouchEvents ? (SUPPORTS_POINTER ? (SUPPORTS_POINTER_IE10 ? 'MSPointerDown' : 'pointerdown') : 'touchstart') : 'mousedown',
            MOVE_EV = useTouchEvents ? (SUPPORTS_POINTER ? (SUPPORTS_POINTER_IE10 ? 'MSPointerMove' : 'pointermove') : 'touchmove') : 'mousemove',
            END_EV = useTouchEvents ? (SUPPORTS_POINTER ? (SUPPORTS_POINTER_IE10 ? 'MSPointerUp' : 'pointerup') : 'touchend') : 'mouseup',
            LEAVE_EV = useTouchEvents ? null : 'mouseleave', //we manually detect leave on touch devices, so null event here
            CANCEL_EV = (SUPPORTS_POINTER ? (SUPPORTS_POINTER_IE10 ? 'MSPointerCancel' : 'pointercancel') : 'touchcancel');



		//touch properties
		var distance = 0,
			direction = null,
			duration = 0,
			startTouchesDistance = 0,
			endTouchesDistance = 0,
			pinchZoom = 1,
			pinchDistance = 0,
			pinchDirection = 0,
			maximumsMap=null;

		
		
		//jQuery wrapped element for this instance
		var $element = $(element);
		
		//Current phase of th touch cycle
		var phase = "start";

		// the current number of fingers being used.
		var fingerCount = 0; 			

		//track mouse points / delta
		var fingerData=null;

		//track times
		var startTime = 0,
			endTime = 0,
			previousTouchEndTime=0,
			previousTouchFingerCount=0,
			doubleTapStartTime=0;

		//Timeouts
		var singleTapTimeout=null,
			holdTimeout=null;
        
		// Add gestures to all swipable areas if supported
		try {
			$element.bind(START_EV, touchStart);
			$element.bind(CANCEL_EV, touchCancel);
		}
		catch (e) {
			$.error('events not supported ' + START_EV + ',' + CANCEL_EV + ' on jQuery.swipe');
		}

		//
		//Public methods
		//
		
		/**
		* re-enables the swipe plugin with the previous configuration
		* @function
		* @name $.fn.swipe#enable
		* @return {DOMNode} The Dom element that was registered with TouchSwipe 
		* @example $("#element").swipe("enable");
		*/
		this.enable = function () {
			$element.bind(START_EV, touchStart);
			$element.bind(CANCEL_EV, touchCancel);
			return $element;
		};

		/**
		* disables the swipe plugin
		* @function
		* @name $.fn.swipe#disable
		* @return {DOMNode} The Dom element that is now registered with TouchSwipe
	    * @example $("#element").swipe("disable");
		*/
		this.disable = function () {
			removeListeners();
			return $element;
		};

		/**
		* Destroy the swipe plugin completely. To use any swipe methods, you must re initialise the plugin.
		* @function
		* @name $.fn.swipe#destroy
		* @example $("#element").swipe("destroy");
		*/
		this.destroy = function () {
			removeListeners();
			$element.data(PLUGIN_NS, null);
			$element = null;
		};

		
        /**
         * Allows run time updating of the swipe configuration options.
         * @function
    	 * @name $.fn.swipe#option
    	 * @param {String} property The option property to get or set
         * @param {Object} [value] The value to set the property to
		 * @return {Object} If only a property name is passed, then that property value is returned.
		 * @example $("#element").swipe("option", "threshold"); // return the threshold
         * @example $("#element").swipe("option", "threshold", 100); // set the threshold after init
         * @see $.fn.swipe.defaults
         *
         */
        this.option = function (property, value) {
            if(options[property]!==undefined) {
                if(value===undefined) {
                    return options[property];
                } else {
                    options[property] = value;
                }
            } else {
                $.error('Option ' + property + ' does not exist on jQuery.swipe.options');
            }

            return null;
        }

		//
		// Private methods
		//
		
		//
		// EVENTS
		//
		/**
		* Event handler for a touch start event.
		* Stops the default click event from triggering and stores where we touched
		* @inner
		* @param {object} jqEvent The normalised jQuery event object.
		*/
		function touchStart(jqEvent) {
			//If we already in a touch event (a finger already in use) then ignore subsequent ones..
			if( getTouchInProgress() )
				return;
			
			//Check if this element matches any in the excluded elements selectors,  or its parent is excluded, if so, DON'T swipe
			if( $(jqEvent.target).closest( options.excludedElements, $element ).length>0 ) 
				return;
				
			//As we use Jquery bind for events, we need to target the original event object
			//If these events are being programmatically triggered, we don't have an original event object, so use the Jq one.
			var event = jqEvent.originalEvent ? jqEvent.originalEvent : jqEvent;
			
			var ret,
				touches = event.touches,
				evt = touches ? touches[0] : event;

			phase = PHASE_START;

			//If we support touches, get the finger count
			if (touches) {
				// get the total number of fingers touching the screen
				fingerCount = touches.length;
			}
			//Else this is the desktop, so stop the browser from dragging content
			else {
				jqEvent.preventDefault(); //call this on jq event so we are cross browser
			}

			//clear vars..
			distance = 0;
			direction = null;
			pinchDirection=null;
			duration = 0;
			startTouchesDistance=0;
			endTouchesDistance=0;
			pinchZoom = 1;
			pinchDistance = 0;
			fingerData=createAllFingerData();
			maximumsMap=createMaximumsData();
			cancelMultiFingerRelease();

			
			// check the number of fingers is what we are looking for, or we are capturing pinches
			if (!touches || (fingerCount === options.fingers || options.fingers === ALL_FINGERS) || hasPinches()) {
				// get the coordinates of the touch
				createFingerData( 0, evt );
				startTime = getTimeStamp();
				
				if(fingerCount==2) {
					//Keep track of the initial pinch distance, so we can calculate the diff later
					//Store second finger data as start
					createFingerData( 1, touches[1] );
					startTouchesDistance = endTouchesDistance = calculateTouchesDistance(fingerData[0].start, fingerData[1].start);
				}
				
				if (options.swipeStatus || options.pinchStatus) {
					ret = triggerHandler(event, phase);
				}
			}
			else {
				//A touch with more or less than the fingers we are looking for, so cancel
				ret = false; 
			}

			//If we have a return value from the users handler, then return and cancel
			if (ret === false) {
				phase = PHASE_CANCEL;
				triggerHandler(event, phase);
				return ret;
			}
			else {
				if (options.hold) {
					holdTimeout = setTimeout($.proxy(function() {
						//Trigger the event
						$element.trigger('hold', [event.target]);
						//Fire the callback
						if(options.hold) {
							ret = options.hold.call($element, event, event.target);
						}
					}, this), options.longTapThreshold );
				}

				setTouchInProgress(true);
			}

            return null;
		};
		
		
		
		/**
		* Event handler for a touch move event. 
		* If we change fingers during move, then cancel the event
		* @inner
		* @param {object} jqEvent The normalised jQuery event object.
		*/
		function touchMove(jqEvent) {
			
			//As we use Jquery bind for events, we need to target the original event object
			//If these events are being programmatically triggered, we don't have an original event object, so use the Jq one.
			var event = jqEvent.originalEvent ? jqEvent.originalEvent : jqEvent;
			
			//If we are ending, cancelling, or within the threshold of 2 fingers being released, don't track anything..
			if (phase === PHASE_END || phase === PHASE_CANCEL || inMultiFingerRelease())
				return;

			var ret,
				touches = event.touches,
				evt = touches ? touches[0] : event;
			

			//Update the  finger data 
			var currentFinger = updateFingerData(evt);
			endTime = getTimeStamp();
			
			if (touches) {
				fingerCount = touches.length;
			}

			if (options.hold)
				clearTimeout(holdTimeout);

			phase = PHASE_MOVE;

			//If we have 2 fingers get Touches distance as well
			if(fingerCount==2) {
				
				//Keep track of the initial pinch distance, so we can calculate the diff later
				//We do this here as well as the start event, in case they start with 1 finger, and the press 2 fingers
				if(startTouchesDistance==0) {
					//Create second finger if this is the first time...
					createFingerData( 1, touches[1] );
					
					startTouchesDistance = endTouchesDistance = calculateTouchesDistance(fingerData[0].start, fingerData[1].start);
				} else {
					//Else just update the second finger
					updateFingerData(touches[1]);
				
					endTouchesDistance = calculateTouchesDistance(fingerData[0].end, fingerData[1].end);
					pinchDirection = calculatePinchDirection(fingerData[0].end, fingerData[1].end);
				}
				
				
				pinchZoom = calculatePinchZoom(startTouchesDistance, endTouchesDistance);
				pinchDistance = Math.abs(startTouchesDistance - endTouchesDistance);
			}
			
			
			

			if ( (fingerCount === options.fingers || options.fingers === ALL_FINGERS) || !touches || hasPinches() ) {
				
				direction = calculateDirection(currentFinger.start, currentFinger.end);
				
				//Check if we need to prevent default event (page scroll / pinch zoom) or not
				validateDefaultEvent(jqEvent, direction);

				//Distance and duration are all off the main finger
				distance = calculateDistance(currentFinger.start, currentFinger.end);
				duration = calculateDuration();

                //Cache the maximum distance we made in this direction
                setMaxDistance(direction, distance);


				if (options.swipeStatus || options.pinchStatus) {
					ret = triggerHandler(event, phase);
				}
				
				
				//If we trigger end events when threshold are met, or trigger events when touch leaves element
				if(!options.triggerOnTouchEnd || options.triggerOnTouchLeave) {
					
					var inBounds = true;
					
					//If checking if we leave the element, run the bounds check (we can use touchleave as its not supported on webkit)
					if(options.triggerOnTouchLeave) {
						var bounds = getbounds( this );
						inBounds = isInBounds( currentFinger.end, bounds );
					}
					
					//Trigger end handles as we swipe if thresholds met or if we have left the element if the user has asked to check these..
					if(!options.triggerOnTouchEnd && inBounds) {
						phase = getNextPhase( PHASE_MOVE );
					} 
					//We end if out of bounds here, so set current phase to END, and check if its modified 
					else if(options.triggerOnTouchLeave && !inBounds ) {
						phase = getNextPhase( PHASE_END );
					}
						
					if(phase==PHASE_CANCEL || phase==PHASE_END)	{
						triggerHandler(event, phase);
					}				
				}
			}
			else {
				phase = PHASE_CANCEL;
				triggerHandler(event, phase);
			}

			if (ret === false) {
				phase = PHASE_CANCEL;
				triggerHandler(event, phase);
			}
		}



		/**
		* Event handler for a touch end event. 
		* Calculate the direction and trigger events
		* @inner
		* @param {object} jqEvent The normalised jQuery event object.
		*/
		function touchEnd(jqEvent) {
			//As we use Jquery bind for events, we need to target the original event object
			//If these events are being programmatically triggered, we don't have an original event object, so use the Jq one.
			var event = jqEvent.originalEvent ? jqEvent.originalEvent : jqEvent,
			    touches = event.touches;

			//If we are still in a touch with another finger return
			//This allows us to wait a fraction and see if the other finger comes up, if it does within the threshold, then we treat it as a multi release, not a single release.
			if (touches) {
				if(touches.length) {
					startMultiFingerRelease();
					return true;
				}
			}
			
			//If a previous finger has been released, check how long ago, if within the threshold, then assume it was a multifinger release.
			//This is used to allow 2 fingers to release fractionally after each other, whilst maintainig the event as containg 2 fingers, not 1
			if(inMultiFingerRelease()) {	
				fingerCount=previousTouchFingerCount;
			}	
		
			//Set end of swipe
			endTime = getTimeStamp();
			
			//Get duration incase move was never fired
			duration = calculateDuration();
			
			//If we trigger handlers at end of swipe OR, we trigger during, but they didnt trigger and we are still in the move phase
			if(didSwipeBackToCancel() || !validateSwipeDistance()) {
			    phase = PHASE_CANCEL;
                triggerHandler(event, phase);
			} else if (options.triggerOnTouchEnd || (options.triggerOnTouchEnd == false && phase === PHASE_MOVE)) {
				//call this on jq event so we are cross browser 
				jqEvent.preventDefault(); 
				phase = PHASE_END;
                triggerHandler(event, phase);
			}
			//Special cases - A tap should always fire on touch end regardless,
			//So here we manually trigger the tap end handler by itself
			//We dont run trigger handler as it will re-trigger events that may have fired already
			else if (!options.triggerOnTouchEnd && hasTap()) {
                //Trigger the pinch events...
			    phase = PHASE_END;
			    triggerHandlerForGesture(event, phase, TAP);
			}
			else if (phase === PHASE_MOVE) {
				phase = PHASE_CANCEL;
				triggerHandler(event, phase);
			}

			setTouchInProgress(false);

            return null;
		}



		/**
		* Event handler for a touch cancel event. 
		* Clears current vars
		* @inner
		*/
		function touchCancel() {
			// reset the variables back to default values
			fingerCount = 0;
			endTime = 0;
			startTime = 0;
			startTouchesDistance=0;
			endTouchesDistance=0;
			pinchZoom=1;
			
			//If we were in progress of tracking a possible multi touch end, then re set it.
			cancelMultiFingerRelease();
			
			setTouchInProgress(false);
		}
		
		
		/**
		* Event handler for a touch leave event. 
		* This is only triggered on desktops, in touch we work this out manually
		* as the touchleave event is not supported in webkit
		* @inner
		*/
		function touchLeave(jqEvent) {
			var event = jqEvent.originalEvent ? jqEvent.originalEvent : jqEvent;
			
			//If we have the trigger on leave property set....
			if(options.triggerOnTouchLeave) {
				phase = getNextPhase( PHASE_END );
				triggerHandler(event, phase);
			}
		}
		
		/**
		* Removes all listeners that were associated with the plugin
		* @inner
		*/
		function removeListeners() {
			$element.unbind(START_EV, touchStart);
			$element.unbind(CANCEL_EV, touchCancel);
			$element.unbind(MOVE_EV, touchMove);
			$element.unbind(END_EV, touchEnd);
			
			//we only have leave events on desktop, we manually calculate leave on touch as its not supported in webkit
			if(LEAVE_EV) { 
				$element.unbind(LEAVE_EV, touchLeave);
			}
			
			setTouchInProgress(false);
		}

		
		/**
		 * Checks if the time and distance thresholds have been met, and if so then the appropriate handlers are fired.
		 */
		function getNextPhase(currentPhase) {
			
			var nextPhase = currentPhase;
			
			// Ensure we have valid swipe (under time and over distance  and check if we are out of bound...)
			var validTime = validateSwipeTime();
			var validDistance = validateSwipeDistance();
			var didCancel = didSwipeBackToCancel();
						
			//If we have exceeded our time, then cancel	
			if(!validTime || didCancel) {
				nextPhase = PHASE_CANCEL;
			}
			//Else if we are moving, and have reached distance then end
			else if (validDistance && currentPhase == PHASE_MOVE && (!options.triggerOnTouchEnd || options.triggerOnTouchLeave) ) {
				nextPhase = PHASE_END;
			} 
			//Else if we have ended by leaving and didn't reach distance, then cancel
			else if (!validDistance && currentPhase==PHASE_END && options.triggerOnTouchLeave) {
				nextPhase = PHASE_CANCEL;
			}
			
			return nextPhase;
		}
		
		
		/**
		* Trigger the relevant event handler
		* The handlers are passed the original event, the element that was swiped, and in the case of the catch all handler, the direction that was swiped, "left", "right", "up", or "down"
		* @param {object} event the original event object
		* @param {string} phase the phase of the swipe (start, end cancel etc) {@link $.fn.swipe.phases}
		* @inner
		*/
		function triggerHandler(event, phase) {

			var ret,
				touches = event.touches;
			
			//Swipes and pinches are not mutually exclusive - can happend at same time, so need to trigger 2 events potentially
			if( (didSwipe() || hasSwipes()) || (didPinch() || hasPinches()) ) {
				// SWIPE GESTURES
				if(didSwipe() || hasSwipes()) { //hasSwipes as status needs to fire even if swipe is invalid
					//Trigger the swipe events...
					ret = triggerHandlerForGesture(event, phase, SWIPE);
				}	

				// PINCH GESTURES (if the above didn't cancel)
				if((didPinch() || hasPinches()) && ret!==false) {
					//Trigger the pinch events...
					ret = triggerHandlerForGesture(event, phase, PINCH);
				}
			} else {
			 
				// CLICK / TAP (if the above didn't cancel)
				if(didDoubleTap() && ret!==false) {
					//Trigger the tap events...
					ret = triggerHandlerForGesture(event, phase, DOUBLE_TAP);
				}
				
				// CLICK / TAP (if the above didn't cancel)
				else if(didLongTap() && ret!==false) {
					//Trigger the tap events...
					ret = triggerHandlerForGesture(event, phase, LONG_TAP);
				}

				// CLICK / TAP (if the above didn't cancel)
				else if(didTap() && ret!==false) {
					//Trigger the tap event..
					ret = triggerHandlerForGesture(event, phase, TAP);
				}
			}
			
			
			
			// If we are cancelling the gesture, then manually trigger the reset handler
			if (phase === PHASE_CANCEL) {
				touchCancel(event);
			}
			
			// If we are ending the gesture, then manually trigger the reset handler IF all fingers are off
			if(phase === PHASE_END) {
				//If we support touch, then check that all fingers are off before we cancel
				if (touches) {
					if(!touches.length) {
						touchCancel(event);	
					}
				} 
				else {
					touchCancel(event);
				}
			}
					
			return ret;
		}
		
		
		
		/**
		* Trigger the relevant event handler
		* The handlers are passed the original event, the element that was swiped, and in the case of the catch all handler, the direction that was swiped, "left", "right", "up", or "down"
		* @param {object} event the original event object
		* @param {string} phase the phase of the swipe (start, end cancel etc) {@link $.fn.swipe.phases}
		* @param {string} gesture the gesture to trigger a handler for : PINCH or SWIPE {@link $.fn.swipe.gestures}
		* @return Boolean False, to indicate that the event should stop propagation, or void.
		* @inner
		*/
		function triggerHandlerForGesture(event, phase, gesture) {	
			
			var ret;
			
			//SWIPES....
			if(gesture==SWIPE) {
				//Trigger status every time..
				
				//Trigger the event...
				$element.trigger('swipeStatus', [phase, direction || null, distance || 0, duration || 0, fingerCount, fingerData]);
				
				//Fire the callback
				if (options.swipeStatus) {
					ret = options.swipeStatus.call($element, event, phase, direction || null, distance || 0, duration || 0, fingerCount, fingerData);
					//If the status cancels, then dont run the subsequent event handlers..
					if(ret===false) return false;
				}
				
				
				
				
				if (phase == PHASE_END && validateSwipe()) {
					//Fire the catch all event
					$element.trigger('swipe', [direction, distance, duration, fingerCount, fingerData]);
					
					//Fire catch all callback
					if (options.swipe) {
						ret = options.swipe.call($element, event, direction, distance, duration, fingerCount, fingerData);
						//If the status cancels, then dont run the subsequent event handlers..
						if(ret===false) return false;
					}
					
					//trigger direction specific event handlers	
					switch (direction) {
						case LEFT:
							//Trigger the event
							$element.trigger('swipeLeft', [direction, distance, duration, fingerCount, fingerData]);
					
					        //Fire the callback
							if (options.swipeLeft) {
								ret = options.swipeLeft.call($element, event, direction, distance, duration, fingerCount, fingerData);
							}
							break;
	
						case RIGHT:
							//Trigger the event
					        $element.trigger('swipeRight', [direction, distance, duration, fingerCount, fingerData]);
					
					        //Fire the callback
							if (options.swipeRight) {
								ret = options.swipeRight.call($element, event, direction, distance, duration, fingerCount, fingerData);
							}
							break;
	
						case UP:
							//Trigger the event
					        $element.trigger('swipeUp', [direction, distance, duration, fingerCount, fingerData]);
					
					        //Fire the callback
							if (options.swipeUp) {
								ret = options.swipeUp.call($element, event, direction, distance, duration, fingerCount, fingerData);
							}
							break;
	
						case DOWN:
							//Trigger the event
					        $element.trigger('swipeDown', [direction, distance, duration, fingerCount, fingerData]);
					
					        //Fire the callback
							if (options.swipeDown) {
								ret = options.swipeDown.call($element, event, direction, distance, duration, fingerCount, fingerData);
							}
							break;
					}
				}
			}
			
			
			//PINCHES....
			if(gesture==PINCH) {
				//Trigger the event
			     $element.trigger('pinchStatus', [phase, pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData]);
					
                //Fire the callback
				if (options.pinchStatus) {
					ret = options.pinchStatus.call($element, event, phase, pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData);
					//If the status cancels, then dont run the subsequent event handlers..
					if(ret===false) return false;
				}
				
				if(phase==PHASE_END && validatePinch()) {
					
					switch (pinchDirection) {
						case IN:
							//Trigger the event
                            $element.trigger('pinchIn', [pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData]);
                    
                            //Fire the callback
                            if (options.pinchIn) {
								ret = options.pinchIn.call($element, event, pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData);
							}
							break;
						
						case OUT:
							//Trigger the event
                            $element.trigger('pinchOut', [pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData]);
                    
                            //Fire the callback
                            if (options.pinchOut) {
								ret = options.pinchOut.call($element, event, pinchDirection || null, pinchDistance || 0, duration || 0, fingerCount, pinchZoom, fingerData);
							}
							break;	
					}
				}
			}
			


                
	    		
			if(gesture==TAP) {
				if(phase === PHASE_CANCEL || phase === PHASE_END) {
					
    			    
    			    //Cancel any existing double tap
				    clearTimeout(singleTapTimeout);
    			    //Cancel hold timeout
				    clearTimeout(holdTimeout);
				           
					//If we are also looking for doubelTaps, wait incase this is one...
				    if(hasDoubleTap() && !inDoubleTap()) {
				        //Cache the time of this tap
                        doubleTapStartTime = getTimeStamp();
                       
				        //Now wait for the double tap timeout, and trigger this single tap
				        //if its not cancelled by a double tap
				        singleTapTimeout = setTimeout($.proxy(function() {
        			        doubleTapStartTime=null;
        			        //Trigger the event
                			$element.trigger('tap', [event.target]);

                        
                            //Fire the callback
                            if(options.tap) {
                                ret = options.tap.call($element, event, event.target);
                            }
    			        }, this), options.doubleTapThreshold );
    			    	
    			    } else {
                        doubleTapStartTime=null;
                        
                        //Trigger the event
                        $element.trigger('tap', [event.target]);

                        
                        //Fire the callback
                        if(options.tap) {
                            ret = options.tap.call($element, event, event.target);
                        }
	    		    }
	    		}
			}
			
			else if (gesture==DOUBLE_TAP) {
				if(phase === PHASE_CANCEL || phase === PHASE_END) {
					//Cancel any pending singletap 
				    clearTimeout(singleTapTimeout);
				    doubleTapStartTime=null;
				        
                    //Trigger the event
                    $element.trigger('doubletap', [event.target]);
                
                    //Fire the callback
                    if(options.doubleTap) {
                        ret = options.doubleTap.call($element, event, event.target);
                    }
	    		}
			}
			
			else if (gesture==LONG_TAP) {
				if(phase === PHASE_CANCEL || phase === PHASE_END) {
					//Cancel any pending singletap (shouldnt be one)
				    clearTimeout(singleTapTimeout);
				    doubleTapStartTime=null;
				        
                    //Trigger the event
                    $element.trigger('longtap', [event.target]);
                
                    //Fire the callback
                    if(options.longTap) {
                        ret = options.longTap.call($element, event, event.target);
                    }
	    		}
			}				
				
			return ret;
		}



		
		//
		// GESTURE VALIDATION
		//
		
		/**
		* Checks the user has swipe far enough
		* @return Boolean if <code>threshold</code> has been set, return true if the threshold was met, else false.
		* If no threshold was set, then we return true.
		* @inner
		*/
		function validateSwipeDistance() {
			var valid = true;
			//If we made it past the min swipe distance..
			if (options.threshold !== null) {
				valid = distance >= options.threshold;
			}
			
            return valid;
		}
		
		/**
		* Checks the user has swiped back to cancel.
		* @return Boolean if <code>cancelThreshold</code> has been set, return true if the cancelThreshold was met, else false.
		* If no cancelThreshold was set, then we return true.
		* @inner
		*/
		function didSwipeBackToCancel() {
            var cancelled = false;
    		if(options.cancelThreshold !== null && direction !==null)  {
    		    cancelled =  (getMaxDistance( direction ) - distance) >= options.cancelThreshold;
			}
			
			return cancelled;
		}

		/**
		* Checks the user has pinched far enough
		* @return Boolean if <code>pinchThreshold</code> has been set, return true if the threshold was met, else false.
		* If no threshold was set, then we return true.
		* @inner
		*/
		function validatePinchDistance() {
			if (options.pinchThreshold !== null) {
				return pinchDistance >= options.pinchThreshold;
			}
			return true;
		}

		/**
		* Checks that the time taken to swipe meets the minimum / maximum requirements
		* @return Boolean
		* @inner
		*/
		function validateSwipeTime() {
			var result;
			//If no time set, then return true

			if (options.maxTimeThreshold) {
				if (duration >= options.maxTimeThreshold) {
					result = false;
				} else {
					result = true;
				}
			}
			else {
				result = true;
			}

			return result;
		}

	

		/**
		* Checks direction of the swipe and the value allowPageScroll to see if we should allow or prevent the default behaviour from occurring.
		* This will essentially allow page scrolling or not when the user is swiping on a touchSwipe object.
		* @param {object} jqEvent The normalised jQuery representation of the event object.
		* @param {string} direction The direction of the event. See {@link $.fn.swipe.directions}
		* @see $.fn.swipe.directions
		* @inner
		*/
		function validateDefaultEvent(jqEvent, direction) {

			//If we have no pinches, then do this
			//If we have a pinch, and we we have 2 fingers or more down, then dont allow page scroll.

			//If the option is set, allways allow the event to bubble up (let user handle wiredness)
			if( options.preventDefaultEvents === false) {
				return;
			}

			if (options.allowPageScroll === NONE) {
				jqEvent.preventDefault();
			} else {
				var auto = options.allowPageScroll === AUTO;

				switch (direction) {
					case LEFT:
						if ((options.swipeLeft && auto) || (!auto && options.allowPageScroll != HORIZONTAL)) {
							jqEvent.preventDefault();
						}
						break;

					case RIGHT:
						if ((options.swipeRight && auto) || (!auto && options.allowPageScroll != HORIZONTAL)) {
							jqEvent.preventDefault();
						}
						break;

					case UP:
						if ((options.swipeUp && auto) || (!auto && options.allowPageScroll != VERTICAL)) {
							jqEvent.preventDefault();
						}
						break;

					case DOWN:
						if ((options.swipeDown && auto) || (!auto && options.allowPageScroll != VERTICAL)) {
							jqEvent.preventDefault();
						}
						break;
				}
			}

		}


		// PINCHES
		/**
		 * Returns true of the current pinch meets the thresholds
		 * @return Boolean
		 * @inner
		*/
		function validatePinch() {
		    var hasCorrectFingerCount = validateFingers();
		    var hasEndPoint = validateEndPoint();
			var hasCorrectDistance = validatePinchDistance();
			return hasCorrectFingerCount && hasEndPoint && hasCorrectDistance;
			
		}
		
		/**
		 * Returns true if any Pinch events have been registered
		 * @return Boolean
		 * @inner
		*/
		function hasPinches() {
			//Enure we dont return 0 or null for false values
			return !!(options.pinchStatus || options.pinchIn || options.pinchOut);
		}
		
		/**
		 * Returns true if we are detecting pinches, and have one
		 * @return Boolean
		 * @inner
		 */
		function didPinch() {
			//Enure we dont return 0 or null for false values
			return !!(validatePinch() && hasPinches());
		}




		// SWIPES
		/**
		 * Returns true if the current swipe meets the thresholds
		 * @return Boolean
		 * @inner
		*/
		function validateSwipe() {
			//Check validity of swipe
			var hasValidTime = validateSwipeTime();
			var hasValidDistance = validateSwipeDistance();	
			var hasCorrectFingerCount = validateFingers();
		    var hasEndPoint = validateEndPoint();
		    var didCancel = didSwipeBackToCancel();	
		    
			// if the user swiped more than the minimum length, perform the appropriate action
			// hasValidDistance is null when no distance is set 
			var valid =  !didCancel && hasEndPoint && hasCorrectFingerCount && hasValidDistance && hasValidTime;
			
			return valid;
		}
		
		/**
		 * Returns true if any Swipe events have been registered
		 * @return Boolean
		 * @inner
		*/
		function hasSwipes() {
			//Enure we dont return 0 or null for false values
			return !!(options.swipe || options.swipeStatus || options.swipeLeft || options.swipeRight || options.swipeUp || options.swipeDown);
		}
		
		
		/**
		 * Returns true if we are detecting swipes and have one
		 * @return Boolean
		 * @inner
		*/
		function didSwipe() {
			//Enure we dont return 0 or null for false values
			return !!(validateSwipe() && hasSwipes());
		}

        /**
		 * Returns true if we have matched the number of fingers we are looking for
		 * @return Boolean
		 * @inner
		*/
        function validateFingers() {
            //The number of fingers we want were matched, or on desktop we ignore
    		return ((fingerCount === options.fingers || options.fingers === ALL_FINGERS) || !SUPPORTS_TOUCH);
    	}
        
        /**
		 * Returns true if we have an end point for the swipe
		 * @return Boolean
		 * @inner
		*/
        function validateEndPoint() {
            //We have an end value for the finger
		    return fingerData[0].end.x !== 0;
        }

		// TAP / CLICK
		/**
		 * Returns true if a click / tap events have been registered
		 * @return Boolean
		 * @inner
		*/
		function hasTap() {
			//Enure we dont return 0 or null for false values
			return !!(options.tap) ;
		}
		
		/**
		 * Returns true if a double tap events have been registered
		 * @return Boolean
		 * @inner
		*/
		function hasDoubleTap() {
			//Enure we dont return 0 or null for false values
			return !!(options.doubleTap) ;
		}
		
		/**
		 * Returns true if any long tap events have been registered
		 * @return Boolean
		 * @inner
		*/
		function hasLongTap() {
			//Enure we dont return 0 or null for false values
			return !!(options.longTap) ;
		}
		
		/**
		 * Returns true if we could be in the process of a double tap (one tap has occurred, we are listening for double taps, and the threshold hasn't past.
		 * @return Boolean
		 * @inner
		*/
		function validateDoubleTap() {
		    if(doubleTapStartTime==null){
		        return false;
		    }
		    var now = getTimeStamp();
		    return (hasDoubleTap() && ((now-doubleTapStartTime) <= options.doubleTapThreshold));
		}
		
		/**
		 * Returns true if we could be in the process of a double tap (one tap has occurred, we are listening for double taps, and the threshold hasn't past.
		 * @return Boolean
		 * @inner
		*/
		function inDoubleTap() {
		    return validateDoubleTap();
		}
		
		
		/**
		 * Returns true if we have a valid tap
		 * @return Boolean
		 * @inner
		*/
		function validateTap() {
		    return ((fingerCount === 1 || !SUPPORTS_TOUCH) && (isNaN(distance) || distance < options.threshold));
		}
		
		/**
		 * Returns true if we have a valid long tap
		 * @return Boolean
		 * @inner
		*/
		function validateLongTap() {
		    //slight threshold on moving finger
            return ((duration > options.longTapThreshold) && (distance < DOUBLE_TAP_THRESHOLD)); 
		}
		
		/**
		 * Returns true if we are detecting taps and have one
		 * @return Boolean
		 * @inner
		*/
		function didTap() {
		    //Enure we dont return 0 or null for false values
			return !!(validateTap() && hasTap());
		}
		
		
		/**
		 * Returns true if we are detecting double taps and have one
		 * @return Boolean
		 * @inner
		*/
		function didDoubleTap() {
		    //Enure we dont return 0 or null for false values
			return !!(validateDoubleTap() && hasDoubleTap());
		}
		
		/**
		 * Returns true if we are detecting long taps and have one
		 * @return Boolean
		 * @inner
		*/
		function didLongTap() {
		    //Enure we dont return 0 or null for false values
			return !!(validateLongTap() && hasLongTap());
		}
		
		
		
		
		// MULTI FINGER TOUCH
		/**
		 * Starts tracking the time between 2 finger releases, and keeps track of how many fingers we initially had up
		 * @inner
		*/
		function startMultiFingerRelease() {
			previousTouchEndTime = getTimeStamp();
			previousTouchFingerCount = event.touches.length+1;
		}
		
		/**
		 * Cancels the tracking of time between 2 finger releases, and resets counters
		 * @inner
		*/
		function cancelMultiFingerRelease() {
			previousTouchEndTime = 0;
			previousTouchFingerCount = 0;
		}
		
		/**
		 * Checks if we are in the threshold between 2 fingers being released 
		 * @return Boolean
		 * @inner
		*/
		function inMultiFingerRelease() {
			
			var withinThreshold = false;
			
			if(previousTouchEndTime) {	
				var diff = getTimeStamp() - previousTouchEndTime	
				if( diff<=options.fingerReleaseThreshold ) {
					withinThreshold = true;
				}
			}
			
			return withinThreshold;	
		}
		

		/**
		* gets a data flag to indicate that a touch is in progress
		* @return Boolean
		* @inner
		*/
		function getTouchInProgress() {
			//strict equality to ensure only true and false are returned
			return !!($element.data(PLUGIN_NS+'_intouch') === true);
		}
		
		/**
		* Sets a data flag to indicate that a touch is in progress
		* @param {boolean} val The value to set the property to
		* @inner
		*/
		function setTouchInProgress(val) {
			
			//Add or remove event listeners depending on touch status
			if(val===true) {
				$element.bind(MOVE_EV, touchMove);
				$element.bind(END_EV, touchEnd);
				
				//we only have leave events on desktop, we manually calcuate leave on touch as its not supported in webkit
				if(LEAVE_EV) { 
					$element.bind(LEAVE_EV, touchLeave);
				}
			} else {
				$element.unbind(MOVE_EV, touchMove, false);
				$element.unbind(END_EV, touchEnd, false);
			
				//we only have leave events on desktop, we manually calcuate leave on touch as its not supported in webkit
				if(LEAVE_EV) { 
					$element.unbind(LEAVE_EV, touchLeave, false);
				}
			}
			
		
			//strict equality to ensure only true and false can update the value
			$element.data(PLUGIN_NS+'_intouch', val === true);
		}
		
		
		/**
		 * Creates the finger data for the touch/finger in the event object.
		 * @param {int} index The index in the array to store the finger data (usually the order the fingers were pressed)
		 * @param {object} evt The event object containing finger data
		 * @return finger data object
		 * @inner
		*/
		function createFingerData( index, evt ) {
			var id = evt.identifier!==undefined ? evt.identifier : 0; 
			
			fingerData[index].identifier = id;
			fingerData[index].start.x = fingerData[index].end.x = evt.pageX||evt.clientX;
			fingerData[index].start.y = fingerData[index].end.y = evt.pageY||evt.clientY;
			
			return fingerData[index];
		}
		
		/**
		 * Updates the finger data for a particular event object
		 * @param {object} evt The event object containing the touch/finger data to upadte
		 * @return a finger data object.
		 * @inner
		*/
		function updateFingerData(evt) {
			
			var id = evt.identifier!==undefined ? evt.identifier : 0; 
			var f = getFingerData( id );
			
			f.end.x = evt.pageX||evt.clientX;
			f.end.y = evt.pageY||evt.clientY;
			
			return f;
		}
		
		/**
		 * Returns a finger data object by its event ID.
		 * Each touch event has an identifier property, which is used 
		 * to track repeat touches
		 * @param {int} id The unique id of the finger in the sequence of touch events.
		 * @return a finger data object.
		 * @inner
		*/
		function getFingerData( id ) {
			for(var i=0; i<fingerData.length; i++) {
				if(fingerData[i].identifier == id) {
					return fingerData[i];	
				}
			}
		}
		
		/**
		 * Creats all the finger onjects and returns an array of finger data
		 * @return Array of finger objects
		 * @inner
		*/
		function createAllFingerData() {
			var fingerData=[];
			for (var i=0; i<=5; i++) {
				fingerData.push({
					start:{ x: 0, y: 0 },
					end:{ x: 0, y: 0 },
					identifier:0
				});
			}
			
			return fingerData;
		}
		
		/**
		 * Sets the maximum distance swiped in the given direction. 
		 * If the new value is lower than the current value, the max value is not changed.
		 * @param {string}  direction The direction of the swipe
		 * @param {int}  distance The distance of the swipe
		 * @inner
		*/
		function setMaxDistance(direction, distance) {
    		distance = Math.max(distance, getMaxDistance(direction) );
    		maximumsMap[direction].distance = distance;
		}
        
        /**
		 * gets the maximum distance swiped in the given direction. 
		 * @param {string}  direction The direction of the swipe
		 * @return int  The distance of the swipe
		 * @inner
		*/        
		function getMaxDistance(direction) {
			if (maximumsMap[direction]) return maximumsMap[direction].distance;
			return undefined;
		}
		
		/**
		 * Creats a map of directions to maximum swiped values.
		 * @return Object A dictionary of maximum values, indexed by direction.
		 * @inner
		*/
		function createMaximumsData() {
			var maxData={};
			maxData[LEFT]=createMaximumVO(LEFT);
			maxData[RIGHT]=createMaximumVO(RIGHT);
			maxData[UP]=createMaximumVO(UP);
			maxData[DOWN]=createMaximumVO(DOWN);
			
			return maxData;
		}
		
		/**
		 * Creates a map maximum swiped values for a given swipe direction
		 * @param {string} The direction that these values will be associated with
		 * @return Object Maximum values
		 * @inner
		*/
		function createMaximumVO(dir) {
		    return { 
		        direction:dir, 
		        distance:0
		    }
		}
		
		
		//
		// MATHS / UTILS
		//

		/**
		* Calculate the duration of the swipe
		* @return int
		* @inner
		*/
		function calculateDuration() {
			return endTime - startTime;
		}
		
		/**
		* Calculate the distance between 2 touches (pinch)
		* @param {point} startPoint A point object containing x and y co-ordinates
	    * @param {point} endPoint A point object containing x and y co-ordinates
	    * @return int;
		* @inner
		*/
		function calculateTouchesDistance(startPoint, endPoint) {
			var diffX = Math.abs(startPoint.x - endPoint.x);
			var diffY = Math.abs(startPoint.y - endPoint.y);
				
			return Math.round(Math.sqrt(diffX*diffX+diffY*diffY));
		}
		
		/**
		* Calculate the zoom factor between the start and end distances
		* @param {int} startDistance Distance (between 2 fingers) the user started pinching at
	    * @param {int} endDistance Distance (between 2 fingers) the user ended pinching at
	    * @return float The zoom value from 0 to 1.
		* @inner
		*/
		function calculatePinchZoom(startDistance, endDistance) {
			var percent = (endDistance/startDistance) * 1;
			return percent.toFixed(2);
		}
		
		
		/**
		* Returns the pinch direction, either IN or OUT for the given points
		* @return string Either {@link $.fn.swipe.directions.IN} or {@link $.fn.swipe.directions.OUT}
		* @see $.fn.swipe.directions
		* @inner
		*/
		function calculatePinchDirection() {
			if(pinchZoom<1) {
				return OUT;
			}
			else {
				return IN;
			}
		}
		
		
		/**
		* Calculate the length / distance of the swipe
		* @param {point} startPoint A point object containing x and y co-ordinates
	    * @param {point} endPoint A point object containing x and y co-ordinates
	    * @return int
		* @inner
		*/
		function calculateDistance(startPoint, endPoint) {
			return Math.round(Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)));
		}

		/**
		* Calculate the angle of the swipe
		* @param {point} startPoint A point object containing x and y co-ordinates
	    * @param {point} endPoint A point object containing x and y co-ordinates
	    * @return int
		* @inner
		*/
		function calculateAngle(startPoint, endPoint) {
			var x = startPoint.x - endPoint.x;
			var y = endPoint.y - startPoint.y;
			var r = Math.atan2(y, x); //radians
			var angle = Math.round(r * 180 / Math.PI); //degrees

			//ensure value is positive
			if (angle < 0) {
				angle = 360 - Math.abs(angle);
			}

			return angle;
		}

		/**
		* Calculate the direction of the swipe
		* This will also call calculateAngle to get the latest angle of swipe
		* @param {point} startPoint A point object containing x and y co-ordinates
	    * @param {point} endPoint A point object containing x and y co-ordinates
	    * @return string Either {@link $.fn.swipe.directions.LEFT} / {@link $.fn.swipe.directions.RIGHT} / {@link $.fn.swipe.directions.DOWN} / {@link $.fn.swipe.directions.UP}
		* @see $.fn.swipe.directions
		* @inner
		*/
		function calculateDirection(startPoint, endPoint ) {
			var angle = calculateAngle(startPoint, endPoint);

			if ((angle <= 45) && (angle >= 0)) {
				return LEFT;
			} else if ((angle <= 360) && (angle >= 315)) {
				return LEFT;
			} else if ((angle >= 135) && (angle <= 225)) {
				return RIGHT;
			} else if ((angle > 45) && (angle < 135)) {
				return DOWN;
			} else {
				return UP;
			}
		}
		

		/**
		* Returns a MS time stamp of the current time
		* @return int
		* @inner
		*/
		function getTimeStamp() {
			var now = new Date();
			return now.getTime();
		}
		
		
		
		/**
		 * Returns a bounds object with left, right, top and bottom properties for the element specified.
		 * @param {DomNode} The DOM node to get the bounds for.
		 */
		function getbounds( el ) {
			el = $(el);
			var offset = el.offset();
			
			var bounds = {	
					left:offset.left,
					right:offset.left+el.outerWidth(),
					top:offset.top,
					bottom:offset.top+el.outerHeight()
					}
			
			return bounds;	
		}
		
		
		/**
		 * Checks if the point object is in the bounds object.
		 * @param {object} point A point object.
		 * @param {int} point.x The x value of the point.
		 * @param {int} point.y The x value of the point.
		 * @param {object} bounds The bounds object to test
		 * @param {int} bounds.left The leftmost value
		 * @param {int} bounds.right The righttmost value
		 * @param {int} bounds.top The topmost value
		* @param {int} bounds.bottom The bottommost value
		 */
		function isInBounds(point, bounds) {
			return (point.x > bounds.left && point.x < bounds.right && point.y > bounds.top && point.y < bounds.bottom);
		};
	
	
	}
	
	


/**
 * A catch all handler that is triggered for all swipe directions. 
 * @name $.fn.swipe#swipe
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
 * @param {int} distance The distance the user swiped
 * @param {int} duration The duration of the swipe in milliseconds
 * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
 * @param {object} fingerData The coordinates of fingers in event
 */
 



/**
 * A handler that is triggered for "left" swipes.
 * @name $.fn.swipe#swipeLeft
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
 * @param {int} distance The distance the user swiped
 * @param {int} duration The duration of the swipe in milliseconds
 * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
 * @param {object} fingerData The coordinates of fingers in event
 */
 
/**
 * A handler that is triggered for "right" swipes.
 * @name $.fn.swipe#swipeRight
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
 * @param {int} distance The distance the user swiped
 * @param {int} duration The duration of the swipe in milliseconds
 * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
 * @param {object} fingerData The coordinates of fingers in event
 */

/**
 * A handler that is triggered for "up" swipes.
 * @name $.fn.swipe#swipeUp
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
 * @param {int} distance The distance the user swiped
 * @param {int} duration The duration of the swipe in milliseconds
 * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
 * @param {object} fingerData The coordinates of fingers in event
 */
 
/**
 * A handler that is triggered for "down" swipes.
 * @name $.fn.swipe#swipeDown
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {int} direction The direction the user swiped in. See {@link $.fn.swipe.directions}
 * @param {int} distance The distance the user swiped
 * @param {int} duration The duration of the swipe in milliseconds
 * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
 * @param {object} fingerData The coordinates of fingers in event
 */
 
/**
 * A handler triggered for every phase of the swipe. This handler is constantly fired for the duration of the pinch.
 * This is triggered regardless of swipe thresholds.
 * @name $.fn.swipe#swipeStatus
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {string} phase The phase of the swipe event. See {@link $.fn.swipe.phases}
 * @param {string} direction The direction the user swiped in. This is null if the user has yet to move. See {@link $.fn.swipe.directions}
 * @param {int} distance The distance the user swiped. This is 0 if the user has yet to move.
 * @param {int} duration The duration of the swipe in milliseconds
 * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
 * @param {object} fingerData The coordinates of fingers in event
 */
 
/**
 * A handler triggered for pinch in events.
 * @name $.fn.swipe#pinchIn
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {int} direction The direction the user pinched in. See {@link $.fn.swipe.directions}
 * @param {int} distance The distance the user pinched
 * @param {int} duration The duration of the swipe in milliseconds
 * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
 * @param {int} zoom The zoom/scale level the user pinched too, 0-1.
 * @param {object} fingerData The coordinates of fingers in event
 */

/**
 * A handler triggered for pinch out events.
 * @name $.fn.swipe#pinchOut
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {int} direction The direction the user pinched in. See {@link $.fn.swipe.directions}
 * @param {int} distance The distance the user pinched
 * @param {int} duration The duration of the swipe in milliseconds
 * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
 * @param {int} zoom The zoom/scale level the user pinched too, 0-1.
 * @param {object} fingerData The coordinates of fingers in event
 */ 

/**
 * A handler triggered for all pinch events. This handler is constantly fired for the duration of the pinch. This is triggered regardless of thresholds.
 * @name $.fn.swipe#pinchStatus
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {int} direction The direction the user pinched in. See {@link $.fn.swipe.directions}
 * @param {int} distance The distance the user pinched
 * @param {int} duration The duration of the swipe in milliseconds
 * @param {int} fingerCount The number of fingers used. See {@link $.fn.swipe.fingers}
 * @param {int} zoom The zoom/scale level the user pinched too, 0-1.
 * @param {object} fingerData The coordinates of fingers in event
 */

/**
 * A click handler triggered when a user simply clicks, rather than swipes on an element.
 * This is deprecated since version 1.6.2, any assignment to click will be assigned to the tap handler.
 * You cannot use <code>on</code> to bind to this event as the default jQ <code>click</code> event will be triggered.
 * Use the <code>tap</code> event instead.
 * @name $.fn.swipe#click
 * @event
 * @deprecated since version 1.6.2, please use {@link $.fn.swipe#tap} instead 
 * @default null
 * @param {EventObject} event The original event object
 * @param {DomObject} target The element clicked on.
 */
 
 /**
 * A click / tap handler triggered when a user simply clicks or taps, rather than swipes on an element.
 * @name $.fn.swipe#tap
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {DomObject} target The element clicked on.
 */
 
/**
 * A double tap handler triggered when a user double clicks or taps on an element.
 * You can set the time delay for a double tap with the {@link $.fn.swipe.defaults#doubleTapThreshold} property. 
 * Note: If you set both <code>doubleTap</code> and <code>tap</code> handlers, the <code>tap</code> event will be delayed by the <code>doubleTapThreshold</code>
 * as the script needs to check if its a double tap.
 * @name $.fn.swipe#doubleTap
 * @see  $.fn.swipe.defaults#doubleTapThreshold
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {DomObject} target The element clicked on.
 */
 
 /**
 * A long tap handler triggered once a tap has been release if the tap was longer than the longTapThreshold.
 * You can set the time delay for a long tap with the {@link $.fn.swipe.defaults#longTapThreshold} property. 
 * @name $.fn.swipe#longTap
 * @see  $.fn.swipe.defaults#longTapThreshold
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {DomObject} target The element clicked on.
 */

  /**
 * A hold tap handler triggered as soon as the longTapThreshold is reached
 * You can set the time delay for a long tap with the {@link $.fn.swipe.defaults#longTapThreshold} property. 
 * @name $.fn.swipe#hold
 * @see  $.fn.swipe.defaults#longTapThreshold
 * @event
 * @default null
 * @param {EventObject} event The original event object
 * @param {DomObject} target The element clicked on.
 */

}));

},{}],6:[function(require,module,exports){
/**
 * Bunch of XPath tools used in Enketo Smart Paper
 */

( function( factory ) {
    if ( typeof define === 'function' && define.amd ) {
        define( [ 'jquery' ], factory );
    } else {
        factory( jQuery );
    }
}( function( $ ) {

    /**
     * Creates an XPath from a node
     * @param  {string=} rootNodeName   if absent the root is #document
     * @param  {boolean=} includePosition whether or not to include the positions /path/to/repeat[2]/node
     * @return {string}                 XPath
     */
    $.fn.getXPath = function( rootNodeName, includePosition ) {
        //other nodes may have the same XPath but because this function is used to determine the corresponding input name of a data node, index is not included 
        var $sibSameNameAndSelf,
            steps = [],
            position = '',
            $node = this.first(),
            nodeName = $node.prop( 'nodeName' ),
            $parent = $node.parent(),
            parentName = $parent.prop( 'nodeName' );

        rootNodeName = rootNodeName || '#document';
        includePosition = includePosition || false;

        if ( includePosition ) {
            $sibSameNameAndSelf = $node.siblings( nodeName ).addBack();
            position = ( $sibSameNameAndSelf.length > 1 ) ? '[' + ( $sibSameNameAndSelf.index( $node ) + 1 ) + ']' : '';
        }

        steps.push( nodeName + position );

        while ( $parent.length == 1 && parentName !== rootNodeName && parentName !== '#document' ) {
            if ( includePosition ) {
                $sibSameNameAndSelf = $parent.siblings( parentName ).addBack();
                position = ( $sibSameNameAndSelf.length > 1 ) ? '[' + ( $sibSameNameAndSelf.index( $parent ) + 1 ) + ']' : '';
            }
            steps.push( parentName + position );
            $parent = $parent.parent();
            parentName = $parent.prop( 'nodeName' );
        }
        return '/' + steps.reverse().join( '/' );
    };

    /**
     * Simple XPath Compatibility Plugin for jQuery 1.1
     * By John Resig
     * Dual licensed under MIT and GPL.
     * Original plugin code here: http://code.google.com/p/jqueryjs/source/browse/trunk/plugins/xpath/jquery.xpath.js?spec=svn3167&r=3167
     * some changes made by Martijn van de Rijdt (not replacing $.find(), removed context, dot escaping)
     *
     * @param  {string} selector [description]
     * @return {?(Array.<(Element|null)>|Element)}          [description]
     */
    $.fn.xfind = function( selector ) {
        var parts, cur, i;

        // Convert // to " "
        selector = selector.replace( /\/\//g, " " );

        //added by Martijn
        selector = selector.replace( /^\//, "" );
        selector = selector.replace( /\/\.$/, "" );

        // Convert / to >
        selector = selector.replace( /\//g, ">" );

        // Naively convert [elem] into :has(elem)
        selector = selector.replace( /\[([^@].*?)\]/g, function( m, selector ) {
            return ":has(" + selector + ")";
        } );

        // Naively convert /.. into a new set of expressions
        // Martijn: I just don't see this except if this always occurs as nodea/../../parentofnodea/../../grandparentofnodea
        if ( selector.indexOf( ">.." ) >= 0 ) {
            parts = selector.split( />\.\.>?/g );
            //var cur = jQuery(parts[0], context);
            cur = jQuery( parts[ 0 ], this );
            for ( i = 1; i < parts.length; i++ )
                cur = cur.parent( parts[ i ] );
            return cur.get();
        }

        // any remaining dots inside node names need to be escaped (added by Martijn)
        selector = selector.replace( /\./gi, '\\.' );

        //if performance becomes an issue, it's worthwhile implementing this with native XPath instead.
        return this.find( selector );
    };

} ) );

},{}],7:[function(require,module,exports){
window.EnketoForm = require('./src/js/Form');

},{"./src/js/Form":11}],8:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],9:[function(require,module,exports){
var ExtendedXpathEvaluator = function(wrapped, extensions) {
  var
    extendedFuncs = extensions.func || {},
    extendedProcessors = extensions.process || {},
    toInternalResult = function(r) {
      if(r.resultType === XPathResult.NUMBER_TYPE) return { t:'num', v:r.numberValue };
      if(r.resultType === XPathResult.BOOLEAN_TYPE) return {  t:'bool', v:r.booleanValue };
      return { t:'str', v:r.stringValue };
    },
    toExternalResult = function(r) {
      if(extendedProcessors.toExternalResult) {
        var res = extendedProcessors.toExternalResult(r);
        if(res) return res;
      }
      if(r.t === 'num') return { resultType:XPathResult.NUMBER_TYPE, numberValue:r.v, stringValue:r.v.toString() };
      if(r.t === 'bool') return { resultType:XPathResult.BOOLEAN_TYPE, booleanValue:r.v, stringValue:r.v.toString() };
      return { resultType:XPathResult.STRING_TYPE, stringValue:r.v.toString() };
    },
    callFn = function(name, args) {
      if(extendedFuncs.hasOwnProperty(name)) {
        return callExtended(name, args);
      }
      return callNative(name, args);
    },
    callExtended = function(name, args) {
      var argVals = [], argString, res, i;
      for(i=0; i<args.length; ++i) argVals.push(args[i].v);
      res = extendedFuncs[name].apply(null, argVals);
      return res;
    },
    callNative = function(name, args) {
      var argString = '', arg, quote, i;
      for(i=0; i<args.length; ++i) {
        arg = args[i];
        if(arg.t !== 'num' && arg.t !== 'bool') {
          quote = arg.v.indexOf('"') === -1 ? '"' : "'";
          argString += quote;
        }
        argString += arg.v;
        if(arg.t === 'bool') argString += '()';
        if(arg.t !== 'num' && arg.t !== 'bool') argString += quote;
        if(i < args.length - 1) argString += ', ';
      }
      return toInternalResult(wrapped(name + '(' + argString + ')'));
    },
    typefor = function(val) {
      if(extendedProcessors.typefor) {
        var res = extendedProcessors.typefor(val);
        if(res) return res;
      }
      if(typeof val === 'boolean') return 'bool';
      if(typeof val === 'number') return 'number';
      return 'str';
    },
  ___end_vars___;

  this.evaluate = function(input) {
    var cur, stack = [{ t:'root', tokens:[] }],
      peek = function() { return stack.slice(-1)[0]; },
      err = function(message) { throw new Error((message||'') + ' [stack=' + JSON.stringify(stack) + '] [cur=' + JSON.stringify(cur) + ']'); },
      newCurrent = function() { cur = { t:'?', v:'' }; },
      backtrack = function() {
        // handle infix operators
        var res, len, tokens, lhs, rhs, op;
        tokens = peek().tokens;
        len = tokens.length;
        if(len >= 3) {
          lhs = tokens[len - 3];
          op  = tokens[len - 2];
          rhs = tokens[len - 1];

          if(extendedProcessors.handleInfix) {
            res = extendedProcessors.handleInfix(lhs, op, rhs);
            if(res && res.t === 'continue') {
              lhs = res.lhs; op = res.op; rhs = res.rhs; res = null;
            }
          }

          if(typeof res === 'undefined' || res === null) {
            if(     op.t === '+') res = lhs.v + rhs.v;
            else if(op.t === '-') res = lhs.v - rhs.v;
            else if(op.t === '*') res = lhs.v * rhs.v;
            else if(op.t === '/') res = lhs.v / rhs.v;
            else if(op.t === '%') res = lhs.v % rhs.v;
            else if(op.t === '=') res = lhs.v === rhs.v;
            else if(op.t === '<') res = lhs.v < rhs.v;
            else if(op.t === '>') res = lhs.v > rhs.v;
            else if(op.t === '<=') res = lhs.v <= rhs.v;
            else if(op.t === '>=') res = lhs.v >= rhs.v;
            else if(op.t === '!=') res = lhs.v != rhs.v;
            else if(op.t === '&') res = lhs.v && rhs.v;
            else if(op.t === '|') res = lhs.v || rhs.v;
          }

          if(typeof res !== 'undefined' && res !== null) {
            tokens = tokens.slice(0, -3);
            tokens.push({ t:typefor(res), v:res });
            peek().tokens = tokens;
          }
        }
      },
      handleXpathExpr = function() {
        var evaluated, v = cur.v.trim();
        if(/^-?[0-9]+(\.[0-9]+)?$/.test(v)) {
          evaluated = { t:'num', v:parseFloat(v) };
        } else {
          evaluated = toInternalResult(wrapped(cur.v));
        }
        peek().tokens.push(evaluated);
        newCurrent();
        backtrack();
      },
      lastChar = function() {
        if(i > 0) return input.charAt(i-1);
      },
      nextChar = function() {
        if(i < input.length -1) return input.charAt(i+1);
      },
      ___end_vars___;

    newCurrent();

    for(i=0; i<input.length; ++i) {
      c = input.charAt(i);
      if(cur.t === 'str') {
        if(c === cur.quote) {
          peek().tokens.push(cur);
          backtrack();
          newCurrent();
        } else cur.v += c;
      } else switch(c) {
        case "'":
        case '"':
          if(cur.t === '?' && cur.v === '') {
            cur = { t:'str', quote:c, v:'' };
          } else err('Not sure how to handle: ' + c);
          break;
        case '(':
          if(cur.t === '?' && cur.v !== '') {
            cur.t = 'fn';
            cur.tokens = [];
            stack.push(cur);
            newCurrent();
          } else err();
          break;
        case ')':
          if(cur.t === '?') {
            if(cur.v !== '') handleXpathExpr();
            var fn = stack.pop();
            if(fn.t !== 'fn') err();
            peek().tokens.push(callFn(fn.v, fn.tokens));
            backtrack();
            newCurrent();
          } else err();
          break;
        case ',':
          if(cur.t === '?') {
            if(cur.v !== '') handleXpathExpr();
            if(peek().t !== 'fn') err();
          } else err();
          break;
        case '-':
          if(/[0-9]/.test(nextChar()) ||
              (nextChar() !== ' ' && lastChar() !== ' ')) {
            // -ve number or function name expr
            cur.v += c;
            break;
          } // else it's `-` operator
          /* falls through */
        case '=':
          if(c === '=' && (cur.v === '<' || cur.v === '&lt;' ||
              cur.v === '>' || cur.v === '&gt;' || cur.v === '!')) {
            cur.v += c; break;
          }
          /* falls through */
        case '>':
        case '<':
          if((c === '<' || c === '>') && nextChar() === '=') {
            cur.v += c; break;
          }
          /* falls through */
        case '+':
        case '*':
          if(cur.t === '?') {
            if(cur.v !== '') handleXpathExpr();
            peek().tokens.push({ t:c });
          } else err();
          break;
        case ' ':
          if(cur.t === '?') {
            if(cur.v !== '') {
              if(cur.v === 'mod') {
                peek().tokens.push({ t:'%' });
                newCurrent();
              } else if(cur.v === 'div') {
                peek().tokens.push({ t:'/' });
                newCurrent();
              } else if(cur.v === 'and') {
                peek().tokens.push({ t:'&' });
                newCurrent();
              } else if(cur.v === 'or') {
                peek().tokens.push({ t:'|' });
                newCurrent();
              } else if(cur.v === '&lt;') {
                peek().tokens.push({ t:'<' });
                newCurrent();
              } else if(cur.v === '&gt;') {
                peek().tokens.push({ t:'>' });
                newCurrent();
              } else if(cur.v === '<=' || cur.v === '&lt;=') {
                peek().tokens.push({ t:'<=' });
                newCurrent();
              } else if(cur.v === '>=' || cur.v === '&gt;=') {
                peek().tokens.push({ t:'>=' });
                newCurrent();
              } else if(cur.v === '!=') {
                peek().tokens.push({ t:'!=' });
                newCurrent();
              } else {
                handleXpathExpr();
              }
            }
            break;
          }
          /* falls through */
        default:
          cur.v += c;
      }
    }

    if(cur.t === '?' && cur.v !== '') handleXpathExpr();

    if(cur.t !== '?' || cur.v !== '' || (cur.tokens && current.tokens.length)) err('Current item not evaluated!');
    if(stack.length > 1) err('Stuff left on stack.');
    if(stack[0].t !== 'root') err('Weird stuff on stack.');
    if(stack[0].tokens.length === 0) err('No tokens.');
    if(stack[0].tokens.length > 1) err('Too many tokens.');

    return toExternalResult(stack[0].tokens[0]);
  };
};

if(typeof define === 'function') {
  define(function() { return ExtendedXpathEvaluator; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ExtendedXpathEvaluator;
}

},{}],10:[function(require,module,exports){
var openrosa_xpath_extensions = (function() {
  var ___start_vars___,
      MILLIS_PER_DAY = 1000 * 60 * 60 * 24,
      MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      RAW_NUMBER = /^(-?[0-9]+)(\.[0-9]+)?$/,
      DATE_STRING = /^\d\d\d\d-\d\d-\d\d(?:T\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d))?$/,
      XPR = {
        boolean: function(val) { return { t:'bool', v:val }; },
        number: function(val) { return { t:'num', v:val }; },
        string: function(val) { return { t:'str', v:val }; },
        date: function(val) {
          if(!(val instanceof Date)) throw new Error('Cannot create date from ' + val + ' (' + (typeof val) + ')');
          return { t:'date', v:val };
        }
      },
      _zeroPad = function(n, len) {
        len = len || 2;
        n = n.toString();
        while(n.length < len) n = '0' + n;
        return n;
      },
      _num = function(o) {
        return Math.round(o.t === 'num'? o.v: parseFloat(o.v));
      },
      _dateToString = function(d) {
            return d.getFullYear() + '-' + _zeroPad(d.getMonth()+1) + '-' +
                _zeroPad(d.getDate());
      },
      _uuid_part = function(c) {
          var r = Math.random()*16|0,
                  v=c=='x'?r:r&0x3|0x8;
          return v.toString(16);
      },
      uuid = function() {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                  .replace(/[xy]/g, _uuid_part);
      },
      date = function(it) {
        if(RAW_NUMBER.test(it)) {
          var tempDate = new Date(0);
          tempDate.setUTCDate(1 + parseInt(it, 10));
          return XPR.date(tempDate);
        } else if(DATE_STRING.test(it)) {
          return XPR.date(new Date(it.substring(0, 10)));
        } else {
          return XPR.string('Invalid Date');
        }
      },
      format_date = function(date, format) {
        date = Date.parse(date);
        if(isNaN(date)) return '';
        date = new Date(date);
        var c, i, sb = '', f = {
          year: 1900 + date.getYear(),
          month: 1 + date.getMonth(),
          day: date.getDate(),
          hour: date.getHours(),
          minute: date.getMinutes(),
          second: date.getSeconds(),
          secTicks: date.getTime(),
          dow: date.getDay(),
        };

        for(i=0; i<format.length; ++i) {
          c = format.charAt(i);

          if (c === '%') {
            if(++i >= format.length) {
              throw new Error("date format string ends with %");
            }
            c = format.charAt(i);

            if (c === '%') { // literal '%'
              sb += '%';
            } else if (c === 'Y') {  //4-digit year
              sb += _zeroPad(f.year, 4);
            } else if (c === 'y') {  //2-digit year
              sb += _zeroPad(f.year, 4).substring(2);
            } else if (c === 'm') {  //0-padded month
              sb += _zeroPad(f.month, 2);
            } else if (c === 'n') {  //numeric month
              sb += f.month;
            } else if (c === 'b') {  //short text month
              sb += MONTHS[f.month - 1];
            } else if (c === 'd') {  //0-padded day of month
              sb += _zeroPad(f.day, 2);
            } else if (c === 'e') {  //day of month
              sb += f.day;
            } else if (c === 'H') {  //0-padded hour (24-hr time)
              sb += _zeroPad(f.hour, 2);
            } else if (c === 'h') {  //hour (24-hr time)
              sb += f.hour;
            } else if (c === 'M') {  //0-padded minute
              sb += _zeroPad(f.minute, 2);
            } else if (c === 'S') {  //0-padded second
              sb += _zeroPad(f.second, 2);
            } else if (c === '3') {  //0-padded millisecond ticks (000-999)
              sb += _zeroPad(f.secTicks, 3);
            } else if (c === 'a') {  //Three letter short text day
              sb += DAYS[f.dow - 1];
            } else if (c === 'Z' || c === 'A' || c === 'B') {
              throw new Error('unsupported escape in date format string [%' + c + ']');
            } else {
              throw new Error('unrecognized escape in date format string [%' + c + ']');
            }
          } else {
            sb += c;
          }
        }

        return sb;
      },
      func,
      ___end_vars___;

  func = {
    'boolean-from-string': function(string) {
      return XPR.boolean(string === '1' || string === 'true');
    },
    coalesce: function(a, b) { return XPR.string(a || b); },
    date: date,
    'decimal-date': function(date) {
        return XPR.number(Date.parse(date) / MILLIS_PER_DAY); },
    'false': function() { return XPR.boolean(false); },
    'format-date': function(date, format) {
        return XPR.string(format_date(date, format)); },
    'if': function(con, a, b) { return XPR.string(con? a: b); },
    int: function(v) { return XPR.number(parseInt(v, 10)); },
    now: function() { return XPR.number(Date.now()); },
    pow: function(x, y) { return XPR.number(Math.pow(x, y)); },
    random: function() { return XPR.number(Math.random()); },
    regex: function(haystack, pattern) {
        return XPR.boolean(new RegExp(pattern).test(haystack)); },
    selected: function(haystack, needle) {
        return XPR.boolean(haystack.split(' ').indexOf(needle) !== -1);
    },
    substr: function(string, startIndex, endIndex) {
        return XPR.string(string.slice(startIndex, endIndex)); },
    today: function() { return XPR.date(new Date()); },
    'true': function() { return XPR.boolean(true); },
    uuid: function() { return XPR.string(uuid()); },
  };

  // function aliases
  func['date-time'] = func.date;
  func['decimal-date-time'] = func['decimal-date'];
  func['format-date-time'] = func['format-date'];

  return {
    func:func,
    process: {
      toExternalResult: function(r) {
        if(r.t === 'date') return {
          resultType:XPathResult.STRING_TYPE, stringValue:_dateToString(r.v) };
      },
      typefor: function(val) {
        if(val instanceof Date) return 'date';
      },
      handleInfix: function(lhs, op, rhs) {
        if(lhs.t === 'date' || rhs.t === 'date') {
          // For comparisons, we must make sure that both values are numbers
          // Dates would be fine, except for quality!
          if( op.t === '=' ||
              op.t === '<' ||
              op.t === '>' ||
              op.t === '<=' ||
              op.t === '>=' ||
              op.t === '!=') {
            if(lhs.t === 'str') lhs = date(lhs.v);
            if(rhs.t === 'str') rhs = date(rhs.v);
            if(lhs.t !== 'date' || rhs.t !== 'date') {
              return op.t === '!=';
            } else {
              lhs = { t:'num', v:lhs.v.getTime() };
              rhs = { t:'num', v:rhs.v.getTime() };
            }
          } else if(op.t === '+' || op.t === '-') {
            // for math operators, we need to do it ourselves
            if(lhs.t === 'date' && rhs.t === 'date') err();
            var d = lhs.t === 'date'? lhs.v: rhs.v,
                n = lhs.t !== 'date'? _num(lhs): _num(rhs),
                res = new Date(d.getTime());
            if(op.t === '-') n = -n;
            res.setUTCDate(d.getDate() + n);
            return res;
          }
          return { t:'continue', lhs:lhs, op:op, rhs:rhs };
        }
      },
    },
  };
}());

if(typeof define === 'function') {
  define(function() { return openrosa_xpath_extensions; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = openrosa_xpath_extensions;
}


},{}],11:[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function(require, exports, module){
    'use strict';
    var FormModel = require('./FormModel');
    var widgets = require('./widgets');
    var $ = require('jquery');
    require('./plugins');
    require('./extend');
    require('jquery.touchswipe');

        /**
         * Class: Form
         *
         * This class provides the JavaRosa form functionality by manipulating the survey form DOM object and
         * continuously updating the data XML Document. All methods are placed inside the constructor (so privileged
         * or private) because only one instance will be created at a time.
         *
         * @param {string} formSelector  jquery selector for the form
         * @param {{modelStr: string, ?instanceStr: string, ?submitted: boolean, ?external: <{id: string, xmlStr: string }> }} data data object containing XML model, (partial) XML instance-to-load, external data and flag about whether instance-to-load has already been submitted before.
         *
         * @constructor
         */

        function Form( formSelector, data ) {
            var model, cookies, form, $form, $formClone, repeatsPresent, fixExpr,
                loadErrors = [];

            /**
             * Function: init
             *
             * Initializes the Form instance (XML Model and HTML View).
             *
             */
            this.init = function() {
                // cloning children to keep any delegated event handlers on 'form.or' intact upon resetting
                $formClone = $( formSelector ).clone().appendTo( '<original></original>' );

                model = new FormModel( data );
                loadErrors = loadErrors.concat( model.init() );

                form = new FormView( formSelector );

                repeatsPresent = ( $( formSelector ).find( '.or-repeat' ).length > 0 );

                form.init();

                if ( window.scrollTo ) {
                    window.scrollTo( 0, 0 );
                }

                return loadErrors;
            };

            this.ex = function( expr, type, selector, index, tryNative ) {
                return model.evaluate( expr, type, selector, index, tryNative );
            };
            this.getModel = function() {
                return model;
            };
            this.getInstanceID = function() {
                return model.getInstanceID();
            };
            this.getInstanceName = function() {
                return model.getInstanceName();
            };
            this.getView = function() {
                return form;
            };
            this.getEncryptionKey = function() {
                return form.$.data( 'base64rsapublickey' );
            };

            /**
             * @param {boolean=} incTempl
             * @param {boolean=} incNs
             * @param {boolean=} all
             */
            this.getDataStr = function() {
                return model.getStr();
            };

            this.getRecordName = function() {
                return form.recordName.get();
            };
            /**
             * @param {string} name
             */
            this.setRecordName = function( name ) {
                return form.recordName.set( name );
            };
            /**
             * @param { boolean } status [description]
             */
            this.setEditStatus = function( status ) {
                return form.editStatus.set( status );
            };
            this.getEditStatus = function() {
                return form.editStatus.get();
            };
            this.getSurveyName = function() {
                return $form.find( '#form-title' ).text();
            };

            /**
             * Restores HTML form to pre-initialized state. It is meant to be called before re-initializing with
             * new Form ( .....) and form.init()
             * For this reason, it does not fix event handler, $form, formView.$ etc.!
             * It also does not affect the XML instance!
             */
            this.resetView = function() {
                //form language selector was moved outside of <form> so has to be separately removed
                $( '#form-languages' ).remove();
                $form.replaceWith( $formClone );
            };
            /**
             * @deprecated
             * @type {Function}
             */
            this.resetHTML = this.resetView;

            /**
             * Validates the whole form and returns true or false
             *
             * @return {boolean}
             */
            this.validate = function() {
                return form.validateAll();
            };
            /**
             * Returns wether form has validated as true or false. Needs to be called AFTER calling validate()!
             *
             *  @return {!boolean}
             */
            this.isValid = function() {
                return form.isValid();
            };

            /**
             * Implements jr:choice-name
             * TODO: this needs to work for all expressions (relevants, constraints), now it only works for calulated items
             * Ideally this belongs in the form Model, but unfortunately it needs access to the view
             * 
             * @param  {[type]} expr       [description]
             * @param  {[type]} resTypeStr [description]
             * @param  {[type]} selector   [description]
             * @param  {[type]} index      [description]
             * @param  {[type]} tryNative  [description]
             * @return {[type]}            [description]
             */
            fixExpr = function( expr, resTypeStr, selector, index, tryNative ) {
                var value, name, $input, label = '',
                    matches = expr.match( /jr:choice-name\(([^,]+),\s?'(.*?)'\)/ );

                if ( matches ) {
                    value = model.evaluate( matches[ 1 ], resTypeStr, selector, index, tryNative );
                    name = matches[ 2 ].trim();
                    $input = $form.find( '[name="' + name + '"]' );

                    if ( $input.length > 0 && $input.prop( 'nodeName' ).toLowerCase() === 'select' ) {
                        label = $input.find( '[value="' + value + '"]' ).text();
                    } else if ( $input.length > 0 && $input.prop( 'nodeName' ).toLowerCase() === 'input' ) {
                        label = $input.filter( function() {
                            return $( this ).attr( 'value' ) === value;
                        } ).siblings( '.option-label.active' ).text();
                    }
                    return expr.replace( matches[ 0 ], '"' + label + '"' );
                }
                return expr;
            };

            /**
             * Inner Class dealing with the HTML Form
             * @param {string} selector jQuery selector of form
             * @constructor
             * @extends Form
             */

            function FormView( selector ) {
                //there will be only one instance of FormView
                $form = $( selector );
                //used for testing
                this.$ = $form;
                this.$nonRepeats = {};
            }

            FormView.prototype.init = function() {
                var that = this;

                if ( typeof model === 'undefined' || !( model instanceof FormModel ) ) {
                    return console.error( 'variable data needs to be defined as instance of FormModel' );
                }

                // before widgets.init (as instanceID used in offlineFilepicker widget)
                this.preloads.init( this );

                // before calcUpdate!
                this.grosslyViolateStandardComplianceByIgnoringCertainCalcs();

                // before repeat.init to make sure the jr:repeat-count calculation has been evaluated
                this.calcUpdate();

                // before itemsetUpdate
                this.langs.init();

                // after radio button data-name setting
                this.repeat.init( this );

                // after repeat.init()
                this.itemsetUpdate();

                // after repeat.init()
                this.setAllVals();

                // after setAllVals(), after repeat.init()
                widgets.init();

                // after widgets.init(), and repeat.init()
                this.branchUpdate();

                // after branch.init();
                this.pages.init();

                // after repeat.init()
                this.outputUpdate();

                // after widgets init to make sure widget handlers are called before
                // after loading existing instance to not trigger an 'edit' event
                this.setEventHandlers();

                this.editStatus.set( false );

                setTimeout( function() {
                    that.progress.update();
                }, 0 );
            };

            FormView.prototype.pages = {
                active: false,
                $current: [],
                $activePages: $(),
                init: function() {

                    if ( $form.hasClass( 'pages' ) ) {
                        var $allPages = $form.find( '.note, .question, .trigger, .or-appearance-field-list' )
                            .filter( function() {
                                // something tells me there is a more efficient way to doing this
                                // e.g. by selecting the descendants of the .or-appearance-field-list and removing those
                                return $( this ).parent().closest( '.or-appearance-field-list' ).length === 0;
                            } )
                            .attr( 'role', 'page' );

                        if ( $allPages.length > 1 || $allPages.eq( 0 ).hasClass( 'or-repeat' ) ) {
                            this.$formFooter = $( '.form-footer' );
                            this.$btnFirst = this.$formFooter.find( '.first-page' );
                            this.$btnPrev = this.$formFooter.find( '.previous-page' );
                            this.$btnNext = this.$formFooter.find( '.next-page' );
                            this.$btnLast = this.$formFooter.find( '.last-page' );

                            this.updateAllActive( $allPages );
                            this.toggleButtons( 0 );
                            this.setButtonHandlers();
                            this.setRepeatHandlers();
                            this.setBranchHandlers();
                            this.setSwipeHandlers();
                            this.active = true;
                        }

                        this.flipToFirst();

                        $form.show();
                    }
                },
                setButtonHandlers: function() {
                    var that = this;
                    // Make sure eventhandlers are not duplicated after resetting form.
                    this.$btnFirst.off( '.pagemode' ).on( 'click.pagemode', function() {
                        that.flipToFirst();
                        return false;
                    } );
                    this.$btnPrev.off( '.pagemode' ).on( 'click.pagemode', function() {
                        that.prev();
                        return false;
                    } );
                    this.$btnNext.off( '.pagemode' ).on( 'click.pagemode', function() {
                        that.next();
                        return false;
                    } );
                    this.$btnLast.off( '.pagemode' ).on( 'click.pagemode', function() {
                        that.flipToLast();
                        return false;
                    } );
                },
                setSwipeHandlers: function() {
                    var that = this,
                        $main = $( '.main' );

                    $main.swipe( 'destroy' );
                    $main.swipe( {
                        allowPageScroll: 'vertical',
                        threshold: 150,
                        swipeLeft: function() {
                            that.next();
                        },
                        swipeRight: function() {
                            that.prev();
                        }
                    } );
                },
                setRepeatHandlers: function() {
                    var that = this;
                    // TODO: can be optimized by smartly updating the active pages
                    $form
                        .off( 'addrepeat.pagemode' )
                        .on( 'addrepeat.pagemode', function( event ) {
                            that.updateAllActive();
                            // removing the class in effect avoids the animation
                            $( event.target ).removeClass( 'current contains-current' ).find( '.current' ).removeClass( 'current' );
                            that.flipToPageContaining( $( event.target ) );
                        } )
                        .off( 'removerepeat.pagemode' )
                        .on( 'removerepeat.pagemode', function( event ) {
                            // if the current page is removed
                            // note that that.$current will have length 1 even if it was removed from DOM!
                            if ( that.$current.closest( 'html' ).length === 0 ) {
                                that.updateAllActive();
                                // is it best to go to previous page always?
                                that.flipToPageContaining( $( event.target ) );
                            }
                        } );
                },
                setBranchHandlers: function() {
                    var that = this;
                    // TODO: can be optimized by smartly updating the active pages
                    $form
                        .off( 'changebranch.pagemode' )
                        .on( 'changebranch.pagemode', function() {
                            that.updateAllActive();
                            that.toggleButtons();
                        } );
                },
                getCurrent: function() {
                    return this.$current;
                },
                updateAllActive: function( $all ) {
                    $all = $all || $( '.or [role="page"]' );
                    this.$activePages = $all.filter( function() {
                        return $( this ).closest( '.disabled' ).length === 0;
                    } );
                },
                getAllActive: function() {
                    return this.$activePages;
                },
                getPrev: function( currentIndex ) {
                    return this.$activePages[ currentIndex - 1 ];
                },
                getNext: function( currentIndex ) {
                    return this.$activePages[ currentIndex + 1 ];
                },
                getCurrentIndex: function() {
                    return this.$activePages.index( this.$current );
                },
                next: function() {
                    var next, currentIndex;
                    this.updateAllActive();
                    currentIndex = this.getCurrentIndex();
                    next = this.getNext( currentIndex );

                    if ( next ) {
                        this.flipTo( next, currentIndex + 1 );
                    }
                },
                prev: function() {
                    var prev, currentIndex;
                    this.updateAllActive();
                    currentIndex = this.getCurrentIndex();
                    prev = this.getPrev( currentIndex );

                    if ( prev ) {
                        this.flipTo( prev, currentIndex - 1 );
                    }
                },
                setToCurrent: function( pageEl ) {
                    var $n = $( pageEl );
                    $n.addClass( 'current hidden' );
                    this.$current = $n.removeClass( 'hidden' )
                        .parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).addClass( 'contains-current' ).end();
                },
                flipTo: function( pageEl, newIndex ) {
                    // if there is a current page
                    if ( this.$current.length > 0 && this.$current.closest( 'html' ).length === 1 ) {
                        // if current page is not same as pageEl
                        if ( this.$current[ 0 ] !== pageEl ) {
                            this.$current.removeClass( 'current fade-out' ).parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).removeClass( 'contains-current' );
                            this.setToCurrent( pageEl );
                            this.focusOnFirstQuestion( pageEl );
                            this.toggleButtons( newIndex );
                        }
                    } else {
                        this.setToCurrent( pageEl );
                        this.focusOnFirstQuestion( pageEl );
                        this.toggleButtons( newIndex );
                    }

                    if ( window.scrollTo ) {
                        window.scrollTo( 0, 0 );
                    }

                    $( pageEl ).trigger( 'pageflip.enketo' );
                },
                flipToFirst: function() {
                    this.updateAllActive();
                    this.flipTo( this.$activePages[ 0 ] );
                },
                flipToLast: function() {
                    this.updateAllActive();
                    this.flipTo( this.$activePages.last()[ 0 ] );
                },
                // flips to the page provided as jQueried parameter or the page containing
                // the jQueried element provided as parameter
                // alternatively, (e.g. if a top level repeat without field-list appearance is provided as parameter)
                // it flips to the page contained with the jQueried parameter;
                flipToPageContaining: function( $e ) {
                    var $closest;
                    $closest = $e.closest( '[role="page"]' );
                    $closest = ( $closest.length === 0 ) ? $e.find( '[role="page"]' ) : $closest;

                    //this.updateAllActive();
                    this.flipTo( $closest[ 0 ] );
                },
                focusOnFirstQuestion: function( pageEl ) {
                    //triggering fake focus in case element cannot be focused (if hidden by widget)
                    $( pageEl ).find( '.question:not(.disabled)' ).filter( function() {
                        return $( this ).parentsUntil( '.or', '.disabled' ).length === 0;
                    } ).eq( 0 ).find( 'input, select, textarea' ).eq( 0 ).trigger( 'fakefocus' );
                },
                toggleButtons: function( index ) {
                    var i = index || this.getCurrentIndex(),
                        next = this.getNext( i ),
                        prev = this.getPrev( i );
                    this.$btnNext.add( this.$btnLast ).toggleClass( 'disabled', !next );
                    this.$btnPrev.add( this.$btnFirst ).toggleClass( 'disabled', !prev );
                    this.$formFooter.toggleClass( 'end', !next );
                }
            };

            //this may not be the most efficient. Could also be implemented like model.Nodeset;
            //also use for fieldset nodes (to evaluate branch logic) and also used to get and set form data of the app settings
            FormView.prototype.input = {
                //multiple nodes are limited to ones of the same input type (better implemented as JQuery plugin actually)
                getWrapNodes: function( $inputNodes ) {
                    var type = this.getInputType( $inputNodes.eq( 0 ) );
                    return ( type === 'fieldset' ) ? $inputNodes : $inputNodes.closest( '.question, .note' );
                },
                /** very inefficient, should actually not be used **/
                getProps: function( $node ) {
                    if ( $node.length !== 1 ) {
                        return console.error( 'getProps(): no input node provided or multiple' );
                    }
                    return {
                        path: this.getName( $node ),
                        ind: this.getIndex( $node ),
                        inputType: this.getInputType( $node ),
                        xmlType: this.getXmlType( $node ),
                        constraint: this.getConstraint( $node ),
                        calculation: this.getCalculation( $node ),
                        relevant: this.getRelevant( $node ),
                        val: this.getVal( $node ),
                        required: this.isRequired( $node ),
                        enabled: this.isEnabled( $node ),
                        multiple: this.isMultiple( $node )
                    };
                },
                getInputType: function( $node ) {
                    var nodeName;
                    if ( $node.length !== 1 ) {
                        return ''; //console.error('getInputType(): no input node provided or multiple');
                    }
                    nodeName = $node.prop( 'nodeName' ).toLowerCase();
                    if ( nodeName === 'input' ) {
                        if ( $node.attr( 'type' ).length > 0 ) {
                            return $node.attr( 'type' ).toLowerCase();
                        } else {
                            return console.error( '<input> node has no type' );
                        }
                    } else if ( nodeName === 'select' ) {
                        return 'select';
                    } else if ( nodeName === 'textarea' ) {
                        return 'textarea';
                    } else if ( nodeName === 'fieldset' || nodeName === 'section' ) {
                        return 'fieldset';
                    } else {
                        return console.error( 'unexpected input node type provided' );
                    }
                },
                getConstraint: function( $node ) {
                    return $node.attr( 'data-constraint' );
                },
                getRelevant: function( $node ) {
                    return $node.attr( 'data-relevant' );
                },
                getCalculation: function( $node ) {
                    return $node.attr( 'data-calculate' );
                },
                getXmlType: function( $node ) {
                    if ( $node.length !== 1 ) {
                        return console.error( 'getXMLType(): no input node provided or multiple' );
                    }
                    return $node.attr( 'data-type-xml' );
                },
                getName: function( $node ) {
                    var name;
                    if ( $node.length !== 1 ) {
                        return console.error( 'getName(): no input node provided or multiple' );
                    }
                    name = $node.attr( 'data-name' ) || $node.attr( 'name' );
                    return name || console.error( 'input node has no name' );
                },
                /**
                 * Used to retrieve the index of a question amidst all questions with the same name.
                 * The index that can be used to find the corresponding node in the model.
                 * NOTE: this function should be used sparingly, as it is CPU intensive!
                 * TODO: simplify this function by looking for nodes with same CLASS on wrapNode
                 *
                 * @param  {jQuery} $node The jQuery-wrapped input element
                 * @return {number}       The index
                 */
                getIndex: function( $node ) {
                    var inputType, name, $wrapNode, $wrapNodesSameName;
                    if ( $node.length !== 1 ) {
                        return console.error( 'getIndex(): no input node provided or multiple' );
                    }

                    inputType = this.getInputType( $node );
                    name = this.getName( $node );
                    $wrapNode = this.getWrapNodes( $node );

                    if ( inputType === 'radio' && name !== $node.attr( 'name' ) ) {
                        $wrapNodesSameName = this.getWrapNodes( $form.find( '[data-name="' + name + '"]' ) );
                    }
                    // fieldset.or-group wraps fieldset.or-repeat and can have same name attribute!)
                    else if ( inputType === 'fieldset' && $node.hasClass( 'or-repeat' ) ) {
                        $wrapNodesSameName = this.getWrapNodes( $form.find( '.or-repeat[name="' + name + '"]' ) );
                    } else if ( inputType === 'fieldset' && $node.hasClass( 'or-group' ) ) {
                        $wrapNodesSameName = this.getWrapNodes( $form.find( '.or-group[name="' + name + '"]' ) );
                    } else {
                        $wrapNodesSameName = this.getWrapNodes( $form.find( '[name="' + name + '"]' ) );
                    }

                    return $wrapNodesSameName.index( $wrapNode );
                },
                isMultiple: function( $node ) {
                    return ( this.getInputType( $node ) === 'checkbox' || $node.attr( 'multiple' ) !== undefined ) ? true : false;
                },
                isEnabled: function( $node ) {
                    return !( $node.prop( 'disabled' ) || $node.parentsUntil( '.or', '.disabled' ).length > 0 );
                },
                isRequired: function( $node ) {
                    return ( $node.attr( 'required' ) !== undefined && $node.parentsUntil( '.or', '.or-appearance-label' ).length === 0 );
                },
                getVal: function( $node ) {
                    var inputType, values = [],
                        name;
                    if ( $node.length !== 1 ) {
                        return console.error( 'getVal(): no inputNode provided or multiple' );
                    }
                    inputType = this.getInputType( $node );
                    name = this.getName( $node );

                    if ( inputType === 'radio' ) {
                        return this.getWrapNodes( $node ).find( 'input:checked' ).val() || '';
                    }
                    // checkbox values bug in jQuery as (node.val() should work)
                    if ( inputType === 'checkbox' ) {
                        this.getWrapNodes( $node ).find( 'input[name="' + name + '"]:checked' ).each( function() {
                            values.push( $( this ).val() );
                        } );
                        return values;
                    }
                    return ( !$node.val() ) ? '' : ( $.isArray( $node.val() ) ) ? $node.val().join( ' ' ).trim() : $node.val().trim();
                },
                setVal: function( name, index, value ) {
                    var $inputNodes, type, $target;

                    index = index || 0;

                    if ( this.getInputType( $form.find( '[data-name="' + name + '"]' ).eq( 0 ) ) === 'radio' ) {
                        type = 'radio';
                        $inputNodes = this.getWrapNodes( $form.find( '[data-name="' + name + '"]' ) ).eq( index ).find( '[data-name="' + name + '"]' );
                    } else {
                        // why not use this.getIndex?
                        $inputNodes = this.getWrapNodes( $form.find( '[name="' + name + '"]' ) ).eq( index ).find( '[name="' + name + '"]' );
                        type = this.getInputType( $inputNodes.eq( 0 ) );

                        if ( type === 'file' ) {
                            $inputNodes.eq( 0 ).attr( 'data-loaded-file-name', value );
                            // console.error('Cannot set value of file input field (value: '+value+'). If trying to load '+
                            //  'this record for editing this file input field will remain unchanged.');
                            return false;
                        }

                        if ( type === 'date' || type === 'datetime' ) {
                            // convert current value (loaded from instance) to a value that a native datepicker understands
                            // TODO test for IE, FF, Safari when those browsers start including native datepickers
                            value = model.node( name, index ).convert( value, type );
                        }
                    }

                    if ( this.isMultiple( $inputNodes.eq( 0 ) ) === true ) {
                        value = value.split( ' ' );
                    } else if ( type === 'radio' ) {
                        value = [ value ];
                    }

                    // the has-value class enables hiding empty readonly inputs for prettier notes
                    if ( $inputNodes.is( '[readonly]' ) ) {
                        $inputNodes.toggleClass( 'has-value', !!value );
                    }

                    $inputNodes.val( value );

                    return;
                }
            };

            /**
             *  Uses current content of $data to set all the values in the form.
             *  Since not all data nodes with a value have a corresponding input element, it could be considered to turn this
             *  around and cycle through the HTML form elements and check for each form element whether data is available.
             */
            FormView.prototype.setAllVals = function( $group, groupIndex ) {
                var index, name, value,
                    that = this,
                    selector = ( $group && $group.attr( 'name' ) ) ? $group.attr( 'name' ) : null;

                groupIndex = ( typeof groupIndex !== 'undefined' ) ? groupIndex : null;

                model.node( selector, groupIndex ).get().find( '*' ).filter( function() {
                    var $node = $( this );
                    // only return non-empty leafnodes
                    return $node.children().length === 0 && $node.text();
                } ).each( function() {
                    var $node = $( this );

                    try {
                        value = $node.text();
                        name = $node.getXPath( 'instance' );
                        index = model.node( name ).get().index( this );
                        that.input.setVal( name, index, value );
                    } catch ( e ) {
                        console.error( e );
                        loadErrors.push( 'Could not load input field value with name: ' + name + ' and value: ' + value );
                    }
                } );
                return;
            };

            FormView.prototype.langs = {
                init: function() {
                    var lang,
                        that = this,
                        $formLanguages = $form.find( '#form-languages' ),
                        $langSelector = $( '.form-language-selector' ),
                        defaultLang = $formLanguages.attr( 'data-default-lang' ) || $formLanguages.find( 'option' ).eq( 0 ).attr( 'value' ),
                        defaultDirectionality = $formLanguages.find( '[value="' + defaultLang + '"]' ).attr( 'data-dir' ) || 'ltr';

                    $formLanguages
                        .detach()
                        .appendTo( $langSelector )
                        .val( defaultLang );

                    $form
                        .attr( 'dir', defaultDirectionality );

                    if ( $formLanguages.find( 'option' ).length < 2 ) {
                        return;
                    }

                    $langSelector.removeClass( 'hide' );

                    $formLanguages.change( function( event ) {
                        event.preventDefault();
                        lang = $( this ).val();
                        that.setAll( lang );
                    } );
                },
                setAll: function( lang ) {
                    var that = this,
                        dir = $( '#form-languages' ).find( '[value="' + lang + '"]' ).attr( 'data-dir' ) || 'ltr';

                    $form
                        .attr( 'dir', dir )
                        .find( '[lang]' )
                        .removeClass( 'active' )
                        .filter( '[lang="' + lang + '"], [lang=""]' )
                        .filter( function() {
                            var $this = $( this );
                            return !$this.hasClass( 'or-form-short' ) || ( $this.hasClass( 'or-form-short' ) && $this.siblings( '.or-form-long' ).length === 0 );
                        } )
                        .addClass( 'active' );

                    $form.find( 'select' ).each( function() {
                        that.setSelect( $( this ) );
                    } );

                    $form.trigger( 'changelanguage' );
                },
                // swap language of <select> <option>s
                setSelect: function( $select ) {
                    var value, /** @type {string} */ curLabel, /** @type {string} */ newLabel;
                    $select.children( 'option' ).not( '[value=""]' ).each( function() {
                        var $option = $( this );
                        curLabel = $option.text();
                        value = $option.attr( 'value' );
                        newLabel = $option.parent( 'select' ).siblings( '.or-option-translations' )
                            .children( '.active[data-option-value="' + value + '"]' ).text().trim();
                        newLabel = ( typeof newLabel !== 'undefined' && newLabel.length > 0 ) ? newLabel : curLabel;
                        $option.text( newLabel );
                    } );
                }
            };


            FormView.prototype.editStatus = {
                set: function( status ) {
                    // only trigger edit event once
                    if ( status && status !== $form.data( 'edited' ) ) {
                        $form.trigger( 'edited.enketo' );
                    }
                    $form.data( 'edited', status );
                },
                get: function() {
                    return !!$form.data( 'edited' );
                }
            };

            FormView.prototype.recordName = {
                set: function( name ) {
                    $form.attr( 'name', name );
                },
                get: function() {
                    return $form.attr( 'name' );
                }
            };

            /**
             * Crafts an optimized jQuery selector for element attributes that contain an expression with a target node name.
             *
             * @param  {string} attribute The attribute name to search for
             * @param  {?string} filter   The optional filter to append to each selector
             * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
             * @return {jQuery}           A jQuery collection of elements
             */
            FormView.prototype.getNodesToUpdate = function( attr, filter, updated ) {
                var $collection,
                    $repeat = null,
                    selector = [],
                    that = this;

                updated = updated || {};
                filter = filter || '';

                // The collection of non-repeat inputs is cached (unchangeable)
                if ( !this.$nonRepeats[ attr ] ) {
                    this.$nonRepeats[ attr ] = $form.find( filter + '[' + attr + ']' )
                        .parentsUntil( '.or', '.calculation, .question, .note, .trigger' ).filter( function() {
                            return $( this ).closest( '.or-repeat' ).length === 0;
                        } );
                }

                // If the updated node is inside a repeat (and there are multiple repeats present)
                if ( typeof updated.repeatPath !== 'undefined' && updated.repeatIndex >= 0 ) {
                    $repeat = $form.find( '.or-repeat[name="' + updated.repeatPath + '"]' ).eq( updated.repeatIndex );
                }

                /**
                 * If the update was triggered from a repeat, it improves performance (a lot)
                 * to exclude all those repeats that did not trigger it...
                 * However, this would break if people are referring to nodes in other
                 * repeats such as with /path/to/repeat[3]/node, /path/to/repeat[position() = 3]/node or indexed-repeat(/path/to/repeat/node /path/to/repeat, 3)
                 * so we add those (in a very inefficient way)
                 **/
                if ( $repeat ) {
                    // the non-repeat fields have to be added too, e.g. to update a calculated item with count(to/repeat/node) at the top level
                    $collection = this.$nonRepeats[ attr ]
                        .add( $repeat );
                } else {
                    $collection = $form;
                }

                // add selectors based on specific changed nodes
                if ( !updated.nodes || updated.nodes.length === 0 ) {
                    selector = selector.concat( [ filter + '[' + attr + ']' ] );
                } else {
                    updated.nodes.forEach( function( node ) {
                        selector = selector.concat( that.getQuerySelectorsForLogic( filter, attr, node ) );
                    } );
                    // add all the paths that use the /* selector at end of path
                    selector = selector.concat( that.getQuerySelectorsForLogic( filter, attr, '*' ) );
                }

                // TODO: exclude descendents of disabled elements? .find( ':not(:disabled) span.active' )
                return $collection.find( selector.join() );
            };

            FormView.prototype.getQuerySelectorsForLogic = function( filter, attr, nodeName ) {
                return [
                    // The target node name is ALWAYS at the END of a path inside the expression.
                    // #1: followed by space
                    filter + '[' + attr + '*="/' + nodeName + ' "]',
                    // #2: followed by )
                    filter + '[' + attr + '*="/' + nodeName + ')"]',
                    // #3: followed by , if used as first parameter of multiple parameters
                    filter + '[' + attr + '*="/' + nodeName + ',"]',
                    // #4: at the end of an expression
                    filter + '[' + attr + '$="/' + nodeName + '"]',
                    // #5: followed by ] (used in itemset filters)
                    filter + '[' + attr + '*="/' + nodeName + ']"]'
                ];
            };

            /**
             * Updates branches
             *
             * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
             */
            FormView.prototype.branchUpdate = function( updated ) {
                var p, $branchNode, result, insideRepeat, insideRepeatClone, cacheIndex, $nodes,
                    relevantCache = {},
                    alreadyCovered = [],
                    branchChange = false,
                    that = this,
                    clonedRepeatsPresent;

                $nodes = this.getNodesToUpdate( 'data-relevant', '', updated );

                clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

                $nodes.each( function() {
                    var $node = $( this );

                    //note that $(this).attr('name') is not the same as p.path for repeated radiobuttons!
                    if ( $.inArray( $node.attr( 'name' ), alreadyCovered ) !== -1 ) {
                        return;
                    }

                    // since this result is almost certainly not empty, closest() is the most efficient
                    $branchNode = $node.closest( '.or-branch' );

                    p = {};
                    cacheIndex = null;

                    p.relevant = that.input.getRelevant( $node );
                    p.path = that.input.getName( $node );

                    if ( $branchNode.length !== 1 ) {
                        if ( $node.parentsUntil( '.or', '#or-calculated-items' ).length === 0 ) {
                            console.error( 'could not find branch node for ', $( this ) );
                        }
                        return;
                    }
                    /*
                     * Determining ancestry is expensive. Using the knowledge most forms don't use repeats and
                     * if they usually don't have cloned repeats during initialization we perform first a check for .repeat.clone.
                     * The first condition is usually false (and is a very quick one-time check) so this presents a big performance boost
                     * (6-7 seconds of loading time on the bench6 form)
                     */
                    insideRepeat = ( clonedRepeatsPresent && $branchNode.parentsUntil( '.or', '.or-repeat' ).length > 0 ) ? true : false;
                    insideRepeatClone = ( clonedRepeatsPresent && $branchNode.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 ) ? true : false;
                    /*
                     * Determining the index is expensive, so we only do this when the branch is inside a cloned repeat.
                     * It can be safely set to 0 for other branches.
                     */
                    p.ind = ( insideRepeatClone ) ? that.input.getIndex( $node ) : 0;
                    /*
                     * Caching is only possible for expressions that do not contain relative paths to nodes.
                     * So, first do a *very* aggresive check to see if the expression contains a relative path.
                     * This check assumes that child nodes (e.g. "mychild = 'bob'") are NEVER used in a relevant
                     * expression, which may prove to be incorrect.
                     */
                    if ( p.relevant.indexOf( '..' ) === -1 ) {
                        /*
                         * For now, let's just not cache relevants inside a repeat.
                         */
                        if ( !insideRepeat ) {
                            cacheIndex = p.relevant;
                        } else {
                            // the path is stripped of the last nodeName to record the context.
                            cacheIndex = p.relevant + '__' + p.path.substring( 0, p.path.lastIndexOf( '/' ) ) + '__' + p.ind;
                        }
                    }
                    if ( cacheIndex && typeof relevantCache[ cacheIndex ] !== 'undefined' ) {
                        result = relevantCache[ cacheIndex ];
                    } else {
                        result = evaluate( p.relevant, p.path, p.ind );
                        relevantCache[ cacheIndex ] = result;
                    }

                    if ( !insideRepeat ) {
                        alreadyCovered.push( $( this ).attr( 'name' ) );
                    }

                    process( $branchNode, result );
                } );

                if ( branchChange ) {
                    this.$.trigger( 'changebranch' );
                }

                /**
                 * Evaluates a relevant expression (for future fancy stuff this is placed in a separate function)
                 *
                 * @param  {string} expr        [description]
                 * @param  {string} contextPath [description]
                 * @param  {number} index       [description]
                 * @return {boolean}             [description]
                 */
                function evaluate( expr, contextPath, index ) {
                    var result = model.evaluate( expr, 'boolean', contextPath, index );
                    return result;
                }

                /**
                 * Processes the evaluation result for a branch
                 *
                 * @param  {jQuery} $branchNode [description]
                 * @param  {boolean} result      [description]
                 */
                function process( $branchNode, result ) {
                    // for mysterious reasons '===' operator fails after Advanced Compilation even though result has value true
                    // and type boolean
                    if ( result === true ) {
                        enable( $branchNode );
                    } else {
                        disable( $branchNode );
                    }
                }

                /**
                 * Checks whether branch currently has 'relevant' state
                 *
                 * @param  {jQuery} $branchNode [description]
                 * @return {boolean}             [description]
                 */
                function selfRelevant( $branchNode ) {
                    return !$branchNode.hasClass( 'disabled' ) && !$branchNode.hasClass( 'pre-init' );
                }

                /**
                 * Enables and reveals a branch node/group
                 *
                 * @param  {jQuery} $branchNode The jQuery object to reveal and enable
                 */
                function enable( $branchNode ) {
                    var type;

                    if ( !selfRelevant( $branchNode ) ) {
                        branchChange = true;
                        $branchNode.removeClass( 'disabled pre-init' );

                        widgets.enable( $branchNode );

                        type = $branchNode.prop( 'nodeName' ).toLowerCase();

                        if ( type === 'label' ) {
                            $branchNode.children( 'input, select, textarea' ).prop( 'disabled', false );
                        } else if ( type === 'fieldset' ) {
                            $branchNode.prop( 'disabled', false );
                            /*
                             * A temporary workaround for a Chrome bug described in https://github.com/modilabs/enketo/issues/503
                             * where the file inputs end up in a weird partially enabled state.
                             * Refresh the state by disabling and enabling the file inputs again.
                             */
                            $branchNode.find( '*:not(.or-branch) input[type="file"]:not([data-relevant])' )
                                .prop( 'disabled', true )
                                .prop( 'disabled', false );
                        } else {
                            $branchNode.find( 'fieldset, input, select, textarea' ).prop( 'disabled', false );
                        }
                    }
                }

                /**
                 * Disables and hides a branch node/group
                 *
                 * @param  {jQuery} $branchNode The jQuery object to hide and disable
                 */
                function disable( $branchNode ) {
                    var type = $branchNode.prop( 'nodeName' ).toLowerCase(),
                        virgin = $branchNode.hasClass( 'pre-init' );
                    if ( virgin || selfRelevant( $branchNode ) ) {
                        branchChange = true;
                        $branchNode.addClass( 'disabled' );

                        // if the branch was previously enabled
                        if ( !virgin ) {
                            $branchNode.clearInputs( 'change' );
                            widgets.disable( $branchNode );
                            // all remaining fields marked as invalid can now be marked as valid
                            $branchNode.find( '.invalid-required, .invalid-constraint' ).find( 'input, select, textarea' ).each( function() {
                                that.setValid( $( this ) );
                            } );
                        } else {
                            $branchNode.removeClass( 'pre-init' );
                        }

                        if ( type === 'label' ) {
                            $branchNode.children( 'input, select, textarea' ).prop( 'disabled', true );
                        } else if ( type === 'fieldset' ) {
                            $branchNode.prop( 'disabled', true );
                        } else {
                            $branchNode.find( 'fieldset, input, select, textarea' ).prop( 'disabled', true );
                        }
                    }
                }
            };


            /**
             * Updates itemsets
             *
             * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
             */
            FormView.prototype.itemsetUpdate = function( updated ) {
                var clonedRepeatsPresent, insideRepeat, insideRepeatClone, $nodes,
                    that = this,
                    itemsCache = {};

                $nodes = this.getNodesToUpdate( 'data-items-path', '.itemset-template', updated );

                clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 ) ? true : false;

                $nodes.each( function() {
                    var $htmlItem, $htmlItemLabels, /**@type {string}*/ value, $instanceItems, index, context, labelRefValue,
                        $template, newItems, prevItems, templateNodeName, $input, $labels, itemsXpath, labelType, labelRef, valueRef;

                    $template = $( this );

                    // nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
                    if ( $template.parentsUntil( '.or', '.or-branch' ).parentsUntil( '.or', '.disabled' ).length ) {
                        return;
                    }

                    newItems = {};
                    prevItems = $template.data();
                    templateNodeName = $template.prop( 'nodeName' ).toLowerCase();
                    $input = ( templateNodeName === 'label' ) ? $template.children( 'input' ).eq( 0 ) : $template.parent( 'select' );
                    $labels = $template.closest( 'label, select' ).siblings( '.itemset-labels' );
                    itemsXpath = $template.attr( 'data-items-path' );
                    labelType = $labels.attr( 'data-label-type' );
                    labelRef = $labels.attr( 'data-label-ref' );
                    valueRef = $labels.attr( 'data-value-ref' );

                    /**
                     * CommCare/ODK change the context to the *itemset* value (in the secondary instance), hence they need to use the current()
                     * function to make sure that relative paths in the nodeset predicate refer to the correct primary instance node
                     * Enketo does *not* change the context. It uses the context of the question, not the itemset. Hence it has no need for current().
                     * I am not sure what is correct, but for now for XLSForm-style secondary instances with only one level underneath the <item>s that
                     * the nodeset retrieves, Enketo's aproach works well.
                     */
                    context = that.input.getName( $input );

                    /*
                     * Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat.
                     * It can be safely set to 0 for other branches.
                     */
                    insideRepeat = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat' ).length > 0 ) ? true : false;
                    insideRepeatClone = ( clonedRepeatsPresent && $input.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 ) ? true : false;

                    index = ( insideRepeatClone ) ? that.input.getIndex( $input ) : 0;

                    if ( typeof itemsCache[ itemsXpath ] !== 'undefined' ) {
                        $instanceItems = itemsCache[ itemsXpath ];
                    } else {
                        var safeToTryNative = true;
                        $instanceItems = $( model.evaluate( itemsXpath, 'nodes', context, index, safeToTryNative ) );
                        if ( !insideRepeat ) {
                            itemsCache[ itemsXpath ] = $instanceItems;
                        }
                    }

                    // this property allows for more efficient 'itemschanged' detection
                    newItems.length = $instanceItems.length;
                    //this may cause problems for large itemsets. Use md5 instead?
                    newItems.text = $instanceItems.text();

                    if ( newItems.length === prevItems.length && newItems.text === prevItems.text ) {
                        return;
                    }

                    $template.data( newItems );

                    // clear data values through inputs. Note: if a value exists,
                    // this will trigger a dataupdate event which may call this update function again
                    $template.closest( '.question' )
                        .clearInputs( 'change' )
                        .find( templateNodeName ).not( $template ).remove();
                    $template.parent( 'select' ).siblings( '.or-option-translations' ).empty();

                    $instanceItems.each( function() {
                        var $item = $( this );
                        labelRefValue = $item.children( labelRef ).text();
                        $htmlItem = $( '<root/>' );
                        $template
                            .clone().appendTo( $htmlItem )
                            .removeClass( 'itemset-template' )
                            .addClass( 'itemset' )
                            .removeAttr( 'data-items-path' );

                        $htmlItemLabels = ( labelType === 'itext' && $labels.find( '[data-itext-id="' + labelRefValue + '"]' ).length > 0 ) ?
                            $labels.find( '[data-itext-id="' + labelRefValue + '"]' ).clone() :
                            $( '<span class="option-label active" lang="">' + labelRefValue + '</span>' );

                        value = $item.children( valueRef ).text();
                        $htmlItem.find( '[value]' ).attr( 'value', value );

                        if ( templateNodeName === 'label' ) {
                            $htmlItem.find( 'input' )
                                .after( $htmlItemLabels );
                            $labels.before( $htmlItem.find( ':first' ) );
                        } else if ( templateNodeName === 'option' ) {
                            if ( $htmlItemLabels.length === 1 ) {
                                $htmlItem.find( 'option' ).text( $htmlItemLabels.text() );
                            }
                            $htmlItemLabels
                                .attr( 'data-option-value', value )
                                .attr( 'data-itext-id', '' )
                                .appendTo( $labels.siblings( '.or-option-translations' ) );
                            $template.siblings().addBack().last().after( $htmlItem.find( ':first' ) );
                        }
                    } );

                    if ( $input.prop( 'nodeName' ).toLowerCase() === 'select' ) {
                        //populate labels (with current language)
                        that.langs.setSelect( $input );
                        //update widget
                        $input.trigger( 'changeoption' );
                    }

                } );
            };

            /**
             * Updates output values, optionally filtered by those values that contain a changed node name
             *
             * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
             */
            FormView.prototype.outputUpdate = function( updated ) {
                var expr, clonedRepeatsPresent, insideRepeat, insideRepeatClone, $context, $output, context, index, $nodes,
                    outputCache = {},
                    val = '',
                    that = this;

                $nodes = this.getNodesToUpdate( 'data-value', '.or-output', updated );

                clonedRepeatsPresent = ( repeatsPresent && $form.find( '.or-repeat.clone' ).length > 0 );

                $nodes.each( function() {
                    $output = $( this );

                    // nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
                    if ( $output.closest( '.or-branch' ).parent().closest( '.disabled' ).length ) {
                        return;
                    }

                    expr = $output.attr( 'data-value' );
                    /*
                     * Note that in XForms input is the parent of label and in HTML the other way around so an output inside a label
                     * should look at the HTML input to determine the context.
                     * So, context is either the input name attribute (if output is inside input label),
                     * or the parent with a name attribute
                     * or the whole document
                     */
                    $context = $output.closest( '.question, .note, .or-group' ).find( '[name]' ).eq( 0 );
                    context = ( $context.length ) ? that.input.getName( $context ) : undefined;

                    insideRepeat = ( clonedRepeatsPresent && $output.parentsUntil( '.or', '.or-repeat' ).length > 0 );
                    insideRepeatClone = ( insideRepeat && $output.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 );
                    index = ( insideRepeatClone ) ? that.input.getIndex( $context ) : 0;

                    if ( typeof outputCache[ expr ] !== 'undefined' ) {
                        val = outputCache[ expr ];
                    } else {
                        val = model.evaluate( expr, 'string', context, index, true );
                        if ( !insideRepeat ) {
                            outputCache[ expr ] = val;
                        }
                    }
                    if ( $output.text !== val ) {
                        $output.text( val );
                    }
                } );
            };

            /**
             * See https://groups.google.com/forum/?fromgroups=#!topic/opendatakit-developers/oBn7eQNQGTg
             * and http://code.google.com/p/opendatakit/issues/detail?id=706
             *
             * Once the following is complete this function can and should be removed:
             *
             * 1. ODK Collect starts supporting an instanceID preload item (or automatic handling of meta->instanceID without binding)
             * 2. Pyxforms changes the instanceID binding from calculate to preload (or without binding)
             * 3. Formhub has re-generated all stored XML forms from the stored XLS forms with the updated pyxforms
             *
             */
            FormView.prototype.grosslyViolateStandardComplianceByIgnoringCertainCalcs = function() {
                var $culprit = $form.find( '[name$="/meta/instanceID"][data-calculate]' );
                if ( $culprit.length > 0 ) {
                    $culprit.removeAttr( 'data-calculate' );
                }
            };

            /**
             * Updates calculated items
             *
             * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated The object containing info on updated data nodes
             * @param { jQuery=}         $repeat        The repeat that triggered the update
             * @param {Array<string>=}  updatedNodes    Array of updated nodes
             */
            FormView.prototype.calcUpdate = function( updated ) {
                var $nodes,
                    that = this;

                updated = updated || {};

                $nodes = this.getNodesToUpdate( 'data-calculate', '', updated );

                // add relevant items that have a (any) calculation
                $nodes = $nodes.add( this.getNodesToUpdate( 'data-relevant', '[data-calculate]', updated ) );

                $nodes.each( function() {
                    var result, valid, dataNodesObj, dataNodes, $dataNode, index, name, dataNodeName, expr, dataType, constraint, relevantExpr, relevant, $this;

                    $this = $( this );
                    name = that.input.getName( $this );
                    dataNodeName = ( name.lastIndexOf( '/' ) !== -1 ) ? name.substring( name.lastIndexOf( '/' ) + 1 ) : name;
                    expr = that.input.getCalculation( $this );
                    dataType = that.input.getXmlType( $this );
                    // for inputs that have a calculation and need to be validated
                    constraint = that.input.getConstraint( $this );
                    relevantExpr = that.input.getRelevant( $this );
                    relevant = ( relevantExpr ) ? model.evaluate( relevantExpr, 'boolean', name ) : true;

                    dataNodesObj = model.node( name );
                    dataNodes = dataNodesObj.get();

                    /*
                     * If the update was triggered by a datanode inside a repeat
                     * and the dependent node is inside the same repeat
                     */
                    if ( dataNodes.length > 1 && updated.repeatPath && name.indexOf( updated.repeatPath ) !== -1 ) {
                        $dataNode = model.node( updated.repeatPath, updated.repeatIndex ).get().find( dataNodeName );
                        index = $( dataNodes ).index( $dataNode );
                        updateCalc( index );
                    } else if ( dataNodes.length === 1 ) {
                        index = 0;
                        updateCalc( index );
                    } else {
                        // This occurs when update is called with empty updated object and multiple repeats are present
                        dataNodes.each( function( index ) {
                            updateCalc( index );
                        } );
                    }

                    function updateCalc( index ) {

                        //not sure if using 'string' is always correct
                        expr = fixExpr( expr, 'string', name, index );

                        // it is possible that the fixed expr is '' which causes an error in XPath
                        result = ( relevant && expr ) ? model.evaluate( expr, 'string', name, index ) : '';

                        // filter the result set to only include the target node
                        dataNodesObj.setIndex( index );

                        // set the value
                        valid = dataNodesObj.setVal( result, constraint, dataType );

                        // not the most efficient to use input.setVal here as it will do another lookup
                        // of the node, that we already have...
                        that.input.setVal( name, index, result );
                    }
                } );
            };

            /*
             * Note that preloaders may be deprecated in the future and be handled as metadata without bindings at all, in which
             * case all this stuff should perhaps move to FormModel
             *
             * functions are designed to fail silently if unknown preloaders are called
             */
            FormView.prototype.preloads = {
                init: function( parentO ) {
                    var item, param, name, curVal, newVal, meta, dataNode, props, xmlType, $preload,
                        that = this;
                    //these initialize actual preload items
                    $form.find( '#or-preload-items input' ).each( function() {
                        $preload = $( this );
                        props = parentO.input.getProps( $preload );
                        item = $preload.attr( 'data-preload' ).toLowerCase();
                        param = $preload.attr( 'data-preload-params' ).toLowerCase();

                        if ( typeof that[ item ] !== 'undefined' ) {
                            dataNode = model.node( props.path, props.index );
                            curVal = dataNode.getVal()[ 0 ];
                            newVal = that[ item ]( {
                                param: param,
                                curVal: curVal,
                                dataNode: dataNode
                            } );
                            dataNode.setVal( newVal, null, props.xmlType );
                        } else {
                            console.log( 'Preload "' + item + '" not supported. May or may not be a big deal.' );
                        }
                    } );
                    // In addition the presence of certain meta data in the instance may automatically trigger a preload function
                    // even if the binding is not present. Note, that this actually does not deal with HTML elements at all.
                    meta = model.node( '/*/meta/*' );
                    meta.get().each( function() {
                        item = null;
                        name = $( this ).prop( 'nodeName' );
                        dataNode = model.node( '/*/meta/' + name );
                        curVal = dataNode.getVal()[ 0 ];
                        //first check if there isn't a binding with a preloader that already took care of this
                        if ( $form.find( '#or-preload-items input[name$="/meta/' + name + '"][data-preload]' ).length === 0 ) {
                            switch ( name ) {
                                case 'instanceID':
                                    item = 'instance';
                                    xmlType = 'string';
                                    param = '';
                                    break;
                                case 'timeStart':
                                    item = 'timestamp';
                                    xmlType = 'datetime';
                                    param = 'start';
                                    break;
                                case 'timeEnd':
                                    item = 'timestamp';
                                    xmlType = 'datetime';
                                    param = 'end';
                                    break;
                                case 'deviceID':
                                    item = 'property';
                                    xmlType = 'string';
                                    param = 'deviceid';
                                    break;
                                case 'userID':
                                    item = 'property';
                                    xmlType = 'string';
                                    param = 'username';
                                    break;
                            }
                        }
                        if ( item ) {
                            dataNode.setVal( that[ item ]( {
                                param: param,
                                curVal: curVal,
                                dataNode: dataNode
                            } ), null, xmlType );
                        }
                    } );
                },
                'timestamp': function( o ) {
                    var value;
                    // when is 'start' or 'end'
                    if ( o.param === 'start' ) {
                        return ( o.curVal.length > 0 ) ? o.curVal : model.evaluate( 'now()', 'string' );
                    }
                    if ( o.param === 'end' ) {
                        //set event handler for each save event (needs to be triggered!)
                        $form.on( 'beforesave', function() {
                            value = model.evaluate( 'now()', 'string' );
                            o.dataNode.setVal( value, null, 'datetime' );
                        } );
                        return model.evaluate( 'now()', 'string' );
                    }
                    return 'error - unknown timestamp parameter';
                },
                'date': function( o ) {
                    var today, year, month, day;

                    if ( o.curVal.length === 0 ) {
                        today = new Date( model.evaluate( 'today()', 'string' ) );
                        year = today.getFullYear().toString().pad( 4 );
                        month = ( today.getMonth() + 1 ).toString().pad( 2 );
                        day = today.getDate().toString().pad( 2 );

                        return year + '-' + month + '-' + day;
                    }
                    return o.curVal;
                },
                'property': function( o ) {
                    var readCookie, noSupportMsg, response;

                    readCookie = function( name, c, C, i ) {
                        if ( cookies ) {
                            return cookies[ name ];
                        }

                        c = document.cookie.split( '; ' );
                        cookies = {};

                        for ( i = c.length - 1; i >= 0; i-- ) {
                            C = c[ i ].split( '=' );
                            // decode URI
                            C[ 1 ] = decodeURIComponent( C[ 1 ] );
                            // if cookie is signed (using expressjs/cookie-parser/), extract value
                            if ( C[ 1 ].substr( 0, 2 ) === 's:' ) {
                                C[ 1 ] = C[ 1 ].slice( 2 );
                                C[ 1 ] = C[ 1 ].slice( 0, C[ 1 ].lastIndexOf( '.' ) );
                            }
                            cookies[ C[ 0 ] ] = decodeURIComponent( C[ 1 ] );
                        }

                        return cookies[ name ];
                    };

                    // 'deviceid', 'subscriberid', 'simserial', 'phonenumber'
                    if ( o.curVal.length === 0 ) {
                        noSupportMsg = 'no ' + o.param + ' property in enketo';
                        switch ( o.param ) {
                            case 'deviceid':
                                response = readCookie( '__enketo_meta_deviceid' ) || 'Error: could not determine deviceID';
                                break;
                            case 'username':
                                response = readCookie( '__enketo_meta_uid' );
                                break;
                            default:
                                response = noSupportMsg;
                                break;
                        }
                        return response;
                    }
                    return o.curVal;
                },
                'context': function( o ) {
                    // 'application', 'user'??
                    if ( o.curVal.length === 0 ) {
                        return ( o.param === 'application' ) ? 'enketo' : o.param + ' not supported in enketo';
                    }
                    return o.curVal;
                },
                'patient': function( o ) {
                    if ( o.curVal.length === 0 ) {
                        return 'patient preload not supported in enketo';
                    }
                    return o.curVal;
                },
                'user': function( o ) {
                    if ( o.curVal.length === 0 ) {
                        return 'user preload item not supported in enketo yet';
                    }
                    return o.curVal;
                },
                'uid': function( o ) {
                    //general
                    if ( o.curVal.length === 0 ) {
                        return 'no uid yet in enketo';
                    }
                    return o.curVal;
                },
                //Not according to spec yet, this will be added to spec but name may change
                'instance': function( o ) {
                    var id = ( o.curVal.length > 0 ) ? o.curVal : model.evaluate( 'concat("uuid:", uuid())', 'string' );
                    //store the current instanceID as data on the form element so it can be easily accessed by e.g. widgets
                    $form.data( {
                        instanceID: id
                    } );
                    return id;
                }
            };

            /**
             * Variable: repeat
             *
             * This can perhaps be simplified and improved by:
             * - adding a function repeat.update() that looks at the instance whether to add repeat form fields
             * - calling update from init() (model.init() is called before form.init() so the initial repeats have been added already)
             * - when button is clicked model.node().clone() or model.node().remove() is called first and then repeat.update()
             * - watch out though when repeats in the middle are removed... or just disable that possibility
             *
             */
            FormView.prototype.repeat = {
                /**
                 * Initializes all Repeat Groups in form (only called once).
                 * @param  {FormView} formO the parent form object
                 */
                init: function( formO ) {
                    var numRepsInCount, repCountPath, numRepsInInstance, numRepsDefault, cloneDefaultReps, $dataRepeat, index,
                        that = this;

                    this.formO = formO;
                    $form.find( '.or-repeat' ).prepend( '<span class="repeat-number"></span>' );
                    $form.find( '.or-repeat:not([data-repeat-fixed])' )
                        .append( '<div class="repeat-buttons"><button type="button" class="btn btn-default repeat"><i class="icon icon-plus"> </i></button>' +
                            '<button type="button" disabled class="btn btn-default remove"><i class="icon icon-minus"> </i></button></div>' );

                    //delegated handlers (strictly speaking not required, but checked for doubling of events -> OK)
                    $form.on( 'click', 'button.repeat:enabled', function() {
                        // Create a clone
                        that.clone( $( this ).closest( '.or-repeat' ) );
                        // Prevent default
                        return false;
                    } );
                    $form.on( 'click', 'button.remove:enabled', function() {
                        //remove clone
                        that.remove( $( this ).closest( '.or-repeat.clone' ) );
                        //prevent default
                        return false;
                    } );

                    cloneDefaultReps = function( $repeat, repLevel ) {
                        repCountPath = $repeat.attr( 'data-repeat-count' ) || '';
                        numRepsInCount = ( repCountPath.length > 0 ) ? parseInt( model.node( repCountPath ).getVal()[ 0 ], 10 ) : 0;
                        index = $form.find( '.or-repeat[name="' + $repeat.attr( 'name' ) + '"]' ).index( $repeat );
                        $dataRepeat = model.node( $repeat.attr( 'name' ), index ).get();
                        numRepsInInstance = $dataRepeat.siblings( $dataRepeat.prop( 'nodeName' ) ).addBack().length;
                        numRepsDefault = ( numRepsInCount > numRepsInInstance ) ? numRepsInCount : numRepsInInstance;
                        // First rep is already included (by XSLT transformation)
                        if ( numRepsDefault > 1 ) {
                            that.clone( $repeat.siblings().addBack().last(), numRepsDefault - 1, true );
                        }
                        // Now check the defaults of all the descendants of this repeat and its new siblings, level-by-level.
                        $repeat.siblings( '.or-repeat' ).addBack().find( '.or-repeat' )
                            .filter( function() {
                                return $( this ).parentsUntil( '.or', '.or-repeat' ).length === repLevel;
                            } ).each( function() {
                                cloneDefaultReps( $( this ), repLevel + 1 );
                            } );
                    };

                    // Clone form fields to create the default number
                    // Note: this assumes that the repeat count is static not dynamic/
                    $form.find( '.or-repeat' ).filter( function() {
                        return $( this ).parentsUntil( '.or', '.or-repeat' ).length === 0;
                    } ).each( function() {
                        cloneDefaultReps( $( this ), 1 );
                    } );
                },
                /**
                 * clone a repeat group/node
                 * @param   {jQuery} $node node to clone
                 * @param   {number=} count number of clones to create
                 * @param   {boolean=} initialFormLoad Whether this cloning is part of the initial form load
                 * @return  {boolean}       [description]
                 */
                clone: function( $node, count, initialFormLoad ) {
                    var $siblings, $master, $clone, $repeatsToUpdate, $radiocheckbox, index, total, path,
                        that = this;

                    count = count || 1;

                    if ( $node.length !== 1 ) {
                        console.error( 'Nothing to clone' );
                        return false;
                    }

                    $siblings = $node.siblings( '.or-repeat' );
                    $master = ( $node.hasClass( 'clone' ) ) ? $siblings.not( '.clone' ).eq( 0 ) : $node;
                    $clone = $master.clone( true, true );
                    path = $master.attr( 'name' );

                    // Add clone class and remove any child clones.. (cloned repeats within repeats..)
                    $clone.addClass( 'clone' ).find( '.clone' ).remove();

                    // Mark all cloned fields as valid
                    $clone.find( '.invalid-required, .invalid-constraint' ).find( 'input, select, textarea' ).each( function() {
                        that.formO.setValid( $( this ) );
                    } );

                    // Note: in http://formhub.org/formhub_u/forms/hh_polio_survey_cloned/form.xml a parent group of a repeat
                    // has the same ref attribute as the nodeset attribute of the repeat. This would cause a problem determining
                    // the proper index if .or-repeat was not included in the selector
                    index = $form.find( '.or-repeat[name="' + path + '"]' ).index( $node );

                    // clear the inputs before adding clone
                    $clone.clearInputs( '' );

                    total = count + index;

                    // Add required number of repeats
                    for ( ; index < total; index++ ) {

                        // Fix names of radio button groups
                        $clone.find( '.option-wrapper' ).each( this.fixRadioNames );

                        // Destroy widgets before inserting the clone
                        if ( !initialFormLoad ) {
                            widgets.destroy( $clone );
                        }

                        // Insert the clone after values and widgets have been reset
                        $clone.insertAfter( $node );

                        // Create a new data point in <instance> by cloning the template node
                        // and clone data node if it doesn't already exist
                        if ( path.length > 0 && index >= 0 ) {
                            model.cloneRepeat( path, index );
                        }

                        // This will trigger setting default values and other stuff
                        $clone.trigger( 'addrepeat', index + 1 );

                        // Remove data-checked attributes for non-checked radio buttons and checkboxes
                        // Add data-checked attributes for checked ones.
                        // This actually belongs in the radio widget
                        $radiocheckbox = $clone.find( '[type="radio"],[type="checkbox"]' );
                        $radiocheckbox.parent( 'label' ).removeAttr( 'data-checked' );
                        $radiocheckbox.filter( ':checked' ).parent( 'label' ).attr( 'data-checked', 'true' );

                        // Re-initiate widgets in clone after default values have been set
                        if ( !initialFormLoad ) {
                            widgets.init( $clone );
                        } else {
                            // Upon inital formload the eventhandlers for calculated items have not yet been set.
                            // Calculations have already been initialized before the repeat clone(s) were created.
                            // Therefore, we manually trigger a calculation update for the cloned repeat.
                            that.formO.calcUpdate( {
                                repeatPath: path,
                                repeatIndex: index + 1
                            } );
                        }

                        $siblings = $siblings.add( $clone );
                        $clone = $clone.clone();
                    }

                    $repeatsToUpdate = $siblings.add( $node ).add( $siblings.find( '.or-repeat' ) );

                    // number the repeats
                    this.numberRepeats( $repeatsToUpdate );
                    // enable or disable + and - buttons
                    this.toggleButtons( $repeatsToUpdate );

                    return true;
                },
                remove: function( $repeat ) {
                    var delay = 600,
                        that = this,
                        $prev = $repeat.prev( '.or-repeat' ),
                        repeatPath = $repeat.attr( 'name' ),
                        repeatIndex = $form.find( '.or-repeat[name="' + repeatPath + '"]' ).index( $repeat ),
                        $siblings = $repeat.siblings( '.or-repeat' );

                    $repeat.hide( delay, function() {
                        $repeat.remove();
                        that.numberRepeats( $siblings );
                        that.toggleButtons( $siblings );
                        // trigger the removerepeat on the previous repeat (always present)
                        // so that removerepeat handlers know where the repeat was removed
                        $prev.trigger( 'removerepeat' );
                        // now remove the data node
                        model.node( repeatPath, repeatIndex ).remove();
                    } );
                },
                fixRadioNames: function( index, element ) {
                    $( element ).find( 'input[type="radio"]' )
                        .attr( 'name', Math.floor( ( Math.random() * 10000000 ) + 1 ) );
                },
                toggleButtons: function( $repeats ) {
                    var $repeat, $repSiblingsAndSelf;

                    $repeats = ( !$repeats || $repeats.length === 0 ) ? $form : $repeats;

                    $repeats.each( function() {
                        $repeat = $( this );
                        $repSiblingsAndSelf = $repeat.siblings( '.or-repeat' ).addBack();
                        //first switch everything off and remove hover state
                        $repSiblingsAndSelf.children( '.repeat-buttons' ).find( 'button.repeat, button.remove' ).prop( 'disabled', true );

                        //then enable the appropriate ones
                        $repSiblingsAndSelf.last().children( '.repeat-buttons' ).find( 'button.repeat' ).prop( 'disabled', false );
                        $repSiblingsAndSelf.children( '.repeat-buttons' ).find( 'button.remove' ).not( ':first' ).prop( 'disabled', false );
                    } );
                },
                numberRepeats: function( $repeats ) {
                    $repeats.each( function() {
                        var $repSiblings, qtyRepeats, i,
                            $repeat = $( this );
                        // if it is the first-of-type (not that ':first-of-type' does not have cross-browser support)
                        if ( $repeat.prev( '.or-repeat' ).length === 0 ) {
                            $repSiblings = $( this ).siblings( '.or-repeat' );
                            qtyRepeats = $repSiblings.length + 1;
                            if ( qtyRepeats > 1 ) {
                                $repeat.find( '.repeat-number' ).text( '1' );
                                i = 2;
                                $repSiblings.each( function() {
                                    $( this ).find( '.repeat-number' ).eq( 0 ).text( i );
                                    i++;
                                } );
                            } else {
                                $repeat.find( '.repeat-number' ).eq( 0 ).empty();
                            }
                        }
                    } );
                }
            };

            FormView.prototype.setEventHandlers = function() {
                var that = this;

                //first prevent default submission, e.g. when text field is filled in and Enter key is pressed
                $form.attr( 'onsubmit', 'return false;' );

                /*
                 * workaround for Chrome to clear invalid values right away
                 * issue: https://code.google.com/p/chromium/issues/detail?can=2&start=0&num=100&q=&colspec=ID%20Pri%20M%20Iteration%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&groupby=&sort=&id=178437)
                 * a workaround was chosen instead of replacing the change event listener to a blur event listener
                 * because I'm guessing that Google will bring back the old behaviour.
                 */
                $form.on( 'blur', 'input:not([type="text"], [type="radio"], [type="checkbox"])', function() {
                    var $input = $( this );
                    if ( typeof $input.prop( 'validity' ).badInput !== 'undefined' && $input.prop( 'validity' ).badInput ) {
                        $input.val( '' );
                    }
                } );

                // Why is the file namespace added?
                $form.on( 'change.file validate', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                    var validCons, validReq, _dataNodeObj,
                        $input = $( this ),
                        // all relevant properties, except for the **very expensive** index property
                        n = {
                            path: that.input.getName( $input ),
                            inputType: that.input.getInputType( $input ),
                            xmlType: that.input.getXmlType( $input ),
                            enabled: that.input.isEnabled( $input ),
                            constraint: that.input.getConstraint( $input ),
                            val: that.input.getVal( $input ),
                            required: that.input.isRequired( $input )
                        },
                        getDataNodeObj = function() {
                            if ( !_dataNodeObj ) {
                                // Only now, will we determine the index.
                                n.ind = that.input.getIndex( $input );
                                _dataNodeObj = model.node( n.path, n.ind );
                            }
                            return _dataNodeObj;
                        };


                    // set file input values to the actual name of file (without c://fakepath or anything like that)
                    if ( n.val.length > 0 && n.inputType === 'file' && $input[ 0 ].files[ 0 ] && $input[ 0 ].files[ 0 ].size > 0 ) {
                        n.val = $input[ 0 ].files[ 0 ].name;
                    }

                    if ( event.type === 'validate' ) {
                        // The enabled check serves a purpose only when an input field itself is marked as enabled but its parent fieldset is not.
                        // If an element is disabled mark it as valid (to undo a previously shown branch with fields marked as invalid).
                        if ( !n.enabled || n.inputType === 'hidden' ) {
                            validCons = true;
                        } else
                        // Use a dirty trick to not have to determine the index with the following insider knowledge.
                        // It could potentially be sped up more by excluding n.val === "", but this would not be safe, in case the view is not in sync with the model.
                        if ( !n.constraint && ( n.xmlType === 'string' || n.xmlType === 'select' || n.xmlType === 'select1' || n.xmlType === 'binary' ) ) {
                            validCons = true;
                        } else {
                            validCons = getDataNodeObj().validate( n.constraint, n.xmlType );
                        }
                    } else {
                        validCons = getDataNodeObj().setVal( n.val, n.constraint, n.xmlType );
                        // geotrace and geoshape are very complex data types that require various change events
                        // to avoid annoying users, we ignore the INVALID onchange validation result
                        validCons = ( validCons === false && ( n.xmlType === 'geotrace' || n.xmlType === 'geoshape' ) ) ? null : validCons;
                    }

                    // validate 'required', checking value in Model (not View)
                    validReq = !( n.enabled && n.inputType !== 'hidden' && n.required && getDataNodeObj().getVal()[ 0 ].length === 0 );

                    if ( validReq === false ) {
                        that.setValid( $input, 'constraint' );
                        if ( event.type === 'validate' ) {
                            that.setInvalid( $input, 'required' );
                        }
                    } else {
                        that.setValid( $input, 'required' );
                        if ( typeof validCons !== 'undefined' && validCons === false ) {
                            that.setInvalid( $input, 'constraint' );
                        } else if ( validCons !== null ) {
                            that.setValid( $input, 'constraint' );
                        }
                    }

                    // propagate event externally after internal processing is completed
                    if ( event.type === 'change' ) {
                        $form.trigger( 'valuechange.enketo' );
                    }
                } );

                // doing this on the focus event may have little effect on performance, because nothing else is happening :)
                $form.on( 'focus fakefocus', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                    // update the form progress status
                    that.progress.update( event.target );
                } );

                //using fakefocus because hidden (by widget) elements won't get focus
                $form.on( 'focus blur fakefocus fakeblur', 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)', function( event ) {
                    var $input = $( this ),
                        props = that.input.getProps( $input ),
                        $question = $input.closest( '.question' ),
                        $legend = $question.find( 'legend' ).eq( 0 ),
                        loudErrorShown = $question.hasClass( 'invalid-required' ) || $question.hasClass( 'invalid-constraint' ),
                        insideTable = ( $input.parentsUntil( '.or', '.or-appearance-list-nolabel' ).length > 0 ),
                        $reqSubtle = $question.find( '.required-subtle' ),
                        reqSubtle = $( '<span class="required-subtle" style="color: transparent;">Required</span>' );

                    if ( event.type === 'focusin' || event.type === 'fakefocus' ) {
                        $question.addClass( 'focus' );
                        if ( props.required && $reqSubtle.length === 0 && !insideTable ) {
                            $reqSubtle = $( reqSubtle );

                            if ( $legend.length > 0 ) {
                                $legend.append( $reqSubtle );
                            } else {
                                $reqSubtle.insertBefore( this );
                            }

                            if ( !loudErrorShown ) {
                                $reqSubtle.show( function() {
                                    $( this ).removeAttr( 'style' );
                                } );
                            }
                        } else if ( !loudErrorShown ) {
                            //$question.addClass( 'focus' );
                        }
                    } else if ( event.type === 'focusout' || event.type === 'fakeblur' ) {
                        $question.removeClass( 'focus' );
                        if ( props.required && props.val.length > 0 ) {
                            $reqSubtle.remove();
                        } else if ( !loudErrorShown ) {
                            $reqSubtle.removeAttr( 'style' );
                        }
                    }
                } );

                model.$.on( 'dataupdate', function( event, updated ) {
                    that.calcUpdate( updated ); //EACH CALCUPDATE THAT CHANGES A VALUE TRIGGERS ANOTHER CALCUPDATE => INEFFICIENT
                    that.branchUpdate( updated );
                    that.outputUpdate( updated );
                    that.itemsetUpdate( updated );
                    // edit is fired when the model changes after the form has been initialized
                    that.editStatus.set( true );
                } );

                $form.on( 'addrepeat', function( event, index ) {
                    var $clone = $( event.target );
                    // Set defaults of added repeats in FormView, setAllVals does not trigger change event
                    that.setAllVals( $clone, index );
                    // for a NEW repeat ALL calculations inside that repeat have to be initialized
                    that.calcUpdate( {
                        repeatPath: $clone.attr( 'name' ),
                        repeatIndex: index
                    } );
                    that.progress.update();
                } );

                $form.on( 'removerepeat', function() {
                    that.progress.update();
                } );

                $form.on( 'changelanguage', function() {
                    that.outputUpdate();
                } );
            };

            FormView.prototype.setValid = function( $node, type ) {
                var classes = ( type ) ? 'invalid-' + type : 'invalid-constraint invalid-required';
                this.input.getWrapNodes( $node ).removeClass( classes );
            };

            FormView.prototype.setInvalid = function( $node, type ) {
                type = type || 'constraint';
                this.input.getWrapNodes( $node ).addClass( 'invalid-' + type ).find( '.required-subtle' ).attr( 'style', 'color: transparent;' );
            };

            /**
             * Validates all enabled input fields after first resetting everything as valid.
             * @return {boolean} whether the form contains any errors
             */
            FormView.prototype.validateAll = function() {
                var $firstError,
                    that = this;

                //can't fire custom events on disabled elements therefore we set them all as valid
                $form.find( 'fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea, ' +
                    'input:disabled, select:disabled, textarea:disabled' ).each( function() {
                    that.setValid( $( this ) );
                } );

                $form.find( '.question' ).each( function() {
                    // only trigger validate on first input and use a **pure CSS** selector (huge performance impact)
                    $( this )
                        .find( 'input:not(.ignore):not(:disabled), select:not(.ignore):not(:disabled), textarea:not(.ignore):not(:disabled)' )
                        .eq( 0 )
                        .trigger( 'validate' );
                } );

                $firstError = $form.find( '.invalid-required, .invalid-constraint' ).eq( 0 );

                if ( $firstError.length > 0 && window.scrollTo ) {
                    if ( this.pages.active ) {
                        // move to the first page with an error
                        this.pages.flipToPageContaining( $firstError );
                    }
                    window.scrollTo( 0, $firstError.offset().top - 50 );
                }
                return $firstError.length === 0;
            };

            /**
             * Maintains progress state of user traversing through form, using
             * currently focused input || last changed input as current location.
             */
            FormView.prototype.progress = {
                status: 0,
                lastChanged: null,
                $all: null,
                updateTotal: function() {
                    this.$all = $form.find( '.question' ).not( '.disabled' ).filter( function() {
                        return $( this ).parentsUntil( '.or', '.disabled' ).length === 0;
                    } );
                },
                // updates rounded % value of progress and triggers event if changed
                update: function( el ) {
                    var status;

                    if ( !this.$all || !el ) {
                        this.updateTotal();
                    }

                    this.lastChanged = el || this.lastChanged;
                    status = Math.round( ( ( this.$all.index( $( this.lastChanged ).closest( '.question' ) ) + 1 ) * 100 ) / this.$all.length );

                    // if the current el was removed (inside removed repeat), the status will be 0 - leave unchanged
                    if ( status > 0 && status !== this.status ) {
                        this.status = status;
                        $form.trigger( 'progressupdate.enketo', status );
                    }
                },
                get: function() {
                    return this.status;
                }
            };

            /**
             * Returns true is form is valid and false if not. Needs to be called AFTER (or by) validateAll()
             * @return {!boolean} whether the form is valid
             */
            FormView.prototype.isValid = function() {
                return ( $form.find( '.invalid-required, .invalid-constraint' ).length > 0 ) ? false : true;
            };

            /**
             * Adds <hr class="page-break"> to prevent cutting off questions with page-breaks
             */
            FormView.prototype.addPageBreaks = function() {

            };
        }

        module.exports = Form;
    } );

},{"./FormModel":12,"./extend":14,"./plugins":15,"./widgets":18,"jquery":2,"jquery.touchswipe":5}],12:[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
define( function(require, exports, module){
    'use strict';
    var MergeXML = require('merge-xml');
    var utils = require('./utils');
    var $ = require('jquery');
    var ExtendedXpathEvaluator = require('extended-xpath');
    var openrosa_xpath_extensions = require( 'openrosa-xpath-extensions');
    require('./plugins');
    require('./extend');
    require('jquery.xpath');

    var FormModel, Nodeset, types;


    /**
     * Class dealing with the XML Model of a form
     *
     * @constructor
     * @param {{modelStr: string, ?instanceStr: string, ?external: <{id: string, xmlStr: string }>, ?submitted: boolean }} data:
     *                            data object containing XML model, 
     *                            (partial) XML instance to load, 
     *                            external data array
     *                            flag to indicate whether data was submitted before
     * @param {?{?full:boolean}} options Whether to initialize the full model or only the primary instance
     */
    FormModel = function( data, options ) {

        if ( typeof data === 'string' ) {
            data = {
                modelStr: data
            };
        }

        data.external = data.external || [];
        data.submitted = ( typeof data.submitted !== 'undefined' ) ? data.submitted : true;
        options = options || {};
        options.full = ( typeof options.full !== 'undefined' ) ? options.full : true;

        this.convertedExpressions = {};
        this.templates = {};
        this.loadErrors = [];

        this.INSTANCE = /instance\([\'|\"]([^\/:\s]+)[\'|\"]\)/g;
        this.OPENROSA = /(decimal-date-time\(|pow\(|indexed-repeat\(|format-date\(|coalesce\(|join\(|max\(|min\(|random\(|substr\(|int\(|uuid\(|regex\(|now\(|today\(|date\(|if\(|boolean-from-string\(|checklist\(|selected\(|selected-at\(|round\(|area\(|position\([^\)])/;

        this.data = data;
        this.options = options;
    };

    /**
     * Initializes FormModel
     */
    FormModel.prototype.init = function() {
        var id, instanceDoc, instanceRoot,
            that = this;
        /**
         * Default namespaces (on a primary instance, instance child, model) would create a problem using the **native** XPath evaluator.
         * It wouldn't find any regular /path/to/nodes. The solution is to ignore these by renaming these attributes to data-xmlns.
         *
         * If the regex is later deemed too aggressive, it could target the model, primary instance and primary instance child only, after creating an XML Document.
         */
        this.data.modelStr = this.data.modelStr.replace( /\s(xmlns\=("|')[^\s\>]+("|'))/g, ' data-$1' );

        if ( !this.options.full ) {
            // Strip all secondary instances from string before parsing
            // This regex works because the model never includes itext in Enketo
            this.data.modelStr = this.data.modelStr.replace( /^(<model\s*><instance((?!<instance).)+<\/instance\s*>\s*)(<instance.+<\/instance\s*>)*/, '$1' );
        }

        // Create the model
        try {
            id = 'model';
            // the default model
            this.xml = $.parseXML( this.data.modelStr );
            // add external data to model
            this.data.external.forEach( function( instance ) {
                id = 'instance "' + instance.id + '"' || 'instance unknown';
                instanceDoc = that.xml.getElementById( instance.id );
                // remove any existing content that is just an XLSForm hack to pass ODK Validate
                instanceRoot = instanceDoc.querySelector( 'root' );
                if ( instanceRoot ) {
                    instanceDoc.removeChild( instanceRoot );
                }
                instanceDoc.appendChild( $.parseXML( instance.xmlStr ).firstChild );
            } );
        } catch ( e ) {
            console.error( e );
            this.loadErrors.push( 'Error trying to parse XML ' + id + '. ' + e.message );
        }

        // Initialize/process the model
        if ( this.xml ) {
            this.$ = $( this.xml );
            this.hasInstance = !!this.xml.querySelector( 'model > instance' ) || false;
            this.rootElement = this.xml.querySelector( 'instance > *' ) || this.xml.documentElement;

            // Check if all secondary instances with an external source have been populated
            this.$.find( 'model > instance[src]:empty' ).each( function( index, instance ) {
                that.loadErrors.push( 'External instance "' + $( instance ).attr( 'id' ) + '" is empty.' );
            } );

            this.trimValues();
            this.cloneAllTemplates();
            this.extractTemplates();

            // Merge an existing instance into the model, AFTER templates have been removed
            try {
                id = 'record';
                if ( this.data.instanceStr ) {
                    this.mergeXml( this.data.instanceStr );
                    if ( this.data.submitted ) {
                        this.deprecateId();
                    }
                }
            } catch ( e ) {
                console.error( e );
                this.loadErrors.push( 'Error trying to parse XML ' + id + '. ' + e.message );
            }
        }

        return this.loadErrors;
    };

    /**
     * Returns a new Nodeset instance
     *
     * @param {(string|null)=} selector - [type/description]
     * @param {(string|number|null)=} index    - [type/description]
     * @param {(Object|null)=} filter   - [type/description]
     * @param filter.onlyLeaf
     * @param filter.noEmpty
     * @return {Nodeset}
     */
    FormModel.prototype.node = function( selector, index, filter ) {
        return new Nodeset( selector, index, filter, this );
    };

    /**
     * Merges an XML instance string into the XML Model
     *
     * @param  {string} recordStr The XML record as string
     * @param  {string} modelDoc  The XML model to merge the record into
     */
    FormModel.prototype.mergeXml = function( recordStr ) {
        var modelInstanceChildStr, merger, modelInstanceEl, modelInstanceChildEl;

        if ( !recordStr ) {
            return;
        }

        modelInstanceEl = this.xml.querySelector( 'instance' );
        modelInstanceChildEl = this.xml.querySelector( 'instance > *' ); // do not use firstChild as it may find a #textNode

        if ( !modelInstanceChildEl ) {
            throw new Error( 'Model is corrupt. It does not contain a childnode of instance' );
        }

        merger = new MergeXML( {
            join: false
        } );

        modelInstanceChildStr = ( new XMLSerializer() ).serializeToString( modelInstanceChildEl );

        // first the model, to preserve DOM order of that of the default instance
        merger.AddSource( modelInstanceChildStr );
        // then merge the record into the model
        merger.AddSource( recordStr );

        if ( merger.error.code ) {
            throw new Error( merger.error.text );
        }

        // remove the primary instance  childnode from the original model
        this.xml.querySelector( 'instance' ).removeChild( modelInstanceChildEl );
        // adopt the merged instance childnode
        modelInstanceChildEl = this.xml.adoptNode( merger.Get( 0 ).documentElement, true );
        // append the adopted node to the primary instance
        modelInstanceEl.appendChild( modelInstanceChildEl );
        // reset the rootElement
        this.rootElement = modelInstanceChildEl;

    };

    /**
     * Trims values
     * 
     */
    FormModel.prototype.trimValues = function() {
        this.node( null, null, {
            noEmpty: true
        } ).get().each( function() {
            this.textContent = this.textContent.trim();
        } );
    };

    /**
     * [deprecateId description]
     * @return {[type]} [description]
     */
    FormModel.prototype.deprecateId = function() {
        var instanceIdEls, instanceIdEl, deprecatedIdEls, deprecatedIdEl, metaEl;

        /*
         * When implementing this function using the this.node(selector) to find nodes instead of querySelectorAll,
         * I found that the results were always empty even if the nodes existed. There seems to be 
         * some sort of delay in updating the XML Document (in mergeXML) that causes a problem
         * when the XPath evaluator is used to retrieve nodes.
         */

        instanceIdEls = this.xml.querySelectorAll( '* > meta > instanceID' );

        if ( instanceIdEls.length !== 1 ) {
            throw new Error( 'Invalid primary instance. Found ' + instanceIdEls.length + ' instanceID nodes but expected 1.' );
        }

        instanceIdEl = instanceIdEls[ 0 ];

        deprecatedIdEls = this.xml.querySelectorAll( '* > meta > deprecatedID' );

        if ( deprecatedIdEls.length > 1 ) {
            throw new Error( 'Invalid primary instance. Found ' + deprecatedIdEls.length + ' deprecatedID nodes but expected 1.' );
        }

        deprecatedIdEl = deprecatedIdEls[ 0 ];

        // add deprecatedID node
        if ( !deprecatedIdEl ) {
            deprecatedIdEl = $.parseXML( '<deprecatedID/>' ).documentElement;
            this.xml.adoptNode( deprecatedIdEl );
            metaEl = this.xml.querySelector( '* > meta' );
            metaEl.appendChild( deprecatedIdEl );
        }

        // give deprecatedID element the value of the instanceId
        deprecatedIdEl.textContent = instanceIdEl.textContent;

        // set the instanceID value to empty
        instanceIdEl.textContent = '';
    };

    /**
     * Creates a custom XPath Evaluator to be used for XPath Expresssions that contain custom
     * OpenRosa functions or for browsers that do not have a native evaluator.
     */
    FormModel.prototype.bindJsEvaluator = function() {
        // re-implement XPathJS ourselves!
        var evaluator = new XPathEvaluator();
        this.xml.jsCreateExpression = function() {
            return evaluator.createExpression.apply( evaluator, arguments );
        };
        this.xml.jsCreateNSResolver = function() {
            return evaluator.createNSResolver.apply( evaluator, arguments );
        };
        this.xml.jsEvaluate = function(e, contextPath, namespaceResolver, resultType, result) {
            var val, evaluator;
            evaluator = new ExtendedXpathEvaluator(
                    function wrappedXpathEvaluator(v) {
                        var doc = contextPath.ownerDocument;
                        return doc.evaluate(v, contextPath, namespaceResolver,
                                // We pretty much always want to get a String in
                                // the java rosa functions, and we don't want to
                                // pass the top-level expectation all the way
                                // down, so it's fairly safe to hard-code this,
                                // especially considering we handle NUMBER_TYPEs
                                // manually.
                                // TODO what is `result` for?  Should it be
                                // replaced in this call?
                                XPathResult.STRING_TYPE, result);
                                //resultType, result);
                    },
                    openrosa_xpath_extensions);
            val = evaluator.evaluate(e);
            return val;
        };
        window.JsXPathException =
                window.JsXPathExpression =
                window.JsXPathNSResolver =
                window.JsXPathResult =
                window.JsXPathNamespace = true;
    };

    /**
     * Gets the instance ID
     *
     * @return {string} instanceID
     */
    FormModel.prototype.getInstanceID = function() {
        return this.node( '/*/meta/instanceID' ).getVal()[ 0 ];
    };

    /**
     * Gets the instance Name
     *
     * @return {string} instanceID
     */
    FormModel.prototype.getInstanceName = function() {
        return this.node( '/*/meta/instanceName' ).getVal()[ 0 ];
    };

    /**
     * Clones a <repeat>able instance node. If a template exists it will use this, otherwise it will clone an empty version of the first node.
     * If the node with the specified index already exists, this function will do nothing.
     *
     * @param  {string} selector selector of a repeat or a node that is contained inside a repeat
     * @param  {number} index    index of the repeat that the new repeat should be inserted after.
     */
    FormModel.prototype.cloneRepeat = function( selector, index ) {
        var $insertAfterNode, name, allClonedNodeNames, $templateClone,
            $template = this.templates[ selector ] || this.node( selector, 0 ).get(),
            that = this;

        name = $template.prop( 'nodeName' );
        $insertAfterNode = this.node( selector, index ).get();

        // If templatenodes and insertAfterNode(s) have been identified 
        // AND the node following insertAfterNode doesn't already exist (! important for nested repeats!)
        // Strictly speaking using .next() is more efficient, but we use .nextAll() in case the document order has changed due to 
        // incorrect merging of an existing record.
        if ( $template[ 0 ] && $insertAfterNode.length === 1 && $insertAfterNode.nextAll( name ).length === 0 ) {
            $templateClone = $template.clone().insertAfter( $insertAfterNode );

            allClonedNodeNames = [ $template.prop( 'nodeName' ) ];

            $template.find( '*' ).each( function() {
                allClonedNodeNames.push( $( this ).prop( 'nodeName' ) );
            } );

            this.$.trigger( 'dataupdate', {
                nodes: allClonedNodeNames,
                repeatPath: selector,
                repeatIndex: that.node( selector, index ).determineIndex( $templateClone )
            } );

        } else {
            // Strictly speaking using .next() is more efficient, but we use .nextAll() in case the document order has changed due to 
            // incorrect merging of an existing record.
            if ( $insertAfterNode.nextAll( name ).length === 0 ) {
                console.error( 'Could not find template node and/or node to insert the clone after' );
            }
        }
    };


    /**
     * Extracts all templates from the model and stores them in a Javascript object poperties as Jquery collections
     * @return {[type]} [description]
     */
    FormModel.prototype.extractTemplates = function() {
        var that = this;
        // in reverse document order to properly deal with nested repeat templates
        // for now we support both the official namespaced template and the hacked non-namespaced template attributes
        this.evaluate( '/model/instance[1]/*//*[@template] | /model/instance[1]/*//*[@jr:template]', 'nodes', null, null, true ).reverse().forEach( function( templateEl ) {
            var $template = $( templateEl );
            that.templates[ $template.getXPath( 'instance' ) ] = $template.removeAttr( 'template' ).removeAttr( 'jr:template' ).remove();
        } );
    };


    /**
     * Finds a template path that would contain the provided node path if that template exists in the form.
     *
     * @param  {string} nodePath the /path/to/template/node
     * @return {*}               the /path/to/template
     */
    FormModel.prototype.getTemplatePath = function( nodePath ) {
        var templateIndex,
            that = this;

        nodePath.split( '/' ).some( function( value, index, array ) {
            templateIndex = array.slice( 0, array.length - index ).join( '/' );
            return that.templates[ templateIndex ];
        } );

        return templateIndex || undefined;
    };

    /**
     * Initialization function that creates <repeat>able data nodes with the defaults from the template if no repeats have been created yet.
     * Strictly speaking creating the first repeat automatically is not "according to the spec" as the user should be asked first whether it
     * has any data for this question.
     * However, it seems usually always better to assume at least one 'repeat' (= 1 question). It doesn't make use of the Nodeset subclass (CHANGE?)
     *
     * See also: In JavaRosa, the documentation on the jr:template attribute.
     */
    FormModel.prototype.cloneAllTemplates = function() {
        var that = this;

        // for now we support both the official namespaced template and the hacked non-namespaced template attributes
        this.evaluate( '/model/instance[1]/*//*[@template] | /model/instance[1]/*//*[@jr:template]', 'nodes', null, null, true ).forEach( function( templateEl ) {
            var nodeName = templateEl.nodeName,
                selector = $( templateEl ).getXPath( 'instance' ),
                ancestorTemplateNodes = that.evaluate( 'ancestor::' + nodeName + '[@template] | ancestor::' + nodeName + '[@jr:template]', 'nodes', selector, 0, true );
            if ( ancestorTemplateNodes.length === 0 && $( templateEl ).siblings( nodeName ).length === 0 ) {
                $( templateEl ).clone().insertAfter( $( templateEl ) ).find( '*' ).addBack().removeAttr( 'template' ).removeAttr( 'jr:template' );
            }
        } );
    };

    /**
     * See Also:
     * Returns jQuery Data Object (obsolete?)
     * See also: <nodes.get()>, which is always (?) preferred except for debugging.
     *
     * @return {jQuery} JQuery Data Object
     */
    FormModel.prototype.get = function() {
        return this.$ || null;
    };

    /**
     *
     * @return {Element} data XML object (not sure if type is element actually)
     */
    FormModel.prototype.getXML = function() {
        return this.xml || null;
    };

    /**
     * Obtains a cleaned up string of the data instance
     *
     * @return {string}           XML string
     */
    FormModel.prototype.getStr = function() {
        var dataStr = ( new XMLSerializer() ).serializeToString( this.xml.querySelector( 'instance > *' ) || this.xml.documentElement, 'text/xml' );
        // remove tabs
        dataStr = dataStr.replace( /\t/g, '' );
        // restore default namespaces
        dataStr = dataStr.replace( /\s(data-)(xmlns\=("|')[^\s\>]+("|'))/g, ' $2' );
        return dataStr;
    };

    /**
     * There is a huge bug in JavaRosa that has resulted in the usage of incorrect formulae on nodes inside repeat nodes.
     * Those formulae use absolute paths when relative paths should have been used. See more here:
     * http://opendatakit.github.io/odk-xform-spec/#a-big-deviation-with-xforms
     *
     * Tools such as pyxform also build forms in this incorrect manner. See https://github.com/modilabs/pyxform/issues/91
     * It will take time to correct this so makeBugCompliant() aims to mimic the incorrect
     * behaviour by injecting the 1-based [position] of repeats into the XPath expressions. The resulting expression
     * will then be evaluated in a way users expect (as if the paths were relative) without having to mess up
     * the XPath Evaluator.
     *
     * E.g. '/data/rep_a/node_a' could become '/data/rep_a[2]/node_a' if the context is inside
     * the second rep_a repeat.
     *
     * This function should be removed as soon as JavaRosa (or maybe just pyxform) fixes the way those formulae
     * are created (or evaluated).
     *
     * @param  {string} expr        the XPath expression
     * @param  {string} selector    of the (context) node on which expression is evaluated
     * @param  {number} index       of the instance node with that selector
     * @return {string} modified    expression with injected positions (1-based!)
     */
    FormModel.prototype.makeBugCompliant = function( expr, selector, index ) {
        var i, parentSelector, parentIndex, $target, $node, nodeName, $siblings, $parents;
        $target = this.node( selector, index ).get();
        // add() sorts the resulting collection in document order
        $parents = $target.parents().add( $target );
        // traverse collection in reverse document order
        for ( i = $parents.length - 1; i >= 0; i-- ) {
            $node = $parents.eq( i );
            // escape any dots in the node name
            nodeName = $node.prop( 'nodeName' ).replace( /\./g, '\\.' );
            $siblings = $node.siblings( nodeName ).not( '[template]' );
            // if the node is a repeat node that has been cloned at least once (i.e. if it has siblings with the same nodeName)
            if ( nodeName.toLowerCase() !== 'instance' && nodeName.toLowerCase() !== 'model' && $siblings.length > 0 ) {
                parentSelector = $node.getXPath( 'instance' );
                parentIndex = $siblings.add( $node ).index( $node );
                // Add position to segments that do not have an XPath predicate. This is where it gets very messy.
                if ( !new RegExp( parentSelector + '\\[' ).test( expr ) ) {
                    expr = expr.replace( new RegExp( parentSelector, 'g' ), parentSelector + '[' + ( parentIndex + 1 ) + ']' );
                }
            }
        }
        return expr;
    };

    FormModel.prototype.nsResolver = {

        lookupNamespaceURI: function( prefix ) {
            var namespaces = {
                'jr': 'http://openrosa.org/javarosa',
                'xsd': 'http://www.w3.org/2001/XMLSchema',
                'orx': 'http://openrosa.org/xforms/', // CommCare uses 'http://openrosa.org/jr/xforms'
                'cc': 'http://commcarehq.org/xforms'
            };

            return namespaces[ prefix ] || null;
        }
    };

    /**
     * Shift root to first instance for all absolute paths not starting with /model
     *
     * @param  {string} expr original expression
     * @return {string}      new expression
     */
    FormModel.prototype.shiftRoot = function( expr ) {
        if ( this.hasInstance ) {
            expr = expr.replace( /^(\/(?!model\/)[^\/][^\/\s]*\/)/g, '/model/instance[1]$1' );
            expr = expr.replace( /([^a-zA-Z0-9\.\]\)\/\*_-])(\/(?!model\/)[^\/][^\/\s]*\/)/g, '$1/model/instance[1]$2' );
        }
        return expr;
    };

    /** 
     * Replace instance('id') with an absolute path
     * Doing this here instead of adding an instance() function to the XPath evaluator, means we can keep using
     * the much faster native evaluator in most cases!
     *
     * @param  {string} expr original expression
     * @return {string}      new expression
     */
    FormModel.prototype.replaceInstanceFn = function( expr ) {
        return expr.replace( this.INSTANCE, function( match, id ) {
            return '/model/instance[@id="' + id + '"]';
        } );
    };

    /** 
     * Replaces current()/ with '' or '/' because Enketo does not (yet) change the context in an itemset.
     * Doing this here instead of adding a current() function to the XPath evaluator, means we can keep using
     * the much faster native evaluator in most cases!
     *
     * @param  {string} expr original expression
     * @return {string}      new expression
     */
    FormModel.prototype.replaceCurrentFn = function( expr ) {
        expr = expr.replace( /current\(\)\/\./g, '.' );
        expr = expr.replace( /current\(\)/g, '' );
        return expr;
    };

    /**
     * Replaces indexed-repeat(node, path, position, path, position, etc) substrings by converting them
     * to their native XPath equivalents using [position() = x] predicates
     *
     * @param  {string} expr the XPath expression
     * @return {string}      converted XPath expression
     */
    FormModel.prototype.replaceIndexedRepeatFn = function( expr, selector, index ) {
        var that = this,
            indexedRepeats = utils.parseFunctionFromExpression( expr, 'indexed-repeat' );

        if ( !indexedRepeats.length ) {
            return expr;
        }

        indexedRepeats.forEach( function( indexedRepeat ) {
            var i, positionedPath, position,
                params = indexedRepeat[ 1 ].split( ',' );

            if ( params.length % 2 === 1 ) {

                // trim parameters
                params = params.map( function( param ) {
                    return param.trim();
                } );

                positionedPath = params[ 0 ];

                for ( i = params.length - 1; i > 1; i -= 2 ) {
                    // The position will become an XPath predicate. The context for an XPath predicate, is not the same
                    // as the context for the complete expression, so we have to evaluate the position separately.
                    position = !isNaN( params[ i ] ) ? params[ i ] : that.evaluate( params[ i ], 'number', selector, index, true );
                    positionedPath = positionedPath.replace( params[ i - 1 ], params[ i - 1 ] + '[position() = ' + position + ']' );
                }
                expr = expr.replace( indexedRepeat[ 0 ], positionedPath );

            } else {
                console.error( 'indexed repeat with incorrect number of parameters found', indexedRepeat[ 0 ] );
                return '"Error with indexed-repeat parameters"';
            }
        } );

        return expr;
    };

    /**
     * Evaluates an XPath Expression with available XPath evaluators, including
     * javarosa extensions.
     *
     * This function does not seem to work properly for nodeset resulttypes otherwise:
     * muliple nodes can be accessed by returned node.snapshotItem(i)(.textContent)
     * a single node can be accessed by returned node(.textContent)
     *
     * @param  { string }     expr        the expression to evaluate
     * @param  { string= }    resTypeStr  boolean, string, number, node, nodes (best to always supply this)
     * @param  { string= }    selector    jQuery selector which will be use to provide the context to the evaluator
     * @param  { number= }    index       0-based index of selector in document
     * @param  { boolean= }   tryNative   whether an attempt to try the Native Evaluator is safe (ie. whether it is
     *                                    certain that there are no date comparisons)
     * @return { ?(number|string|boolean|Array<element>) } the result
     */
    FormModel.prototype.evaluate = function( expr, resTypeStr, selector, index, tryNative ) {
        var j, error, context, doc, resTypeNum, resultTypes, result, $collection, response, repeats, cacheKey, original, cacheable;

        // console.debug( 'evaluating expr: ' + expr + ' with context selector: ' + selector + ', 0-based index: ' +
        //    index + ' and result type: ' + resTypeStr );
        original = expr;
        tryNative = tryNative || false;
        resTypeStr = resTypeStr || 'any';
        index = index || 0;
        doc = this.xml;
        repeats = null;

        // path corrections for repeated nodes: http://opendatakit.github.io/odk-xform-spec/#a-big-deviation-with-xforms
        if ( selector ) {
            $collection = this.node( selector ).get();
            repeats = $collection.length;
            context = $collection.eq( index )[ 0 ];
        } else {
            // either the first data child of the first instance or the first child (for loaded instances without a model)
            context = this.rootElement;
        }

        // cache key includes the number of repeated context nodes, 
        // to force a new cache item if the number of repeated changes to > 0
        // TODO: these cache keys can get quite large. Would it be beneficial to get the md5 of the key?
        cacheKey = [ expr, selector, index, repeats ].join( '|' );

        // This function needs to come before makeBugCompliant.
        // An expression transformation with indexed-repeat cannot be cached because in 
        // "indexed-repeat(node, repeat nodeset, index)" the index parameter could be an expression.
        expr = this.replaceIndexedRepeatFn( expr, selector, index );
        cacheable = ( original === expr );

        // if no cached conversion exists
        if ( !this.convertedExpressions[ cacheKey ] ) {
            expr = expr;
            expr = expr.trim();
            expr = this.shiftRoot( expr );
            expr = this.replaceInstanceFn( expr );
            expr = this.replaceCurrentFn( expr );
            if ( repeats && repeats > 1 ) {
                expr = this.makeBugCompliant( expr, selector, index );
            }
            // decode
            expr = expr.replace( /&lt;/g, '<' );
            expr = expr.replace( /&gt;/g, '>' );
            expr = expr.replace( /&quot;/g, '"' );
            if ( cacheable ) {
                this.convertedExpressions[ cacheKey ] = expr;
            }
        } else {
            expr = this.convertedExpressions[ cacheKey ];
        }

        resultTypes = {
            0: [ 'any', 'ANY_TYPE' ],
            1: [ 'number', 'NUMBER_TYPE', 'numberValue' ],
            2: [ 'string', 'STRING_TYPE', 'stringValue' ],
            3: [ 'boolean', 'BOOLEAN_TYPE', 'booleanValue' ],
            7: [ 'nodes', 'ORDERED_NODE_SNAPSHOT_TYPE' ],
            9: [ 'node', 'FIRST_ORDERED_NODE_TYPE', 'singleNodeValue' ]
        };

        // translate typeStr to number according to DOM level 3 XPath constants
        for ( resTypeNum in resultTypes ) {
            if ( resultTypes.hasOwnProperty( resTypeNum ) ) {
                resTypeNum = Number( resTypeNum );
                if ( resultTypes[ resTypeNum ][ 0 ] === resTypeStr ) {
                    break;
                } else {
                    resTypeNum = 0;
                }
            }
        }

        // try native to see if that works... (will not work if the expr contains custom OpenRosa functions)
        if ( tryNative && typeof doc.evaluate !== 'undefined' && !this.OPENROSA.test( expr ) ) {
            try {
                // console.log( 'trying the blazing fast native XPath Evaluator for', expr, index );
                result = doc.evaluate( expr, context, this.nsResolver, resTypeNum, null );
            } catch ( e ) {
                console.log( '%cWell native XPath evaluation did not work... No worries, worth a shot, the expression probably ' +
                    'contained unknown OpenRosa functions or errors:', 'color:orange', expr );
            }
        }

        // if that didn't work, try the slower custom XPath JS evaluator
        if ( !result ) {
            try {
                if ( typeof doc.jsEvaluate === 'undefined' ) {
                    this.bindJsEvaluator();
                }
                // console.log( 'trying the slow enketo-xpathjs "openrosa" evaluator for', expr, index );
                result = doc.jsEvaluate( expr, context, this.nsResolver, resTypeNum, null );
            } catch ( e ) {
                error = 'Error occurred trying to evaluate: ' + expr + ', message: ' + e.message;
                console.error( error );
                $( document ).trigger( 'xpatherror', error );
                this.loadErrors.push( error );
                return null;
            }
        }

        // get desired value from the result object
        if ( result ) {
            // for type = any, see if a valid string, number or boolean is returned
            if ( resTypeNum === 0 ) {
                for ( resTypeNum in resultTypes ) {
                    if ( resultTypes.hasOwnProperty( resTypeNum ) ) {
                        resTypeNum = Number( resTypeNum );
                        if ( resTypeNum === Number( result.resultType ) && resTypeNum > 0 && resTypeNum < 4 ) {
                            response = result[ resultTypes[ resTypeNum ][ 2 ] ];
                            break;
                        }
                    }
                }
                console.error( 'Expression: ' + expr + ' did not return any boolean, string or number value as expected' );
            } else if ( resTypeNum === 7 ) {
                // response is an array of Elements
                response = [];
                for ( j = 0; j < result.snapshotLength; j++ ) {
                    response.push( result.snapshotItem( j ) );
                }
            } else {
                response = result[ resultTypes[ resTypeNum ][ 2 ] ];
            }
            return response;
        }
    };

    /**
     * Class dealing with nodes and nodesets of the XML instance
     *
     * @constructor
     * @param {string=} selector simpleXPath or jQuery selectedor
     * @param {number=} index    the index of the target node with that selector
     * @param {?{onlyLeaf: boolean, noEmpty: boolean}=} filter   filter object for the result nodeset
     * @param { FormModel } model instance of FormModel
     */
    Nodeset = function( selector, index, filter, model ) {
        var defaultSelector = model.hasInstance ? '/model/instance[1]//*' : '//*';

        this.model = model;
        this.originalSelector = selector;
        this.selector = ( typeof selector === 'string' && selector.length > 0 ) ? selector : defaultSelector;
        filter = ( typeof filter !== 'undefined' && filter !== null ) ? filter : {};
        this.filter = filter;
        this.filter.onlyLeaf = ( typeof filter.onlyLeaf !== 'undefined' ) ? filter.onlyLeaf : false;
        this.filter.noEmpty = ( typeof filter.noEmpty !== 'undefined' ) ? filter.noEmpty : false;
        this.index = index;
    };

    /**
     * Privileged method to find data nodes filtered by a jQuery or XPath selector and additional filter properties
     * Without parameters it returns a collection of all data nodes excluding template nodes and their children. Therefore, most
     * queries will not require filter properties. This function handles all (?) data queries in the application.
     *
     * @return {jQuery} jQuery-wrapped filtered instance nodes that match the selector and index
     */
    Nodeset.prototype.get = function() {
        var $nodes, /** @type {string} */ val;

        // cache evaluation result
        if ( !this.nodes ) {
            this.nodes = this.model.evaluate( this.selector, 'nodes', null, null, true );
        }

        // noEmpty automatically excludes non-leaf nodes
        if ( this.filter.noEmpty === true ) {
            $nodes = $( this.nodes ).filter( function() {
                var $node = $( this );
                val = $node.text();
                return $node.children().length === 0 && val.trim().length > 0;
            } );
        }
        // this may still contain empty leaf nodes
        else if ( this.filter.onlyLeaf === true ) {
            $nodes = $( this.nodes ).filter( function() {
                return $( this ).children().length === 0;
            } );
        } else {
            $nodes = $( this.nodes );
        }

        return ( typeof this.index !== 'undefined' && this.index !== null ) ? $nodes.eq( this.index ) : $nodes;
    };

    /**
     * Sets the index of the Nodeset instance
     *
     * @param {=number?} index The 0-based index
     */
    Nodeset.prototype.setIndex = function( index ) {
        this.index = index;
    };

    /**
     * Sets data node values.
     *
     * @param {(string|Array.<string>)=} newVals    The new value of the node.
     * @param {?string=} expr  XPath expression to validate the node.
     * @param {?string=} xmlDataType XML data type of the node
     *
     * @return {?boolean} null is returned when the node is not found or multiple nodes were selected
     */
    Nodeset.prototype.setVal = function( newVals, expr, xmlDataType ) {
        var $target, curVal, /**@type {string}*/ newVal, success, updated;

        curVal = this.getVal()[ 0 ];

        if ( typeof newVals !== 'undefined' && newVals !== null ) {
            newVal = ( $.isArray( newVals ) ) ? newVals.join( ' ' ) : newVals.toString();
        } else {
            newVal = '';
        }

        newVal = this.convert( newVal, xmlDataType );

        $target = this.get();

        if ( $target.length === 1 && $.trim( newVal.toString() ) !== $.trim( curVal.toString() ) ) { //|| (target.length > 1 && typeof this.index == 'undefined') ){
            //first change the value so that it can be evaluated in XPath (validated)
            $target.text( newVal );
            //then return validation result
            success = this.validate( expr, xmlDataType );
            updated = this.getClosestRepeat();
            updated.nodes = [ $target.prop( 'nodeName' ) ];
            this.model.$.trigger( 'dataupdate', updated );
            //add type="file" attribute for file references
            if ( xmlDataType === 'binary' ) {
                if ( newVal.length > 0 ) {
                    $target.attr( 'type', 'file' );
                } else {
                    $target.removeAttr( 'type' );
                }
            }

            return success;
        }
        if ( $target.length > 1 ) {
            console.error( 'nodeset.setVal expected nodeset with one node, but received multiple' );
            return null;
        }
        if ( $target.length === 0 ) {
            console.error( 'Data node: ' + this.selector + ' with null-based index: ' + this.index + ' not found. Ignored.' );
            return null;
        }
        //always validate if the new value is not empty, even if value didn't change (see validateAll() function)
        //return (newVal.length > 0 && validateAll) ? this.validate(expr, xmlDataType) : true;
        return null;
    };


    /**
     * Obtains the data value if a JQuery or XPath selector for a single node is provided.
     *
     * @return {Array<string|number|boolean>} [description]
     */
    Nodeset.prototype.getVal = function() {
        var vals = [];
        this.get().each( function() {
            vals.push( $( this ).text() );
        } );
        return vals;
    };

    /**
     * Determines the index of a repeated node amongst all nodes with the same XPath selector
     *
     * @param  {} $node optional jquery element
     * @return {number}       [description]
     */
    Nodeset.prototype.determineIndex = function( $node ) {
        var nodeName, path, $family;

        $node = $node || this.get();

        if ( $node.length === 1 ) {
            nodeName = $node.prop( 'nodeName' );
            path = $node.getXPath( 'instance' );
            $family = this.model.$.find( nodeName ).filter( function() {
                return path === $( this ).getXPath( 'instance' );
            } );
            return ( $family.length === 1 ) ? null : $family.index( $node );
        } else {
            console.error( 'no node, or multiple nodes, provided to nodeset.determineIndex' );
            return -1;
        }
    };

    // if repeats have not been cloned yet, they are not considered a repeat by this function
    Nodeset.prototype.getClosestRepeat = function() {
        var $node = this.get(),
            nodeName = $node.prop( 'nodeName' );

        while ( $node.siblings( nodeName ).length === 0 && nodeName !== 'instance' ) {
            $node = $node.parent();
            nodeName = $node.prop( 'nodeName' );
        }

        return ( nodeName === 'instance' ) ? {} : {
            repeatPath: $node.getXPath( 'instance' ),
            repeatIndex: this.determineIndex( $node )
        };
    };

    /**
     * Remove a repeat node
     */
    Nodeset.prototype.remove = function() {
        var $dataNode, allRemovedNodeNames, $this, repeatPath, repeatIndex;

        $dataNode = this.get();

        if ( $dataNode.length > 0 ) {

            allRemovedNodeNames = [ $dataNode.prop( 'nodeName' ) ];

            $dataNode.find( '*' ).each( function() {
                $this = $( this );
                allRemovedNodeNames.push( $this.prop( 'nodeName' ) );
            } );

            repeatPath = $dataNode.getXPath( 'instance' );
            repeatIndex = this.determineIndex( $dataNode );

            $dataNode.remove();
            this.nodes = null;

            this.model.$.trigger( 'dataupdate', {
                updatedNodes: allRemovedNodeNames,
                repeatPath: repeatPath,
                repeatIndex: repeatIndex
            } );
        } else {
            console.error( 'could not find node ' + this.selector + ' with index ' + this.index + ' to remove ' );
        }
    };

    /**
     * Convert a value to a specified data type( though always stringified )
     * @param  {?string=} x           value to convert
     * @param  {?string=} xmlDataType XML data type
     * @return {string}               string representation of converted value
     */
    Nodeset.prototype.convert = function( x, xmlDataType ) {
        if ( x.toString() === '' ) {
            return x;
        }
        if ( typeof xmlDataType !== 'undefined' && xmlDataType !== null &&
            typeof types[ xmlDataType.toLowerCase() ] !== 'undefined' &&
            typeof types[ xmlDataType.toLowerCase() ].convert !== 'undefined' ) {
            return types[ xmlDataType.toLowerCase() ].convert( x );
        }
        return x;
    };

    /**
     * Validate a value with an XPath Expression and /or xml data type
     * @param  {?string=} expr        XPath expression
     * @param  {?string=} xmlDataType XML datatype
     * @return {boolean}
     */
    Nodeset.prototype.validate = function( expr, xmlDataType ) {
        var typeValid, exprValid, value;

        if ( !xmlDataType || typeof types[ xmlDataType.toLowerCase() ] === 'undefined' ) {
            xmlDataType = 'string';
        }

        // This one weird trick results in a small validation performance increase.
        // Do not obtain *the value* if the expr is empty and data type is string, select, select1, binary knowing that this will always return true.
        if ( !expr && ( xmlDataType === 'string' || xmlDataType === 'select' || xmlDataType === 'select1' || xmlDataType === 'binary' ) ) {
            return true;
        }

        value = this.getVal()[ 0 ];

        if ( value.toString() === '' ) {
            return true;
        }

        typeValid = types[ xmlDataType.toLowerCase() ].validate( value );
        exprValid = ( typeof expr !== 'undefined' && expr !== null && expr.length > 0 ) ? this.model.evaluate( expr, 'boolean', this.originalSelector, this.index ) : true;

        return ( typeValid && exprValid );
    };

    /**
     * @namespace types
     * @type {Object}
     */
    types = {
        'string': {
            //max length of type string is 255 chars.Convert( truncate ) silently ?
            validate: function() {
                return true;
            }
        },
        'select': {
            validate: function() {
                return true;
            }
        },
        'select1': {
            validate: function() {
                return true;
            }
        },
        'decimal': {
            validate: function( x ) {
                return ( !isNaN( x - 0 ) && x !== null ) ? true : false;
            },
            convert: function( x ) {
                // deals with Java issue and possible db issues:
                // https://github.com/MartijnR/enketo-core/issues/40
                return ( x === 'NaN' ) ? '' : x;
            }
        },
        'int': {
            validate: function( x ) {
                return ( !isNaN( x - 0 ) && x !== null && Math.round( x ).toString() === x.toString() ) ? true : false;
            },
            convert: function( x ) {
                // deals with Java issue and possible db issues:
                // https://github.com/MartijnR/enketo-core/issues/40
                return ( x === 'NaN' ) ? '' : x;
            }
        },
        'date': {
            validate: function( x ) {
                var pattern = ( /([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/ ),
                    segments = pattern.exec( x );

                return ( segments && segments.length === 6 ) ? ( new Date( Number( segments[ 1 ] ), Number( segments[ 3 ] ) - 1, Number( segments[ 5 ] ) ).toString() !== 'Invalid Date' ) : false;
            },
            convert: function( x ) {
                var pattern = /([0-9]{4})([\-]|[\/])([0-9]{2})([\-]|[\/])([0-9]{2})/,
                    segments = pattern.exec( x ),
                    date = new Date( x );
                if ( new Date( x ).toString() === 'Invalid Date' ) {
                    //this code is really only meant for the Rhino and PhantomJS engines, in browsers it may never be reached
                    if ( segments && Number( segments[ 1 ] ) > 0 && Number( segments[ 3 ] ) >= 0 && Number( segments[ 3 ] ) < 12 && Number( segments[ 5 ] ) < 32 ) {
                        date = new Date( Number( segments[ 1 ] ), ( Number( segments[ 3 ] ) - 1 ), Number( segments[ 5 ] ) );
                    }
                }
                //date.setUTCHours(0,0,0,0);
                //return date.toUTCString();//.getUTCFullYear(), datetime.getUTCMonth(), datetime.getUTCDate());
                return date.getUTCFullYear().toString().pad( 4 ) + '-' + ( date.getUTCMonth() + 1 ).toString().pad( 2 ) + '-' + date.getUTCDate().toString().pad( 2 );
            }
        },
        'datetime': {
            validate: function( x ) {
                //the second part builds in some tolerance for slightly-off dates provides as defaults (e.g.: 2013-05-31T07:00-02)
                return ( new Date( x.toString() ).toString() !== 'Invalid Date' || new Date( this.convert( x.toString() ) ).toString() !== 'Invalid Date' );
            },
            convert: function( x ) {
                var date, // timezone, segments, dateS, timeS,
                    patternCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2}):([0-9]{2})$/,
                    patternAlmostCorrect = /([0-9]{4}\-[0-9]{2}\-[0-9]{2})([T]|[\s])([0-9]){2}:([0-9]){2}([0-9:.]*)(\+|\-)([0-9]{2})$/;
                /* 
                 * if the pattern is right, or almost right but needs a small correction for JavaScript to handle it,
                 * do not risk changing the time zone by calling toISOLocalString()
                 */
                if ( new Date( x ).toString() !== 'Invalid Date' && patternCorrect.test( x ) ) {
                    return x;
                }
                if ( new Date( x ).toString() === 'Invalid Date' && patternAlmostCorrect.test( x ) ) {
                    return x + ':00';
                }
                date = new Date( x );
                return ( date.toString() !== 'Invalid Date' ) ? date.toISOLocalString() : date.toString();
            }
        },
        'time': {
            validate: function( x ) {
                var date = new Date(),
                    segments = x.toString().split( ':' );
                if ( segments.length < 2 ) {
                    return false;
                }
                segments[ 2 ] = ( segments[ 2 ] ) ? Number( segments[ 2 ].toString().split( '.' )[ 0 ] ) : 0;

                return ( segments[ 0 ] < 24 && segments[ 0 ] >= 0 && segments[ 1 ] < 60 && segments[ 1 ] >= 0 && segments[ 2 ] < 60 && segments[ 2 ] >= 0 && date.toString() !== 'Invalid Date' );
            },
            convert: function( x ) {
                var segments = x.toString().split( ':' );
                $.each( segments, function( i, val ) {
                    segments[ i ] = val.toString().pad( 2 );
                } );
                return segments.join( ':' );
            }
        },
        'barcode': {
            validate: function() {
                return true;
            }
        },
        'geopoint': {
            validate: function( x ) {
                var coords = x.toString().trim().split( ' ' );
                return ( coords[ 0 ] !== '' && coords[ 0 ] >= -90 && coords[ 0 ] <= 90 ) &&
                    ( coords[ 1 ] !== '' && coords[ 1 ] >= -180 && coords[ 1 ] <= 180 ) &&
                    ( typeof coords[ 2 ] === 'undefined' || !isNaN( coords[ 2 ] ) ) &&
                    ( typeof coords[ 3 ] === 'undefined' || ( !isNaN( coords[ 3 ] ) && coords[ 3 ] >= 0 ) );
            },
            convert: function( x ) {
                return $.trim( x.toString() );
            }
        },
        'geotrace': {
            validate: function( x ) {
                var geopoints = x.toString().split( ';' );
                return geopoints.length >= 2 && geopoints.every( function( geopoint ) {
                    return types.geopoint.validate( geopoint );
                } );
            },
            convert: function( x ) {
                return x.toString().trim();
            }
        },
        'geoshape': {
            validate: function( x ) {
                console.debug( 'validating geoshape, this: ', this );
                var geopoints = x.toString().split( ';' );
                return geopoints.length >= 4 && ( geopoints[ 0 ] === geopoints[ geopoints.length - 1 ] ) && geopoints.every( function( geopoint ) {
                    return types.geopoint.validate( geopoint );
                } );
            },
            convert: function( x ) {
                return x.toString().trim();
            }
        },
        'binary': {
            validate: function() {
                return true;
            }
        }
    };

    module.exports = FormModel;
} );

},{"./extend":14,"./plugins":15,"./utils":17,"extended-xpath":9,"jquery":2,"jquery.xpath":6,"merge-xml":3,"openrosa-xpath-extensions":10}],13:[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * @preserve Copyright 2012 Silvio Moreto, Martijn van de Rijdt & Modilabs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function(require, exports, module){
    'use strict';
    var $ = require('jquery');

    /**
     * A Widget class that can be extended to provide some of the basic widget functionality out of the box.
     * pattern: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
     *
     * @constructor
     * @param {Element} element The DOM element the widget is applied on
     * @param {(boolean|{touch: boolean})} options Options passed to the widget during instantiation
     * @param {string} event Not sure, this may not be necessary but the desktopSelectpicker does something with it
     */
    var Widget = function( element, options, event ) {
        this.element = element;
        this.options = options || {};
        // Determining the namespace automatically from the name of the constructor will not work 
        // in conjunction with function renaming by uglify2
        this.namespace = this.namespace || 'somewidget';
        this.options.touch = ( typeof this.options.touch !== 'undefined' ) ? this.options.touch : false;
        this.event = event || null;
    };

    Widget.prototype = {
        /**
         * Destroys (a deeply cloned) widget (inside a repeat)
         * The sole purpose of this function in Enketo is to ensure a widget inside a cloned repeat stays
         * fully functional. The most robust way of doing this is to destroy the copy and then reinitialize it.
         * This is what the repeat controller does. It calls $input.mywidget('destroy') and $input.mywidget({}) in succession.
         * In some rare cases, this may simply be an empty function (e.g. see note widget).
         *
         * @param  {Element} element The element the widget is applied on. Note that if element was clone this.element applies to the origin.
         */
        destroy: function( element ) {
            $( element )
                //data is not used elsewhere by enketo
                .removeData( this.namespace )
                //remove all the event handlers that used this.namespace as the namespace
                .off( '.' + this.namespace )
                //show the original element
                .show()
                //remove elements immediately after the target that have the widget class
                .next( '.widget' ).remove();
            //console.debug( this.namespace, 'destroy' );
        },
        /**
         * Do whatever necessary to ensure that the widget does not allow user input if its parent branch is disabled.
         * Most of the times this branch can remain empty.
         * Check with $('.or-branch').show() whether input is disabled in a disabled branch.
         */
        disable: function() {
            //console.debug( this.namespace, 'disable' );
        },
        /**
         * Does whatever necessary to enable the widget if its parent branch is enabled.
         * Most of the times this function can remain empty.
         */
        enable: function() {
            //console.debug( this.namespace, 'enable' );
        },
        /**
         * Updates languages and <option>s (cascading selects.
         * Most of the times this function can remain empty
         */
        update: function() {
            //console.debug( this.namespace, 'update' );
        }

    };

    module.exports = Widget;
} );

},{"jquery":2}],14:[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
//extend native objects, aka monkey patching ..... really I see no harm!

define( function( window ) {
    /**
     * Pads a string with prefixed zeros until the requested string length is achieved.
     * @param  {number} digits [description]
     * @return {String|string}        [description]
     */
    String.prototype.pad = function( digits ) {
        var x = this;
        while ( x.length < digits ) {
            x = '0' + x;
        }
        return x;
    };

    /**
     * Converts a native Date UTC String to a RFC 3339-compliant date string with local offsets
     * used in JavaRosa, so it replaces the Z in the ISOstring with a local offset
     * @return {string} a datetime string formatted according to RC3339 with local offset
     */
    Date.prototype.toISOLocalString = function() {
        //2012-09-05T12:57:00.000-04:00 (ODK)
        var offset = {},
            pad2 = function( x ) {
                return ( x < 10 ) ? '0' + x : x;
            };

        if ( this.toString() === 'Invalid Date' ) {
            return this.toString();
        }

        offset.minstotal = this.getTimezoneOffset();
        offset.direction = ( offset.minstotal < 0 ) ? '+' : '-';
        offset.hrspart = pad2( Math.abs( Math.floor( offset.minstotal / 60 ) ) );
        offset.minspart = pad2( Math.abs( Math.floor( offset.minstotal % 60 ) ) );

        return new Date( this.getTime() - ( offset.minstotal * 60 * 1000 ) ).toISOString()
            .replace( 'Z', offset.direction + offset.hrspart + ':' + offset.minspart );
    };
} );

},{}],15:[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
define( function(require, exports, module){
    'use strict';
    var $ = require('jquery');

    /**
     * Clears form input fields and triggers events when doing this. If formelement is cloned but not yet added to DOM
     * (and not synchronized with data object), the desired event is probably 'edit' (default). If it is already added
     * to the DOM (and synchronized with data object) a regular change event should be fired
     *
     * @param  {string=} ev event to be triggered when a value is cleared
     * @return { jQuery} [description]
     */
    $.fn.clearInputs = function( ev ) {
        ev = ev || 'edit';
        return this.each( function() {
            //remove media previews
            $( this ).find( '.file-preview' ).remove();
            //remove input values
            $( this ).find( 'input, select, textarea' ).not( '.ignore' ).each( function() {
                var $node = $( this ),
                    type = $node.attr( 'type' );
                if ( $node.prop( 'nodeName' ).toUpperCase() === 'SELECT' ) {
                    type = 'select';
                }
                if ( $node.prop( 'nodeName' ).toUpperCase() === 'TEXTAREA' ) {
                    type = 'textarea';
                }
                switch ( type ) {
                    case 'date':
                    case 'datetime':
                    case 'time':
                    case 'number':
                    case 'search':
                    case 'color':
                    case 'range':
                    case 'url':
                    case 'email':
                    case 'password':
                    case 'text':
                    case 'file':
                        $node.removeAttr( 'data-previous-file-name data-loaded-file-name' );
                        /* falls through */
                    case 'hidden':
                    case 'textarea':
                        if ( $node.val() !== '' ) {
                            $node.val( '' ).trigger( ev );
                        }
                        break;
                    case 'radio':
                    case 'checkbox':
                        if ( $node.prop( 'checked' ) ) {
                            $node.prop( 'checked', false );
                            $node.trigger( ev );
                        }
                        break;
                    case 'select':
                        if ( $node[ 0 ].selectedIndex >= 0 ) {
                            $node[ 0 ].selectedIndex = -1;
                            $node.trigger( ev );
                        }
                        break;
                    default:
                        console.error( 'Unrecognized input type found when trying to reset', this );
                }
            } );
        } );
    };

    /**
     * Supports a small subset of MarkDown and converts this to HTML: _, __, *, **, []()
     * Also converts newline characters
     *
     * Not supported: escaping and other MarkDown syntax
     */
    $.fn.markdownToHtml = function() {
        return this.each( function() {
            var html,
                $childStore = $( '<div/>' );
            $( this ).children( ':not(input, select, textarea)' ).each( function( index ) {
                var name = '$$$' + index;
                $( this ).clone().markdownToHtml().appendTo( $childStore );
                $( this ).replaceWith( name );
            } );
            html = $( this ).html();
            html = html.replace( /__([^\s][^_]*[^\s])__/gm, '<strong>$1</strong>' );
            html = html.replace( /\*\*([^\s][^\*]*[^\s])\*\*/gm, '<strong>$1</strong>' );
            html = html.replace( /_([^\s][^_]*[^\s])_/gm, '<em>$1</em>' );
            html = html.replace( /\*([^\s][^\*]*[^\s])\*/gm, '<em>$1</em>' );
            //only replaces if url is valid (worthwhile feature?)
            //html = html.replace( /\[(.*)\]\(((https?:\/\/)(([\da-z\.\-]+)\.([a-z\.]{2,6})|(([0-9]{1,3}\.){3}[0-9]{1,3}))([\/\w \.\-]*)*\/?[\/\w \.\-\=\&\?]*)\)/gm, '<a href="$2">$1</a>' );
            html = html.replace( /\[([^\]]*)\]\(([^\)]+)\)/gm, '<a href="$2" target="_blank">$1</a>' );
            html = html.replace( /\n/gm, '<br />' );
            $childStore.children().each( function( i ) {
                var regex = new RegExp( '\\$\\$\\$' + i );
                html = html.replace( regex, $( this )[ 0 ].outerHTML );
            } );
            $( this ).text( '' ).append( html );
        } );
    };

    /**
     * Reverses a jQuery collection
     * @type {Array}
     */
    $.fn.reverse = [].reverse;

} );

},{"jquery":2}],16:[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * Detects features. Replacement for Modernizr.
 */

define( function(require, exports, module){
    'use strict';
    var features = {
            inputtypes: {}
        },
        inputTypesToTest = [ 'date', 'datetime', 'time' ];

    // test input types
    inputTypesToTest.forEach( function( inputType ) {
        var input = document.createElement( 'input' );
        input.setAttribute( 'type', inputType );
        features.inputtypes[ inputType ] = input.type !== 'text';
    } );

    // test touchscreen presence
    if ( ( 'ontouchstart' in window ) || window.DocumentTouch && document instanceof DocumentTouch ) {
        features.touch = true;
        document.documentElement.classList += ' ' + 'touch';
    } else {
        features.touch = false;
    }

    module.exports = features;
} );

},{}],17:[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
define( function(require, exports, module){
    'use strict';

    /**
     * Parses an Expression to extract a function call and its parameter content as a string.
     *
     * @param  {String} expr The expression to search
     * @param  {String} func The function name to search for
     * @return {<String, String>} The result array, where each result is an array containing the function call and the parameter content.
     */
    function parseFunctionFromExpression( expr, func ) {
        var index, result, openBrackets, start,
            findFunc = new RegExp( func + '\\s*\\(', 'g' ),
            results = [];

        if ( !expr || !func ) {
            return results;
        }

        while ( ( result = findFunc.exec( expr ) ) !== null ) {
            openBrackets = 1;
            start = result.index;
            index = findFunc.lastIndex;
            while ( openBrackets !== 0 ) {
                index++;
                if ( expr[ index ] === '(' ) {
                    openBrackets++;
                } else if ( expr[ index ] === ')' ) {
                    openBrackets--;
                }
            }
            // add [ 'function(a,b)', 'a,b' ] to result array
            results.push( [ expr.substring( start, index + 1 ), expr.substring( findFunc.lastIndex, index ).trim() ] );
        }

        return results;
    }

    module.exports = {
        parseFunctionFromExpression: parseFunctionFromExpression
    };
} );

},{}],18:[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
define( function(require, exports, module){
    'use strict';
    var config = require('text!enketo-config');
    var support = require('./support');
    var Q = require('q');
    var $ = require('jquery');

    var $form, init, enable, disable, destroy,
        _getWidgetConfigs, _getElements, _instantiate, _load, _setLangChangeHandler, _setOptionChangeHandler,
        widgets = [];

    /**
     * Initializes widgets
     *
     * @param  {jQuery} $group The element inside which the widgets have to be initialized.
     */

    init = function( $group ) {
        $form = $( 'form.or' );
        $group = $group || $form;

        _getWidgetConfigs( config )
            .then( function( widgets ) {
                widgets.forEach( function( widget ) {
                    _instantiate( widget, $group );
                } );
            } );
    };

    /**
     * Enables widgets if they weren't enabled already when the branch was enabled by the controller.
     * In most widgets, this function will do nothing because the disabled attribute was automatically removed from all
     * fieldsets, inputs, textareas and selects inside the branch element provided as parameter.
     * Note that this function can be called before the widgets have been initialized and will in that case do nothing. This is
     * actually preferable than waiting for create() to complete, because enable() will never do anything that isn't
     * done during create().
     *
     * @param  {jQuery} $group [description]
     */
    enable = function( $group ) {
        var widget, $els;

        for ( var i = 0; i < widgets.length; i++ ) {
            widget = widgets[ i ];
            if ( widget.name ) {
                $els = _getElements( $group, widget.selector );
                $els[ widget.name ]( 'enable' );
            }
        }
    };

    /**
     * Disables  widgets, if they aren't disabled already when the branch was disabled by the controller.
     * In most widgets, this function will do nothing because all fieldsets, inputs, textareas and selects will get
     * the disabled attribute automatically when the branch element provided as parameter becomes irrelevant.
     *
     * @param  { jQuery } $group The element inside which all widgets need to be disabled.
     */
    disable = function( $group ) {
        var widget, $els;

        for ( var i = 0; i < widgets.length; i++ ) {

            widget = widgets[ i ];
            if ( widget.name ) {
                $els = _getElements( $group, widget.selector );
                $els[ widget.name ]( 'disable' );
            }
        }
    };

    /**
     * Fixes deeply cloned widgets, if necessary. This function is only called with the repeat clone as a parameter.
     * Many eventhandlers inside widgets get messed up when they are cloned. If so this function will have to fix
     * that. The init function is called programmatically immediately afterwards.
     *
     * @param  {jQuery} $group The element inside which all widgets need to be fixed.
     */
    destroy = function( $group ) {
        var widget, $els;

        for ( var i = 0; i < widgets.length; i++ ) {

            widget = widgets[ i ];
            if ( widget.name ) {
                $els = _getElements( $group, widget.selector );
                $els[ widget.name ]( 'destroy' );
            }
        }
    };

    /**
     * Loads the widget configuration files (asynchronously)
     *
     * @param { {widgets:<string> }} config client configuration object
     * @param  {Function} callback
     */
    _getWidgetConfigs = function( config ) {
        var i, id, widget,
            deferred = Q.defer(),
            widgetConfigFiles = [];

        //add widget configuration to config object and load widget config files
        for ( i = 0; i < config.widgets.length; i++ ) {
            // FIXME here we have to remove the leading `.` from paths because
            // browserify maps them strangely
            id = config.widgets[ i ]
                    .substring(1)
                    .replace( /\/[^\/]*$/, '/config.json' );
            try {
                widget = require( id );
                widget.path = config.widgets[ i ];
                widgets.push( widget );
            } catch( e ) {
                console.log( 'Error loading widget "' + id + '": ' + e );
            }
        }

        deferred.resolve( widgets );

        return deferred.promise;
    };

    /**
     * Returns the elements on which to apply the widget
     *
     * @param  {jQuery} $group   a jQuery-wrapped element
     * @param  {string} selector if the selector is null, the form element will be returned
     * @return {jQuery}          a jQuery collection
     */
    _getElements = function( $group, selector ) {
        return ( selector ) ? ( selector === 'form' ? $form : $group.find( selector ) ) : $();
    };

    /**
     * Instantiate a widget on a group (whole form or newly cloned repeat)
     *
     * @param  widget The widget to instantiate
     * @param  {jQuery} $group The elements inside which widgets need to be created.
     */
    _instantiate = function( widget, $group ) {

        //don't let an error loading one widget affect the others
        try {
            var $elements;
            widget.options = widget.options || {};
            widget.options.touch = support.touch;

            if ( !widget.selector && widget.selector !== null ) {
                return console.error( 'widget configuration has no acceptable selector property', widget );
            }

            $elements = _getElements( $group, widget.selector );

            if ( !$elements.length ) {
                return;
            }

            if ( !widget.load ) {
                widget.load = _load( widget );
            }

            widget.load
                .then( function( widget ) {
                    // if the widget is not a css-only widget
                    if ( widget.name ) {
                        $elements[ widget.name ]( widget.options );
                        _setLangChangeHandler( widget, $elements );
                        _setOptionChangeHandler( widget, $elements );
                    }
                } );
        } catch ( loadingError ) {
            console.log( 'Error loading widget ' + widget.path + ': ' + loadingError );
        }
    };

    /**
     * Loads a widget module.
     *
     * @param  {[type]} widget [description]
     * @return {[type]}        [description]
     */
    _load = function( widget ) {
        var deferred, widgetName;

        deferred = Q.defer();

        // FIXME we have to remove the leading `.` from widget path because
        // browserify maps paths strangely
        widgetName = require( widget.path.substring(1) + '.js' );
        widget.name = widgetName;
        deferred.resolve( widget );

        console.log( 'Loaded widget: ' + widgetName );

        return deferred.promise;
    };

    /**
     * Calls widget('update') when the language changes. This function is called upon initialization,
     * and whenever a new repeat is created. In the latter case, since the widget('update') is called upon
     * the elements of the repeat, there should be no duplicate eventhandlers.
     *
     * @param {{name: string}} widget The widget configuration object
     * @param {jQuery}         $els   The jQuery collection of elements that the widget has been instantiated on.
     */
    _setLangChangeHandler = function( widget, $els ) {
        // call update for all widgets when language changes 
        if ( $els.length > 0 ) {
            $form.on( 'changelanguage', function() {
                $els[ widget.name ]( 'update' );
            } );
        }
    };

    /**
     * Calls widget('update') on select-type widgets when the options change.This function is called upon initialization,
     * and whenever a new repeat is created. In the latter case, since the widget('update') is called upon
     * the elements of the repeat, there should be no duplicate eventhandlers.
     *
     * @param {{name: string}} widget The widget configuration object
     * @param {jQuery}         $els   The jQuery collection of elements that the widget has been instantiated on.
     */

    _setOptionChangeHandler = function( widget, $els ) {
        if ( $els.length > 0 && $els.prop( 'nodeName' ).toLowerCase() === 'select' ) {
            $form.on( 'changeoption', 'select', function() {
                // update (itemselect) picker on which event was triggered because the options changed
                $( this )[ widget.name ]( 'update' );
            } );
        }
    };

    module.exports = {
        init: init,
        enable: enable,
        disable: disable,
        destroy: destroy
    };

} );

},{"./support":16,"jquery":2,"q":4,"text!enketo-config":1}],19:[function(require,module,exports){
/*!
 * Timepicker Component for Twitter Bootstrap
 *
 * Copyright 2013 Joris de Wit
 *
 * Contributors https://github.com/jdewit/bootstrap-timepicker/graphs/contributors
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
(function($, window, document, undefined) {
  'use strict';

  // TIMEPICKER PUBLIC CLASS DEFINITION
  var Timepicker = function(element, options) {
    this.widget = '';
    this.$element = $(element);
    this.defaultTime = options.defaultTime;
    this.disableFocus = options.disableFocus;
    this.disableMousewheel = options.disableMousewheel;
    this.isOpen = options.isOpen;
    this.minuteStep = options.minuteStep;
    this.modalBackdrop = options.modalBackdrop;
    this.orientation = options.orientation;
    this.secondStep = options.secondStep;
    this.showInputs = options.showInputs;
    this.showMeridian = options.showMeridian;
    this.showSeconds = options.showSeconds;
    this.template = options.template;
    this.appendWidgetTo = options.appendWidgetTo;
    this.showWidgetOnAddonClick = options.showWidgetOnAddonClick;

    this._init();
  };

  Timepicker.prototype = {

    constructor: Timepicker,
    _init: function() {
      var self = this;

      if (this.showWidgetOnAddonClick && (this.$element.parent().hasClass('input-group') || this.$element.parent().hasClass('input-prepend'))) {
        this.$element.parent('.input-group, .input-prepend').find('.input-group-addon').on({
          'click.timepicker': $.proxy(this.showWidget, this)
        });
        this.$element.on({
          'focus.timepicker': $.proxy(this.highlightUnit, this),
          'click.timepicker': $.proxy(this.highlightUnit, this),
          'keydown.timepicker': $.proxy(this.elementKeydown, this),
          'blur.timepicker': $.proxy(this.blurElement, this),
          'mousewheel.timepicker DOMMouseScroll.timepicker': $.proxy(this.mousewheel, this)
        });
      } else {
        if (this.template) {
          this.$element.on({
            'focus.timepicker': $.proxy(this.showWidget, this),
            'click.timepicker': $.proxy(this.showWidget, this),
            'blur.timepicker': $.proxy(this.blurElement, this),
            'mousewheel.timepicker DOMMouseScroll.timepicker': $.proxy(this.mousewheel, this)
          });
        } else {
          this.$element.on({
            'focus.timepicker': $.proxy(this.highlightUnit, this),
            'click.timepicker': $.proxy(this.highlightUnit, this),
            'keydown.timepicker': $.proxy(this.elementKeydown, this),
            'blur.timepicker': $.proxy(this.blurElement, this),
            'mousewheel.timepicker DOMMouseScroll.timepicker': $.proxy(this.mousewheel, this)
          });
        }
      }

      if (this.template !== false) {
        this.$widget = $(this.getTemplate()).on('click', $.proxy(this.widgetClick, this));
      } else {
        this.$widget = false;
      }

      if (this.showInputs && this.$widget !== false) {
        this.$widget.find('input').each(function() {
          $(this).on({
            'click.timepicker': function() { $(this).select(); },
            'keydown.timepicker': $.proxy(self.widgetKeydown, self),
            'keyup.timepicker': $.proxy(self.widgetKeyup, self)
          });
        });
      }

      this.setDefaultTime(this.defaultTime);
    },

    blurElement: function() {
      this.highlightedUnit = null;
      this.updateFromElementVal();
    },

    clear: function() {
      this.hour = '';
      this.minute = '';
      this.second = '';
      this.meridian = '';

      this.$element.val('');
    },

    decrementHour: function() {
      if (this.showMeridian) {
        if (this.hour === 1) {
          this.hour = 12;
        } else if (this.hour === 12) {
          this.hour--;

          return this.toggleMeridian();
        } else if (this.hour === 0) {
          this.hour = 11;

          return this.toggleMeridian();
        } else {
          this.hour--;
        }
      } else {
        if (this.hour <= 0) {
          this.hour = 23;
        } else {
          this.hour--;
        }
      }
    },

    decrementMinute: function(step) {
      var newVal;

      if (step) {
        newVal = this.minute - step;
      } else {
        newVal = this.minute - this.minuteStep;
      }

      if (newVal < 0) {
        this.decrementHour();
        this.minute = newVal + 60;
      } else {
        this.minute = newVal;
      }
    },

    decrementSecond: function() {
      var newVal = this.second - this.secondStep;

      if (newVal < 0) {
        this.decrementMinute(true);
        this.second = newVal + 60;
      } else {
        this.second = newVal;
      }
    },

    elementKeydown: function(e) {
      switch (e.keyCode) {
      case 9: //tab
      case 27: // escape
        this.updateFromElementVal();
        break;
      case 37: // left arrow
        e.preventDefault();
        this.highlightPrevUnit();
        break;
      case 38: // up arrow
        e.preventDefault();
        switch (this.highlightedUnit) {
        case 'hour':
          this.incrementHour();
          this.highlightHour();
          break;
        case 'minute':
          this.incrementMinute();
          this.highlightMinute();
          break;
        case 'second':
          this.incrementSecond();
          this.highlightSecond();
          break;
        case 'meridian':
          this.toggleMeridian();
          this.highlightMeridian();
          break;
        }
        this.update();
        break;
      case 39: // right arrow
        e.preventDefault();
        this.highlightNextUnit();
        break;
      case 40: // down arrow
        e.preventDefault();
        switch (this.highlightedUnit) {
        case 'hour':
          this.decrementHour();
          this.highlightHour();
          break;
        case 'minute':
          this.decrementMinute();
          this.highlightMinute();
          break;
        case 'second':
          this.decrementSecond();
          this.highlightSecond();
          break;
        case 'meridian':
          this.toggleMeridian();
          this.highlightMeridian();
          break;
        }

        this.update();
        break;
      }
    },

    getCursorPosition: function() {
      var input = this.$element.get(0);

      if ('selectionStart' in input) {// Standard-compliant browsers

        return input.selectionStart;
      } else if (document.selection) {// IE fix
        input.focus();
        var sel = document.selection.createRange(),
          selLen = document.selection.createRange().text.length;

        sel.moveStart('character', - input.value.length);

        return sel.text.length - selLen;
      }
    },

    getTemplate: function() {
      var template,
        hourTemplate,
        minuteTemplate,
        secondTemplate,
        meridianTemplate,
        templateContent;

      if (this.showInputs) {
        hourTemplate = '<input type="text" data-name="hour" class="bootstrap-timepicker-hour form-control" maxlength="2"/>';
        minuteTemplate = '<input type="text" data-name="minute" class="bootstrap-timepicker-minute form-control" maxlength="2"/>';
        secondTemplate = '<input type="text" data-name="second" class="bootstrap-timepicker-second form-control" maxlength="2"/>';
        meridianTemplate = '<input type="text" data-name="meridian" class="bootstrap-timepicker-meridian form-control" maxlength="2"/>';
      } else {
        hourTemplate = '<span class="bootstrap-timepicker-hour"></span>';
        minuteTemplate = '<span class="bootstrap-timepicker-minute"></span>';
        secondTemplate = '<span class="bootstrap-timepicker-second"></span>';
        meridianTemplate = '<span class="bootstrap-timepicker-meridian"></span>';
      }

      templateContent = '<table>'+
         '<tr>'+
           '<td><a href="#" data-action="incrementHour"><i class="glyphicon glyphicon-chevron-up"></i></a></td>'+
           '<td class="separator">&nbsp;</td>'+
           '<td><a href="#" data-action="incrementMinute"><i class="glyphicon glyphicon-chevron-up"></i></a></td>'+
           (this.showSeconds ?
             '<td class="separator">&nbsp;</td>'+
             '<td><a href="#" data-action="incrementSecond"><i class="glyphicon glyphicon-chevron-up"></i></a></td>'
           : '') +
           (this.showMeridian ?
             '<td class="separator">&nbsp;</td>'+
             '<td class="meridian-column"><a href="#" data-action="toggleMeridian"><i class="glyphicon glyphicon-chevron-up"></i></a></td>'
           : '') +
         '</tr>'+
         '<tr>'+
           '<td>'+ hourTemplate +'</td> '+
           '<td class="separator">:</td>'+
           '<td>'+ minuteTemplate +'</td> '+
           (this.showSeconds ?
            '<td class="separator">:</td>'+
            '<td>'+ secondTemplate +'</td>'
           : '') +
           (this.showMeridian ?
            '<td class="separator">&nbsp;</td>'+
            '<td>'+ meridianTemplate +'</td>'
           : '') +
         '</tr>'+
         '<tr>'+
           '<td><a href="#" data-action="decrementHour"><i class="glyphicon glyphicon-chevron-down"></i></a></td>'+
           '<td class="separator"></td>'+
           '<td><a href="#" data-action="decrementMinute"><i class="glyphicon glyphicon-chevron-down"></i></a></td>'+
           (this.showSeconds ?
            '<td class="separator">&nbsp;</td>'+
            '<td><a href="#" data-action="decrementSecond"><i class="glyphicon glyphicon-chevron-down"></i></a></td>'
           : '') +
           (this.showMeridian ?
            '<td class="separator">&nbsp;</td>'+
            '<td><a href="#" data-action="toggleMeridian"><i class="glyphicon glyphicon-chevron-down"></i></a></td>'
           : '') +
         '</tr>'+
       '</table>';

      switch(this.template) {
      case 'modal':
        template = '<div class="bootstrap-timepicker-widget modal hide fade in" data-backdrop="'+ (this.modalBackdrop ? 'true' : 'false') +'">'+
          '<div class="modal-header">'+
            '<a href="#" class="close" data-dismiss="modal">×</a>'+
            '<h3>Pick a Time</h3>'+
          '</div>'+
          '<div class="modal-content">'+
            templateContent +
          '</div>'+
          '<div class="modal-footer">'+
            '<a href="#" class="btn btn-primary" data-dismiss="modal">OK</a>'+
          '</div>'+
        '</div>';
        break;
      case 'dropdown':
        template = '<div class="bootstrap-timepicker-widget dropdown-menu">'+ templateContent +'</div>';
        break;
      }

      return template;
    },

    getTime: function() {
      if (this.hour === '') {
        return '';
      }

      return this.hour + ':' + (this.minute.toString().length === 1 ? '0' + this.minute : this.minute) + (this.showSeconds ? ':' + (this.second.toString().length === 1 ? '0' + this.second : this.second) : '') + (this.showMeridian ? ' ' + this.meridian : '');
    },

    hideWidget: function() {
      if (this.isOpen === false) {
        return;
      }

      this.$element.trigger({
        'type': 'hide.timepicker',
        'time': {
          'value': this.getTime(),
          'hours': this.hour,
          'minutes': this.minute,
          'seconds': this.second,
          'meridian': this.meridian
        }
      });

      if (this.template === 'modal' && this.$widget.modal) {
        this.$widget.modal('hide');
      } else {
        this.$widget.removeClass('open');
      }

      $(document).off('mousedown.timepicker, touchend.timepicker');

      this.isOpen = false;
      // show/hide approach taken by datepicker
      this.$widget.detach();
    },

    highlightUnit: function() {
      this.position = this.getCursorPosition();
      if (this.position >= 0 && this.position <= 2) {
        this.highlightHour();
      } else if (this.position >= 3 && this.position <= 5) {
        this.highlightMinute();
      } else if (this.position >= 6 && this.position <= 8) {
        if (this.showSeconds) {
          this.highlightSecond();
        } else {
          this.highlightMeridian();
        }
      } else if (this.position >= 9 && this.position <= 11) {
        this.highlightMeridian();
      }
    },

    highlightNextUnit: function() {
      switch (this.highlightedUnit) {
      case 'hour':
        this.highlightMinute();
        break;
      case 'minute':
        if (this.showSeconds) {
          this.highlightSecond();
        } else if (this.showMeridian){
          this.highlightMeridian();
        } else {
          this.highlightHour();
        }
        break;
      case 'second':
        if (this.showMeridian) {
          this.highlightMeridian();
        } else {
          this.highlightHour();
        }
        break;
      case 'meridian':
        this.highlightHour();
        break;
      }
    },

    highlightPrevUnit: function() {
      switch (this.highlightedUnit) {
      case 'hour':
        if(this.showMeridian){
          this.highlightMeridian();
        } else if (this.showSeconds) {
          this.highlightSecond();
        } else {
          this.highlightMinute();
        }
        break;
      case 'minute':
        this.highlightHour();
        break;
      case 'second':
        this.highlightMinute();
        break;
      case 'meridian':
        if (this.showSeconds) {
          this.highlightSecond();
        } else {
          this.highlightMinute();
        }
        break;
      }
    },

    highlightHour: function() {
      var $element = this.$element.get(0),
          self = this;

      this.highlightedUnit = 'hour';

			if ($element.setSelectionRange) {
				setTimeout(function() {
          if (self.hour < 10) {
            $element.setSelectionRange(0,1);
          } else {
            $element.setSelectionRange(0,2);
          }
				}, 0);
			}
    },

    highlightMinute: function() {
      var $element = this.$element.get(0),
          self = this;

      this.highlightedUnit = 'minute';

			if ($element.setSelectionRange) {
				setTimeout(function() {
          if (self.hour < 10) {
            $element.setSelectionRange(2,4);
          } else {
            $element.setSelectionRange(3,5);
          }
				}, 0);
			}
    },

    highlightSecond: function() {
      var $element = this.$element.get(0),
          self = this;

      this.highlightedUnit = 'second';

			if ($element.setSelectionRange) {
				setTimeout(function() {
          if (self.hour < 10) {
            $element.setSelectionRange(5,7);
          } else {
            $element.setSelectionRange(6,8);
          }
				}, 0);
			}
    },

    highlightMeridian: function() {
      var $element = this.$element.get(0),
          self = this;

      this.highlightedUnit = 'meridian';

			if ($element.setSelectionRange) {
				if (this.showSeconds) {
					setTimeout(function() {
            if (self.hour < 10) {
              $element.setSelectionRange(8,10);
            } else {
              $element.setSelectionRange(9,11);
            }
					}, 0);
				} else {
					setTimeout(function() {
            if (self.hour < 10) {
              $element.setSelectionRange(5,7);
            } else {
              $element.setSelectionRange(6,8);
            }
					}, 0);
				}
			}
    },

    incrementHour: function() {
      if (this.showMeridian) {
        if (this.hour === 11) {
          this.hour++;
          return this.toggleMeridian();
        } else if (this.hour === 12) {
          this.hour = 0;
        }
      }
      if (this.hour === 23) {
        this.hour = 0;

        return;
      }
      this.hour++;
    },

    incrementMinute: function(step) {
      var newVal;

      if (step) {
        newVal = this.minute + step;
      } else {
        newVal = this.minute + this.minuteStep - (this.minute % this.minuteStep);
      }

      if (newVal > 59) {
        this.incrementHour();
        this.minute = newVal - 60;
      } else {
        this.minute = newVal;
      }
    },

    incrementSecond: function() {
      var newVal = this.second + this.secondStep - (this.second % this.secondStep);

      if (newVal > 59) {
        this.incrementMinute(true);
        this.second = newVal - 60;
      } else {
        this.second = newVal;
      }
    },

    mousewheel: function(e) {
      if (this.disableMousewheel) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      var delta = e.originalEvent.wheelDelta || -e.originalEvent.detail,
          scrollTo = null;

      if (e.type === 'mousewheel') {
        scrollTo = (e.originalEvent.wheelDelta * -1);
      }
      else if (e.type === 'DOMMouseScroll') {
        scrollTo = 40 * e.originalEvent.detail;
      }

      if (scrollTo) {
        e.preventDefault();
        $(this).scrollTop(scrollTo + $(this).scrollTop());
      }

      switch (this.highlightedUnit) {
      case 'minute':
        if (delta > 0) {
          this.incrementMinute();
        } else {
          this.decrementMinute();
        }
        this.highlightMinute();
        break;
      case 'second':
        if (delta > 0) {
          this.incrementSecond();
        } else {
          this.decrementSecond();
        }
        this.highlightSecond();
        break;
      case 'meridian':
        this.toggleMeridian();
        this.highlightMeridian();
        break;
      default:
        if (delta > 0) {
          this.incrementHour();
        } else {
          this.decrementHour();
        }
        this.highlightHour();
        break;
      }

      return false;
    },

    // This method was adapted from bootstrap-datepicker.
    place : function() {
      if (this.isInline) {
        return;
      }
      var widgetWidth = this.$widget.outerWidth(), widgetHeight = this.$widget.outerHeight(), visualPadding = 10, windowWidth =
        $(window).width(), windowHeight = $(window).height(), scrollTop = $(window).scrollTop();

      var zIndex = parseInt(this.$element.parents().filter(function() {}).first().css('z-index'), 10) + 10;
      var offset = this.component ? this.component.parent().offset() : this.$element.offset();
      var height = this.component ? this.component.outerHeight(true) : this.$element.outerHeight(false);
      var width = this.component ? this.component.outerWidth(true) : this.$element.outerWidth(false);
      var left = offset.left, top = offset.top;

      this.$widget.removeClass('timepicker-orient-top timepicker-orient-bottom timepicker-orient-right timepicker-orient-left');

      if (this.orientation.x !== 'auto') {
        this.picker.addClass('datepicker-orient-' + this.orientation.x);
        if (this.orientation.x === 'right') {
          left -= widgetWidth - width;
        }
      } else{
        // auto x orientation is best-placement: if it crosses a window edge, fudge it sideways
        // Default to left
        this.$widget.addClass('timepicker-orient-left');
        if (offset.left < 0) {
          left -= offset.left - visualPadding;
        } else if (offset.left + widgetWidth > windowWidth) {
          left = windowWidth - widgetWidth - visualPadding;
        }
      }
      // auto y orientation is best-situation: top or bottom, no fudging, decision based on which shows more of the widget
      var yorient = this.orientation.y, topOverflow, bottomOverflow;
      if (yorient === 'auto') {
        topOverflow = -scrollTop + offset.top - widgetHeight;
        bottomOverflow = scrollTop + windowHeight - (offset.top + height + widgetHeight);
        if (Math.max(topOverflow, bottomOverflow) === bottomOverflow) {
          yorient = 'top';
        } else {
          yorient = 'bottom';
        }
      }
      this.$widget.addClass('timepicker-orient-' + yorient);
      if (yorient === 'top'){
        top += height;
      } else{
        top -= widgetHeight + parseInt(this.$widget.css('padding-top'), 10);
      }

      this.$widget.css({
        top : top,
        left : left,
        zIndex : zIndex
      });
    },

    remove: function() {
      $('document').off('.timepicker');
      if (this.$widget) {
        this.$widget.remove();
      }
      delete this.$element.data().timepicker;
    },

    setDefaultTime: function(defaultTime) {
      if (!this.$element.val()) {
        if (defaultTime === 'current') {
          var dTime = new Date(),
            hours = dTime.getHours(),
            minutes = dTime.getMinutes(),
            seconds = dTime.getSeconds(),
            meridian = 'AM';

          if (seconds !== 0) {
            seconds = Math.ceil(dTime.getSeconds() / this.secondStep) * this.secondStep;
            if (seconds === 60) {
              minutes += 1;
              seconds = 0;
            }
          }

          if (minutes !== 0) {
            minutes = Math.ceil(dTime.getMinutes() / this.minuteStep) * this.minuteStep;
            if (minutes === 60) {
              hours += 1;
              minutes = 0;
            }
          }

          if (this.showMeridian) {
            if (hours === 0) {
              hours = 12;
            } else if (hours >= 12) {
              if (hours > 12) {
                hours = hours - 12;
              }
              meridian = 'PM';
            } else {
              meridian = 'AM';
            }
          }

          this.hour = hours;
          this.minute = minutes;
          this.second = seconds;
          this.meridian = meridian;

          this.update();

        } else if (defaultTime === false) {
          this.hour = 0;
          this.minute = 0;
          this.second = 0;
          this.meridian = 'AM';
        } else {
          this.setTime(defaultTime);
        }
      } else {
        this.updateFromElementVal();
      }
    },

    setTime: function(time, ignoreWidget) {
      if (!time) {
        this.clear();
        return;
      }

      var timeArray,
          hour,
          minute,
          second,
          meridian;

      if (typeof time === 'object' && time.getMonth){
        // this is a date object
        hour    = time.getHours();
        minute  = time.getMinutes();
        second  = time.getSeconds();

        if (this.showMeridian){
          meridian = 'AM';
          if (hour > 12){
            meridian = 'PM';
            hour = hour % 12;
          }

          if (hour === 12){
            meridian = 'PM';
          }
        }
      } else {
        if (time.match(/p/i) !== null) {
          meridian = 'PM';
        } else {
          meridian = 'AM';
        }

        time = time.replace(/[^0-9\:]/g, '');

        timeArray = time.split(':');

        hour = timeArray[0] ? timeArray[0].toString() : timeArray.toString();
        minute = timeArray[1] ? timeArray[1].toString() : '';
        second = timeArray[2] ? timeArray[2].toString() : '';

        // idiot proofing
        if (hour.length > 4) {
          second = hour.substr(4, 2);
        }
        if (hour.length > 2) {
          minute = hour.substr(2, 2);
          hour = hour.substr(0, 2);
        }
        if (minute.length > 2) {
          second = minute.substr(2, 2);
          minute = minute.substr(0, 2);
        }
        if (second.length > 2) {
          second = second.substr(2, 2);
        }

        hour = parseInt(hour, 10);
        minute = parseInt(minute, 10);
        second = parseInt(second, 10);

        if (isNaN(hour)) {
          hour = 0;
        }
        if (isNaN(minute)) {
          minute = 0;
        }
        if (isNaN(second)) {
          second = 0;
        }

        if (this.showMeridian) {
          if (hour < 1) {
            hour = 1;
          } else if (hour > 12) {
            hour = 12;
          }
        } else {
          if (hour >= 24) {
            hour = 23;
          } else if (hour < 0) {
            hour = 0;
          }
          if (hour < 13 && meridian === 'PM') {
            hour = hour + 12;
          }
        }

        if (minute < 0) {
          minute = 0;
        } else if (minute >= 60) {
          minute = 59;
        }

        if (this.showSeconds) {
          if (isNaN(second)) {
            second = 0;
          } else if (second < 0) {
            second = 0;
          } else if (second >= 60) {
            second = 59;
          }
        }
      }

      this.hour = hour;
      this.minute = minute;
      this.second = second;
      this.meridian = meridian;

      this.update(ignoreWidget);
    },

    showWidget: function() {
      if (this.isOpen) {
        return;
      }

      if (this.$element.is(':disabled')) {
        return;
      }

      // show/hide approach taken by datepicker
      this.$widget.appendTo(this.appendWidgetTo);
      var self = this;
      $(document).on('mousedown.timepicker, touchend.timepicker', function (e) {
        // This condition was inspired by bootstrap-datepicker.
        // The element the timepicker is invoked on is the input but it has a sibling for addon/button.
        if (!(self.$element.parent().find(e.target).length ||
            self.$widget.is(e.target) ||
            self.$widget.find(e.target).length)) {
          self.hideWidget();
        }
      });

      this.$element.trigger({
        'type': 'show.timepicker',
        'time': {
          'value': this.getTime(),
          'hours': this.hour,
          'minutes': this.minute,
          'seconds': this.second,
          'meridian': this.meridian
        }
      });

      this.place();
      if (this.disableFocus) {
        this.$element.blur();
      }

      // widget shouldn't be empty on open
      if (this.hour === '') {
        if (this.defaultTime) {
          this.setDefaultTime(this.defaultTime);
        } else {
          this.setTime('0:0:0');
        }
      }

      if (this.template === 'modal' && this.$widget.modal) {
        this.$widget.modal('show').on('hidden', $.proxy(this.hideWidget, this));
      } else {
        if (this.isOpen === false) {
          this.$widget.addClass('open');
        }
      }

      this.isOpen = true;
    },

    toggleMeridian: function() {
      this.meridian = this.meridian === 'AM' ? 'PM' : 'AM';
    },

    update: function(ignoreWidget) {
      this.updateElement();
      if (!ignoreWidget) {
        this.updateWidget();
      }

      this.$element.trigger({
        'type': 'changeTime.timepicker',
        'time': {
          'value': this.getTime(),
          'hours': this.hour,
          'minutes': this.minute,
          'seconds': this.second,
          'meridian': this.meridian
        }
      });
    },

    updateElement: function() {
      this.$element.val(this.getTime()).change();
    },

    updateFromElementVal: function() {
      this.setTime(this.$element.val());
    },

    updateWidget: function() {
      if (this.$widget === false) {
        return;
      }

      var hour = this.hour,
          minute = this.minute.toString().length === 1 ? '0' + this.minute : this.minute,
          second = this.second.toString().length === 1 ? '0' + this.second : this.second;

      if (this.showInputs) {
        this.$widget.find('input.bootstrap-timepicker-hour').val(hour);
        this.$widget.find('input.bootstrap-timepicker-minute').val(minute);

        if (this.showSeconds) {
          this.$widget.find('input.bootstrap-timepicker-second').val(second);
        }
        if (this.showMeridian) {
          this.$widget.find('input.bootstrap-timepicker-meridian').val(this.meridian);
        }
      } else {
        this.$widget.find('span.bootstrap-timepicker-hour').text(hour);
        this.$widget.find('span.bootstrap-timepicker-minute').text(minute);

        if (this.showSeconds) {
          this.$widget.find('span.bootstrap-timepicker-second').text(second);
        }
        if (this.showMeridian) {
          this.$widget.find('span.bootstrap-timepicker-meridian').text(this.meridian);
        }
      }
    },

    updateFromWidgetInputs: function() {
      if (this.$widget === false) {
        return;
      }

      var t = this.$widget.find('input.bootstrap-timepicker-hour').val() + ':' +
              this.$widget.find('input.bootstrap-timepicker-minute').val() +
              (this.showSeconds ? ':' + this.$widget.find('input.bootstrap-timepicker-second').val() : '') +
              (this.showMeridian ? this.$widget.find('input.bootstrap-timepicker-meridian').val() : '')
      ;

      this.setTime(t, true);
    },

    widgetClick: function(e) {
      e.stopPropagation();
      e.preventDefault();

      var $input = $(e.target),
          action = $input.closest('a').data('action');

      if (action) {
        this[action]();
      }
      this.update();

      if ($input.is('input')) {
        $input.get(0).setSelectionRange(0,2);
      }
    },

    widgetKeydown: function(e) {
      var $input = $(e.target),
          name = $input.data('name');

      switch (e.keyCode) {
      case 9: //tab
        if ((this.showMeridian && name === 'meridian') || (this.showSeconds && name === 'second') || (!this.showMeridian && !this.showSeconds && name === 'minute')) {
          return this.hideWidget();
        }
        break;
      case 27: // escape
        this.hideWidget();
        break;
      case 38: // up arrow
        e.preventDefault();
        switch (name) {
        case 'hour':
          this.incrementHour();
          break;
        case 'minute':
          this.incrementMinute();
          break;
        case 'second':
          this.incrementSecond();
          break;
        case 'meridian':
          this.toggleMeridian();
          break;
        }
        this.setTime(this.getTime());
        $input.get(0).setSelectionRange(0,2);
        break;
      case 40: // down arrow
        e.preventDefault();
        switch (name) {
        case 'hour':
          this.decrementHour();
          break;
        case 'minute':
          this.decrementMinute();
          break;
        case 'second':
          this.decrementSecond();
          break;
        case 'meridian':
          this.toggleMeridian();
          break;
        }
        this.setTime(this.getTime());
        $input.get(0).setSelectionRange(0,2);
        break;
      }
    },

    widgetKeyup: function(e) {
      if ((e.keyCode === 65) || (e.keyCode === 77) || (e.keyCode === 80) || (e.keyCode === 46) || (e.keyCode === 8) || (e.keyCode >= 46 && e.keyCode <= 57)) {
        this.updateFromWidgetInputs();
      }
    }
  };

  //TIMEPICKER PLUGIN DEFINITION
  $.fn.timepicker = function(option) {
    var args = Array.apply(null, arguments);
    args.shift();
    return this.each(function() {
      var $this = $(this),
        data = $this.data('timepicker'),
        options = typeof option === 'object' && option;

      if (!data) {
        $this.data('timepicker', (data = new Timepicker(this, $.extend({}, $.fn.timepicker.defaults, options, $(this).data()))));
      }

      if (typeof option === 'string') {
        data[option].apply(data, args);
      }
    });
  };

  $.fn.timepicker.defaults = {
    defaultTime: 'current',
    disableFocus: false,
    disableMousewheel: false,
    isOpen: false,
    minuteStep: 15,
    modalBackdrop: false,
    orientation: { x: 'auto', y: 'auto'},
    secondStep: 15,
    showSeconds: false,
    showInputs: true,
    showMeridian: true,
    template: 'dropdown',
    appendWidgetTo: 'body',
    showWidgetOnAddonClick: true
  };

  $.fn.timepicker.Constructor = Timepicker;

})(jQuery, window, document);

},{}],"/src/widget/date/bootstrap3-datepicker/js/bootstrap-datepicker.js":[function(require,module,exports){
/* =========================================================
 * bootstrap-datepicker.js
 * Repo: https://github.com/eternicode/bootstrap-datepicker/
 * Demo: http://eternicode.github.io/bootstrap-datepicker/
 * Docs: http://bootstrap-datepicker.readthedocs.org/
 * Forked from http://www.eyecon.ro/bootstrap-datepicker
 * =========================================================
 * Started by Stefan Petre; improvements by Andrew Rowls + contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */

(function($, undefined){

	var $window = $(window);

	function UTCDate(){
		return new Date(Date.UTC.apply(Date, arguments));
	}
	function UTCToday(){
		var today = new Date();
		return UTCDate(today.getFullYear(), today.getMonth(), today.getDate());
	}
	function alias(method){
		return function(){
			return this[method].apply(this, arguments);
		};
	}

	var DateArray = (function(){
		var extras = {
			get: function(i){
				return this.slice(i)[0];
			},
			contains: function(d){
				// Array.indexOf is not cross-browser;
				// $.inArray doesn't work with Dates
				var val = d && d.valueOf();
				for (var i=0, l=this.length; i < l; i++)
					if (this[i].valueOf() === val)
						return i;
				return -1;
			},
			remove: function(i){
				this.splice(i,1);
			},
			replace: function(new_array){
				if (!new_array)
					return;
				if (!$.isArray(new_array))
					new_array = [new_array];
				this.clear();
				this.push.apply(this, new_array);
			},
			clear: function(){
				this.length = 0;
			},
			copy: function(){
				var a = new DateArray();
				a.replace(this);
				return a;
			}
		};

		return function(){
			var a = [];
			a.push.apply(a, arguments);
			$.extend(a, extras);
			return a;
		};
	})();


	// Picker object

	var Datepicker = function(element, options){
		this.dates = new DateArray();
		this.viewDate = UTCToday();
		this.focusDate = null;

		this._process_options(options);

		this.element = $(element);
		this.isInline = false;
		this.isInput = this.element.is('input');
		this.component = this.element.is('.date') ? this.element.find('.add-on, .input-group-addon, .btn') : false;
		this.hasInput = this.component && this.element.find('input').length;
		if (this.component && this.component.length === 0)
			this.component = false;

		this.picker = $(DPGlobal.template);
		this._buildEvents();
		this._attachEvents();

		if (this.isInline){
			this.picker.addClass('datepicker-inline').appendTo(this.element);
		}
		else {
			this.picker.addClass('datepicker-dropdown dropdown-menu');
		}

		if (this.o.rtl){
			this.picker.addClass('datepicker-rtl');
		}

		this.viewMode = this.o.startView;

		if (this.o.calendarWeeks)
			this.picker.find('tfoot th.today')
						.attr('colspan', function(i, val){
							return parseInt(val) + 1;
						});

		this._allow_update = false;

		this.setStartDate(this._o.startDate);
		this.setEndDate(this._o.endDate);
		this.setDaysOfWeekDisabled(this.o.daysOfWeekDisabled);

		this.fillDow();
		this.fillMonths();

		this._allow_update = true;

		this.update();
		this.showMode();

		if (this.isInline){
			this.show();
		}
	};

	Datepicker.prototype = {
		constructor: Datepicker,

		_process_options: function(opts){
			// Store raw options for reference
			this._o = $.extend({}, this._o, opts);
			// Processed options
			var o = this.o = $.extend({}, this._o);

			// Check if "de-DE" style date is available, if not language should
			// fallback to 2 letter code eg "de"
			var lang = o.language;
			if (!dates[lang]){
				lang = lang.split('-')[0];
				if (!dates[lang])
					lang = defaults.language;
			}
			o.language = lang;

			switch (o.startView){
				case 2:
				case 'decade':
					o.startView = 2;
					break;
				case 1:
				case 'year':
					o.startView = 1;
					break;
				default:
					o.startView = 0;
			}

			switch (o.minViewMode){
				case 1:
				case 'months':
					o.minViewMode = 1;
					break;
				case 2:
				case 'years':
					o.minViewMode = 2;
					break;
				default:
					o.minViewMode = 0;
			}

			o.startView = Math.max(o.startView, o.minViewMode);

			// true, false, or Number > 0
			if (o.multidate !== true){
				o.multidate = Number(o.multidate) || false;
				if (o.multidate !== false)
					o.multidate = Math.max(0, o.multidate);
				else
					o.multidate = 1;
			}
			o.multidateSeparator = String(o.multidateSeparator);

			o.weekStart %= 7;
			o.weekEnd = ((o.weekStart + 6) % 7);

			var format = DPGlobal.parseFormat(o.format);
			if (o.startDate !== -Infinity){
				if (!!o.startDate){
					if (o.startDate instanceof Date)
						o.startDate = this._local_to_utc(this._zero_time(o.startDate));
					else
						o.startDate = DPGlobal.parseDate(o.startDate, format, o.language);
				}
				else {
					o.startDate = -Infinity;
				}
			}
			if (o.endDate !== Infinity){
				if (!!o.endDate){
					if (o.endDate instanceof Date)
						o.endDate = this._local_to_utc(this._zero_time(o.endDate));
					else
						o.endDate = DPGlobal.parseDate(o.endDate, format, o.language);
				}
				else {
					o.endDate = Infinity;
				}
			}

			o.daysOfWeekDisabled = o.daysOfWeekDisabled||[];
			if (!$.isArray(o.daysOfWeekDisabled))
				o.daysOfWeekDisabled = o.daysOfWeekDisabled.split(/[,\s]*/);
			o.daysOfWeekDisabled = $.map(o.daysOfWeekDisabled, function(d){
				return parseInt(d, 10);
			});

			var plc = String(o.orientation).toLowerCase().split(/\s+/g),
				_plc = o.orientation.toLowerCase();
			plc = $.grep(plc, function(word){
				return (/^auto|left|right|top|bottom$/).test(word);
			});
			o.orientation = {x: 'auto', y: 'auto'};
			if (!_plc || _plc === 'auto')
				; // no action
			else if (plc.length === 1){
				switch (plc[0]){
					case 'top':
					case 'bottom':
						o.orientation.y = plc[0];
						break;
					case 'left':
					case 'right':
						o.orientation.x = plc[0];
						break;
				}
			}
			else {
				_plc = $.grep(plc, function(word){
					return (/^left|right$/).test(word);
				});
				o.orientation.x = _plc[0] || 'auto';

				_plc = $.grep(plc, function(word){
					return (/^top|bottom$/).test(word);
				});
				o.orientation.y = _plc[0] || 'auto';
			}
		},
		_events: [],
		_secondaryEvents: [],
		_applyEvents: function(evs){
			for (var i=0, el, ch, ev; i < evs.length; i++){
				el = evs[i][0];
				if (evs[i].length === 2){
					ch = undefined;
					ev = evs[i][1];
				}
				else if (evs[i].length === 3){
					ch = evs[i][1];
					ev = evs[i][2];
				}
				el.on(ev, ch);
			}
		},
		_unapplyEvents: function(evs){
			for (var i=0, el, ev, ch; i < evs.length; i++){
				el = evs[i][0];
				if (evs[i].length === 2){
					ch = undefined;
					ev = evs[i][1];
				}
				else if (evs[i].length === 3){
					ch = evs[i][1];
					ev = evs[i][2];
				}
				el.off(ev, ch);
			}
		},
		_buildEvents: function(){
			if (this.isInput){ // single input
				this._events = [
					[this.element, {
						focus: $.proxy(this.show, this),
						keyup: $.proxy(function(e){
							if ($.inArray(e.keyCode, [27,37,39,38,40,32,13,9]) === -1)
								this.update();
						}, this),
						keydown: $.proxy(this.keydown, this)
					}]
				];
			}
			else if (this.component && this.hasInput){ // component: input + button
				this._events = [
					// For components that are not readonly, allow keyboard nav
					[this.element.find('input'), {
						focus: $.proxy(this.show, this),
						keyup: $.proxy(function(e){
							if ($.inArray(e.keyCode, [27,37,39,38,40,32,13,9]) === -1)
								this.update();
						}, this),
						keydown: $.proxy(this.keydown, this)
					}],
					[this.component, {
						click: $.proxy(this.show, this)
					}]
				];
			}
			else if (this.element.is('div')){  // inline datepicker
				this.isInline = true;
			}
			else {
				this._events = [
					[this.element, {
						click: $.proxy(this.show, this)
					}]
				];
			}
			this._events.push(
				// Component: listen for blur on element descendants
				[this.element, '*', {
					blur: $.proxy(function(e){
						this._focused_from = e.target;
					}, this)
				}],
				// Input: listen for blur on element
				[this.element, {
					blur: $.proxy(function(e){
						this._focused_from = e.target;
					}, this)
				}]
			);

			this._secondaryEvents = [
				[this.picker, {
					click: $.proxy(this.click, this)
				}],
				[$(window), {
					resize: $.proxy(this.place, this)
				}],
				[$(document), {
					'mousedown touchstart': $.proxy(function(e){
						// Clicked outside the datepicker, hide it
						if (!(
							this.element.is(e.target) ||
							this.element.find(e.target).length ||
							this.picker.is(e.target) ||
							this.picker.find(e.target).length
						)){
							this.hide();
						}
					}, this)
				}]
			];
		},
		_attachEvents: function(){
			this._detachEvents();
			this._applyEvents(this._events);
		},
		_detachEvents: function(){
			this._unapplyEvents(this._events);
		},
		_attachSecondaryEvents: function(){
			this._detachSecondaryEvents();
			this._applyEvents(this._secondaryEvents);
		},
		_detachSecondaryEvents: function(){
			this._unapplyEvents(this._secondaryEvents);
		},
		_trigger: function(event, altdate){
			var date = altdate || this.dates.get(-1),
				local_date = this._utc_to_local(date);

			this.element.trigger({
				type: event,
				date: local_date,
				dates: $.map(this.dates, this._utc_to_local),
				format: $.proxy(function(ix, format){
					if (arguments.length === 0){
						ix = this.dates.length - 1;
						format = this.o.format;
					}
					else if (typeof ix === 'string'){
						format = ix;
						ix = this.dates.length - 1;
					}
					format = format || this.o.format;
					var date = this.dates.get(ix);
					return DPGlobal.formatDate(date, format, this.o.language);
				}, this)
			});
		},

		show: function(){
			if (!this.isInline)
				this.picker.appendTo('body');
			this.picker.show();
			this.place();
			this._attachSecondaryEvents();
			this._trigger('show');
		},

		hide: function(){
			if (this.isInline)
				return;
			if (!this.picker.is(':visible'))
				return;
			this.focusDate = null;
			this.picker.hide().detach();
			this._detachSecondaryEvents();
			this.viewMode = this.o.startView;
			this.showMode();

			if (
				this.o.forceParse &&
				(
					this.isInput && this.element.val() ||
					this.hasInput && this.element.find('input').val()
				)
			)
				this.setValue();
			this._trigger('hide');
		},

		remove: function(){
			this.hide();
			this._detachEvents();
			this._detachSecondaryEvents();
			this.picker.remove();
			delete this.element.data().datepicker;
			if (!this.isInput){
				delete this.element.data().date;
			}
		},

		_utc_to_local: function(utc){
			return utc && new Date(utc.getTime() + (utc.getTimezoneOffset()*60000));
		},
		_local_to_utc: function(local){
			return local && new Date(local.getTime() - (local.getTimezoneOffset()*60000));
		},
		_zero_time: function(local){
			return local && new Date(local.getFullYear(), local.getMonth(), local.getDate());
		},
		_zero_utc_time: function(utc){
			return utc && new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
		},

		getDates: function(){
			return $.map(this.dates, this._utc_to_local);
		},

		getUTCDates: function(){
			return $.map(this.dates, function(d){
				return new Date(d);
			});
		},

		getDate: function(){
			return this._utc_to_local(this.getUTCDate());
		},

		getUTCDate: function(){
			return new Date(this.dates.get(-1));
		},

		setDates: function(){
			var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
			this.update.apply(this, args);
			this._trigger('changeDate');
			this.setValue();
		},

		setUTCDates: function(){
			var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
			this.update.apply(this, $.map(args, this._utc_to_local));
			this._trigger('changeDate');
			this.setValue();
		},

		setDate: alias('setDates'),
		setUTCDate: alias('setUTCDates'),

		setValue: function(){
			var formatted = this.getFormattedDate();
			if (!this.isInput){
				if (this.component){
					this.element.find('input').val(formatted).change();
				}
			}
			else {
				this.element.val(formatted).change();
			}
		},

		getFormattedDate: function(format){
			if (format === undefined)
				format = this.o.format;

			var lang = this.o.language;
			return $.map(this.dates, function(d){
				return DPGlobal.formatDate(d, format, lang);
			}).join(this.o.multidateSeparator);
		},

		setStartDate: function(startDate){
			this._process_options({startDate: startDate});
			this.update();
			this.updateNavArrows();
		},

		setEndDate: function(endDate){
			this._process_options({endDate: endDate});
			this.update();
			this.updateNavArrows();
		},

		setDaysOfWeekDisabled: function(daysOfWeekDisabled){
			this._process_options({daysOfWeekDisabled: daysOfWeekDisabled});
			this.update();
			this.updateNavArrows();
		},

		place: function(){
			if (this.isInline)
				return;
			var calendarWidth = this.picker.outerWidth(),
				calendarHeight = this.picker.outerHeight(),
				visualPadding = 10,
				windowWidth = $window.width(),
				windowHeight = $window.height(),
				scrollTop = $window.scrollTop();

			var zIndex = parseInt(this.element.parents().filter(function(){
					return $(this).css('z-index') !== 'auto';
				}).first().css('z-index'))+10;
			var offset = this.component ? this.component.parent().offset() : this.element.offset();
			var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
			var width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
			var left = offset.left,
				top = offset.top;

			this.picker.removeClass(
				'datepicker-orient-top datepicker-orient-bottom '+
				'datepicker-orient-right datepicker-orient-left'
			);

			if (this.o.orientation.x !== 'auto'){
				this.picker.addClass('datepicker-orient-' + this.o.orientation.x);
				if (this.o.orientation.x === 'right')
					left -= calendarWidth - width;
			}
			// auto x orientation is best-placement: if it crosses a window
			// edge, fudge it sideways
			else {
				// Default to left
				this.picker.addClass('datepicker-orient-left');
				if (offset.left < 0)
					left -= offset.left - visualPadding;
				else if (offset.left + calendarWidth > windowWidth)
					left = windowWidth - calendarWidth - visualPadding;
			}

			// auto y orientation is best-situation: top or bottom, no fudging,
			// decision based on which shows more of the calendar
			var yorient = this.o.orientation.y,
				top_overflow, bottom_overflow;
			if (yorient === 'auto'){
				top_overflow = -scrollTop + offset.top - calendarHeight;
				bottom_overflow = scrollTop + windowHeight - (offset.top + height + calendarHeight);
				if (Math.max(top_overflow, bottom_overflow) === bottom_overflow)
					yorient = 'top';
				else
					yorient = 'bottom';
			}
			this.picker.addClass('datepicker-orient-' + yorient);
			if (yorient === 'top')
				top += height;
			else
				top -= calendarHeight + parseInt(this.picker.css('padding-top'));

			this.picker.css({
				top: top,
				left: left,
				zIndex: zIndex
			});
		},

		_allow_update: true,
		update: function(){
			if (!this._allow_update)
				return;

			var oldDates = this.dates.copy(),
				dates = [],
				fromArgs = false;
			if (arguments.length){
				$.each(arguments, $.proxy(function(i, date){
					if (date instanceof Date)
						date = this._local_to_utc(date);
					dates.push(date);
				}, this));
				fromArgs = true;
			}
			else {
				dates = this.isInput
						? this.element.val()
						: this.element.data('date') || this.element.find('input').val();
				if (dates && this.o.multidate)
					dates = dates.split(this.o.multidateSeparator);
				else
					dates = [dates];
				delete this.element.data().date;
			}

			dates = $.map(dates, $.proxy(function(date){
				return DPGlobal.parseDate(date, this.o.format, this.o.language);
			}, this));
			dates = $.grep(dates, $.proxy(function(date){
				return (
					date < this.o.startDate ||
					date > this.o.endDate ||
					!date
				);
			}, this), true);
			this.dates.replace(dates);

			if (this.dates.length)
				this.viewDate = new Date(this.dates.get(-1));
			else if (this.viewDate < this.o.startDate)
				this.viewDate = new Date(this.o.startDate);
			else if (this.viewDate > this.o.endDate)
				this.viewDate = new Date(this.o.endDate);

			if (fromArgs){
				// setting date by clicking
				this.setValue();
			}
			else if (dates.length){
				// setting date by typing
				if (String(oldDates) !== String(this.dates))
					this._trigger('changeDate');
			}
			if (!this.dates.length && oldDates.length)
				this._trigger('clearDate');

			this.fill();
		},

		fillDow: function(){
			var dowCnt = this.o.weekStart,
				html = '<tr>';
			if (this.o.calendarWeeks){
				var cell = '<th class="cw">&nbsp;</th>';
				html += cell;
				this.picker.find('.datepicker-days thead tr:first-child').prepend(cell);
			}
			while (dowCnt < this.o.weekStart + 7){
				html += '<th class="dow">'+dates[this.o.language].daysMin[(dowCnt++)%7]+'</th>';
			}
			html += '</tr>';
			this.picker.find('.datepicker-days thead').append(html);
		},

		fillMonths: function(){
			var html = '',
			i = 0;
			while (i < 12){
				html += '<span class="month">'+dates[this.o.language].monthsShort[i++]+'</span>';
			}
			this.picker.find('.datepicker-months td').html(html);
		},

		setRange: function(range){
			if (!range || !range.length)
				delete this.range;
			else
				this.range = $.map(range, function(d){
					return d.valueOf();
				});
			this.fill();
		},

		getClassNames: function(date){
			var cls = [],
				year = this.viewDate.getUTCFullYear(),
				month = this.viewDate.getUTCMonth(),
				today = new Date();
			if (date.getUTCFullYear() < year || (date.getUTCFullYear() === year && date.getUTCMonth() < month)){
				cls.push('old');
			}
			else if (date.getUTCFullYear() > year || (date.getUTCFullYear() === year && date.getUTCMonth() > month)){
				cls.push('new');
			}
			if (this.focusDate && date.valueOf() === this.focusDate.valueOf())
				cls.push('focused');
			// Compare internal UTC date with local today, not UTC today
			if (this.o.todayHighlight &&
				date.getUTCFullYear() === today.getFullYear() &&
				date.getUTCMonth() === today.getMonth() &&
				date.getUTCDate() === today.getDate()){
				cls.push('today');
			}
			if (this.dates.contains(date) !== -1)
				cls.push('active');
			if (date.valueOf() < this.o.startDate || date.valueOf() > this.o.endDate ||
				$.inArray(date.getUTCDay(), this.o.daysOfWeekDisabled) !== -1){
				cls.push('disabled');
			}
			if (this.range){
				if (date > this.range[0] && date < this.range[this.range.length-1]){
					cls.push('range');
				}
				if ($.inArray(date.valueOf(), this.range) !== -1){
					cls.push('selected');
				}
			}
			return cls;
		},

		fill: function(){
			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth(),
				startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity,
				startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity,
				endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity,
				endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity,
				todaytxt = dates[this.o.language].today || dates['en'].today || '',
				cleartxt = dates[this.o.language].clear || dates['en'].clear || '',
				tooltip;
			this.picker.find('.datepicker-days thead th.datepicker-switch')
						.text(dates[this.o.language].months[month]+' '+year);
			this.picker.find('tfoot th.today')
						.text(todaytxt)
						.toggle(this.o.todayBtn !== false);
			this.picker.find('tfoot th.clear')
						.text(cleartxt)
						.toggle(this.o.clearBtn !== false);
			this.updateNavArrows();
			this.fillMonths();
			var prevMonth = UTCDate(year, month-1, 28),
				day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
			prevMonth.setUTCDate(day);
			prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.o.weekStart + 7)%7);
			var nextMonth = new Date(prevMonth);
			nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
			nextMonth = nextMonth.valueOf();
			var html = [];
			var clsName;
			while (prevMonth.valueOf() < nextMonth){
				if (prevMonth.getUTCDay() === this.o.weekStart){
					html.push('<tr>');
					if (this.o.calendarWeeks){
						// ISO 8601: First week contains first thursday.
						// ISO also states week starts on Monday, but we can be more abstract here.
						var
							// Start of current week: based on weekstart/current date
							ws = new Date(+prevMonth + (this.o.weekStart - prevMonth.getUTCDay() - 7) % 7 * 864e5),
							// Thursday of this week
							th = new Date(Number(ws) + (7 + 4 - ws.getUTCDay()) % 7 * 864e5),
							// First Thursday of year, year from thursday
							yth = new Date(Number(yth = UTCDate(th.getUTCFullYear(), 0, 1)) + (7 + 4 - yth.getUTCDay())%7*864e5),
							// Calendar week: ms between thursdays, div ms per day, div 7 days
							calWeek =  (th - yth) / 864e5 / 7 + 1;
						html.push('<td class="cw">'+ calWeek +'</td>');

					}
				}
				clsName = this.getClassNames(prevMonth);
				clsName.push('day');

				if (this.o.beforeShowDay !== $.noop){
					var before = this.o.beforeShowDay(this._utc_to_local(prevMonth));
					if (before === undefined)
						before = {};
					else if (typeof(before) === 'boolean')
						before = {enabled: before};
					else if (typeof(before) === 'string')
						before = {classes: before};
					if (before.enabled === false)
						clsName.push('disabled');
					if (before.classes)
						clsName = clsName.concat(before.classes.split(/\s+/));
					if (before.tooltip)
						tooltip = before.tooltip;
				}

				clsName = $.unique(clsName);
				html.push('<td class="'+clsName.join(' ')+'"' + (tooltip ? ' title="'+tooltip+'"' : '') + '>'+prevMonth.getUTCDate() + '</td>');
				if (prevMonth.getUTCDay() === this.o.weekEnd){
					html.push('</tr>');
				}
				prevMonth.setUTCDate(prevMonth.getUTCDate()+1);
			}
			this.picker.find('.datepicker-days tbody').empty().append(html.join(''));

			var months = this.picker.find('.datepicker-months')
						.find('th:eq(1)')
							.text(year)
							.end()
						.find('span').removeClass('active');

			$.each(this.dates, function(i, d){
				if (d.getUTCFullYear() === year)
					months.eq(d.getUTCMonth()).addClass('active');
			});

			if (year < startYear || year > endYear){
				months.addClass('disabled');
			}
			if (year === startYear){
				months.slice(0, startMonth).addClass('disabled');
			}
			if (year === endYear){
				months.slice(endMonth+1).addClass('disabled');
			}

			html = '';
			year = parseInt(year/10, 10) * 10;
			var yearCont = this.picker.find('.datepicker-years')
								.find('th:eq(1)')
									.text(year + '-' + (year + 9))
									.end()
								.find('td');
			year -= 1;
			var years = $.map(this.dates, function(d){
					return d.getUTCFullYear();
				}),
				classes;
			for (var i = -1; i < 11; i++){
				classes = ['year'];
				if (i === -1)
					classes.push('old');
				else if (i === 10)
					classes.push('new');
				if ($.inArray(year, years) !== -1)
					classes.push('active');
				if (year < startYear || year > endYear)
					classes.push('disabled');
				html += '<span class="' + classes.join(' ') + '">'+year+'</span>';
				year += 1;
			}
			yearCont.html(html);
		},

		updateNavArrows: function(){
			if (!this._allow_update)
				return;

			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth();
			switch (this.viewMode){
				case 0:
					if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear() && month <= this.o.startDate.getUTCMonth()){
						this.picker.find('.prev').css({visibility: 'hidden'});
					}
					else {
						this.picker.find('.prev').css({visibility: 'visible'});
					}
					if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear() && month >= this.o.endDate.getUTCMonth()){
						this.picker.find('.next').css({visibility: 'hidden'});
					}
					else {
						this.picker.find('.next').css({visibility: 'visible'});
					}
					break;
				case 1:
				case 2:
					if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear()){
						this.picker.find('.prev').css({visibility: 'hidden'});
					}
					else {
						this.picker.find('.prev').css({visibility: 'visible'});
					}
					if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear()){
						this.picker.find('.next').css({visibility: 'hidden'});
					}
					else {
						this.picker.find('.next').css({visibility: 'visible'});
					}
					break;
			}
		},

		click: function(e){
			e.preventDefault();
			var target = $(e.target).closest('span, td, th'),
				year, month, day;
			if (target.length === 1){
				switch (target[0].nodeName.toLowerCase()){
					case 'th':
						switch (target[0].className){
							case 'datepicker-switch':
								this.showMode(1);
								break;
							case 'prev':
							case 'next':
								var dir = DPGlobal.modes[this.viewMode].navStep * (target[0].className === 'prev' ? -1 : 1);
								switch (this.viewMode){
									case 0:
										this.viewDate = this.moveMonth(this.viewDate, dir);
										this._trigger('changeMonth', this.viewDate);
										break;
									case 1:
									case 2:
										this.viewDate = this.moveYear(this.viewDate, dir);
										if (this.viewMode === 1)
											this._trigger('changeYear', this.viewDate);
										break;
								}
								this.fill();
								break;
							case 'today':
								var date = new Date();
								date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

								this.showMode(-2);
								var which = this.o.todayBtn === 'linked' ? null : 'view';
								this._setDate(date, which);
								break;
							case 'clear':
								var element;
								if (this.isInput)
									element = this.element;
								else if (this.component)
									element = this.element.find('input');
								if (element)
									element.val("").change();
								this.update();
								this._trigger('changeDate');
								if (this.o.autoclose)
									this.hide();
								break;
						}
						break;
					case 'span':
						if (!target.is('.disabled')){
							this.viewDate.setUTCDate(1);
							if (target.is('.month')){
								day = 1;
								month = target.parent().find('span').index(target);
								year = this.viewDate.getUTCFullYear();
								this.viewDate.setUTCMonth(month);
								this._trigger('changeMonth', this.viewDate);
								if (this.o.minViewMode === 1){
									this._setDate(UTCDate(year, month, day));
								}
							}
							else {
								day = 1;
								month = 0;
								year = parseInt(target.text(), 10)||0;
								this.viewDate.setUTCFullYear(year);
								this._trigger('changeYear', this.viewDate);
								if (this.o.minViewMode === 2){
									this._setDate(UTCDate(year, month, day));
								}
							}
							this.showMode(-1);
							this.fill();
						}
						break;
					case 'td':
						if (target.is('.day') && !target.is('.disabled')){
							day = parseInt(target.text(), 10)||1;
							year = this.viewDate.getUTCFullYear();
							month = this.viewDate.getUTCMonth();
							if (target.is('.old')){
								if (month === 0){
									month = 11;
									year -= 1;
								}
								else {
									month -= 1;
								}
							}
							else if (target.is('.new')){
								if (month === 11){
									month = 0;
									year += 1;
								}
								else {
									month += 1;
								}
							}
							this._setDate(UTCDate(year, month, day));
						}
						break;
				}
			}
			if (this.picker.is(':visible') && this._focused_from){
				$(this._focused_from).focus();
			}
			delete this._focused_from;
		},

		_toggle_multidate: function(date){
			var ix = this.dates.contains(date);
			if (!date){
				this.dates.clear();
			}
			else if (ix !== -1){
				this.dates.remove(ix);
			}
			else {
				this.dates.push(date);
			}
			if (typeof this.o.multidate === 'number')
				while (this.dates.length > this.o.multidate)
					this.dates.remove(0);
		},

		_setDate: function(date, which){
			if (!which || which === 'date')
				this._toggle_multidate(date && new Date(date));
			if (!which || which  === 'view')
				this.viewDate = date && new Date(date);

			this.fill();
			this.setValue();
			this._trigger('changeDate');
			var element;
			if (this.isInput){
				element = this.element;
			}
			else if (this.component){
				element = this.element.find('input');
			}
			if (element){
				element.change();
			}
			if (this.o.autoclose && (!which || which === 'date')){
				this.hide();
			}
		},

		moveMonth: function(date, dir){
			if (!date)
				return undefined;
			if (!dir)
				return date;
			var new_date = new Date(date.valueOf()),
				day = new_date.getUTCDate(),
				month = new_date.getUTCMonth(),
				mag = Math.abs(dir),
				new_month, test;
			dir = dir > 0 ? 1 : -1;
			if (mag === 1){
				test = dir === -1
					// If going back one month, make sure month is not current month
					// (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
					? function(){
						return new_date.getUTCMonth() === month;
					}
					// If going forward one month, make sure month is as expected
					// (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
					: function(){
						return new_date.getUTCMonth() !== new_month;
					};
				new_month = month + dir;
				new_date.setUTCMonth(new_month);
				// Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
				if (new_month < 0 || new_month > 11)
					new_month = (new_month + 12) % 12;
			}
			else {
				// For magnitudes >1, move one month at a time...
				for (var i=0; i < mag; i++)
					// ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
					new_date = this.moveMonth(new_date, dir);
				// ...then reset the day, keeping it in the new month
				new_month = new_date.getUTCMonth();
				new_date.setUTCDate(day);
				test = function(){
					return new_month !== new_date.getUTCMonth();
				};
			}
			// Common date-resetting loop -- if date is beyond end of month, make it
			// end of month
			while (test()){
				new_date.setUTCDate(--day);
				new_date.setUTCMonth(new_month);
			}
			return new_date;
		},

		moveYear: function(date, dir){
			return this.moveMonth(date, dir*12);
		},

		dateWithinRange: function(date){
			return date >= this.o.startDate && date <= this.o.endDate;
		},

		keydown: function(e){
			if (this.picker.is(':not(:visible)')){
				if (e.keyCode === 27) // allow escape to hide and re-show picker
					this.show();
				return;
			}
			var dateChanged = false,
				dir, newDate, newViewDate,
				focusDate = this.focusDate || this.viewDate;
			switch (e.keyCode){
				case 27: // escape
					if (this.focusDate){
						this.focusDate = null;
						this.viewDate = this.dates.get(-1) || this.viewDate;
						this.fill();
					}
					else
						this.hide();
					e.preventDefault();
					break;
				case 37: // left
				case 39: // right
					if (!this.o.keyboardNavigation)
						break;
					dir = e.keyCode === 37 ? -1 : 1;
					if (e.ctrlKey){
						newDate = this.moveYear(this.dates.get(-1) || UTCToday(), dir);
						newViewDate = this.moveYear(focusDate, dir);
						this._trigger('changeYear', this.viewDate);
					}
					else if (e.shiftKey){
						newDate = this.moveMonth(this.dates.get(-1) || UTCToday(), dir);
						newViewDate = this.moveMonth(focusDate, dir);
						this._trigger('changeMonth', this.viewDate);
					}
					else {
						newDate = new Date(this.dates.get(-1) || UTCToday());
						newDate.setUTCDate(newDate.getUTCDate() + dir);
						newViewDate = new Date(focusDate);
						newViewDate.setUTCDate(focusDate.getUTCDate() + dir);
					}
					if (this.dateWithinRange(newDate)){
						this.focusDate = this.viewDate = newViewDate;
						this.setValue();
						this.fill();
						e.preventDefault();
					}
					break;
				case 38: // up
				case 40: // down
					if (!this.o.keyboardNavigation)
						break;
					dir = e.keyCode === 38 ? -1 : 1;
					if (e.ctrlKey){
						newDate = this.moveYear(this.dates.get(-1) || UTCToday(), dir);
						newViewDate = this.moveYear(focusDate, dir);
						this._trigger('changeYear', this.viewDate);
					}
					else if (e.shiftKey){
						newDate = this.moveMonth(this.dates.get(-1) || UTCToday(), dir);
						newViewDate = this.moveMonth(focusDate, dir);
						this._trigger('changeMonth', this.viewDate);
					}
					else {
						newDate = new Date(this.dates.get(-1) || UTCToday());
						newDate.setUTCDate(newDate.getUTCDate() + dir * 7);
						newViewDate = new Date(focusDate);
						newViewDate.setUTCDate(focusDate.getUTCDate() + dir * 7);
					}
					if (this.dateWithinRange(newDate)){
						this.focusDate = this.viewDate = newViewDate;
						this.setValue();
						this.fill();
						e.preventDefault();
					}
					break;
				case 32: // spacebar
					// Spacebar is used in manually typing dates in some formats.
					// As such, its behavior should not be hijacked.
					break;
				case 13: // enter
					focusDate = this.focusDate || this.dates.get(-1) || this.viewDate;
					this._toggle_multidate(focusDate);
					dateChanged = true;
					this.focusDate = null;
					this.viewDate = this.dates.get(-1) || this.viewDate;
					this.setValue();
					this.fill();
					if (this.picker.is(':visible')){
						e.preventDefault();
						if (this.o.autoclose)
							this.hide();
					}
					break;
				case 9: // tab
					this.focusDate = null;
					this.viewDate = this.dates.get(-1) || this.viewDate;
					this.fill();
					this.hide();
					break;
			}
			if (dateChanged){
				if (this.dates.length)
					this._trigger('changeDate');
				else
					this._trigger('clearDate');
				var element;
				if (this.isInput){
					element = this.element;
				}
				else if (this.component){
					element = this.element.find('input');
				}
				if (element){
					element.change();
				}
			}
		},

		showMode: function(dir){
			if (dir){
				this.viewMode = Math.max(this.o.minViewMode, Math.min(2, this.viewMode + dir));
			}
			this.picker
				.find('>div')
				.hide()
				.filter('.datepicker-'+DPGlobal.modes[this.viewMode].clsName)
					.css('display', 'block');
			this.updateNavArrows();
		}
	};

	var DateRangePicker = function(element, options){
		this.element = $(element);
		this.inputs = $.map(options.inputs, function(i){
			return i.jquery ? i[0] : i;
		});
		delete options.inputs;

		$(this.inputs)
			.datepicker(options)
			.bind('changeDate', $.proxy(this.dateUpdated, this));

		this.pickers = $.map(this.inputs, function(i){
			return $(i).data('datepicker');
		});
		this.updateDates();
	};
	DateRangePicker.prototype = {
		updateDates: function(){
			this.dates = $.map(this.pickers, function(i){
				return i.getUTCDate();
			});
			this.updateRanges();
		},
		updateRanges: function(){
			var range = $.map(this.dates, function(d){
				return d.valueOf();
			});
			$.each(this.pickers, function(i, p){
				p.setRange(range);
			});
		},
		dateUpdated: function(e){
			// `this.updating` is a workaround for preventing infinite recursion
			// between `changeDate` triggering and `setUTCDate` calling.  Until
			// there is a better mechanism.
			if (this.updating)
				return;
			this.updating = true;

			var dp = $(e.target).data('datepicker'),
				new_date = dp.getUTCDate(),
				i = $.inArray(e.target, this.inputs),
				l = this.inputs.length;
			if (i === -1)
				return;

			$.each(this.pickers, function(i, p){
				if (!p.getUTCDate())
					p.setUTCDate(new_date);
			});

			if (new_date < this.dates[i]){
				// Date being moved earlier/left
				while (i >= 0 && new_date < this.dates[i]){
					this.pickers[i--].setUTCDate(new_date);
				}
			}
			else if (new_date > this.dates[i]){
				// Date being moved later/right
				while (i < l && new_date > this.dates[i]){
					this.pickers[i++].setUTCDate(new_date);
				}
			}
			this.updateDates();

			delete this.updating;
		},
		remove: function(){
			$.map(this.pickers, function(p){ p.remove(); });
			delete this.element.data().datepicker;
		}
	};

	function opts_from_el(el, prefix){
		// Derive options from element data-attrs
		var data = $(el).data(),
			out = {}, inkey,
			replace = new RegExp('^' + prefix.toLowerCase() + '([A-Z])');
		prefix = new RegExp('^' + prefix.toLowerCase());
		function re_lower(_,a){
			return a.toLowerCase();
		}
		for (var key in data)
			if (prefix.test(key)){
				inkey = key.replace(replace, re_lower);
				out[inkey] = data[key];
			}
		return out;
	}

	function opts_from_locale(lang){
		// Derive options from locale plugins
		var out = {};
		// Check if "de-DE" style date is available, if not language should
		// fallback to 2 letter code eg "de"
		if (!dates[lang]){
			lang = lang.split('-')[0];
			if (!dates[lang])
				return;
		}
		var d = dates[lang];
		$.each(locale_opts, function(i,k){
			if (k in d)
				out[k] = d[k];
		});
		return out;
	}

	var old = $.fn.datepicker;
	$.fn.datepicker = function(option){
		var args = Array.apply(null, arguments);
		args.shift();
		var internal_return;
		this.each(function(){
			var $this = $(this),
				data = $this.data('datepicker'),
				options = typeof option === 'object' && option;
			if (!data){
				var elopts = opts_from_el(this, 'date'),
					// Preliminary otions
					xopts = $.extend({}, defaults, elopts, options),
					locopts = opts_from_locale(xopts.language),
					// Options priority: js args, data-attrs, locales, defaults
					opts = $.extend({}, defaults, locopts, elopts, options);
				if ($this.is('.input-daterange') || opts.inputs){
					var ropts = {
						inputs: opts.inputs || $this.find('input').toArray()
					};
					$this.data('datepicker', (data = new DateRangePicker(this, $.extend(opts, ropts))));
				}
				else {
					$this.data('datepicker', (data = new Datepicker(this, opts)));
				}
			}
			if (typeof option === 'string' && typeof data[option] === 'function'){
				internal_return = data[option].apply(data, args);
				if (internal_return !== undefined)
					return false;
			}
		});
		if (internal_return !== undefined)
			return internal_return;
		else
			return this;
	};

	var defaults = $.fn.datepicker.defaults = {
		autoclose: false,
		beforeShowDay: $.noop,
		calendarWeeks: false,
		clearBtn: false,
		daysOfWeekDisabled: [],
		endDate: Infinity,
		forceParse: true,
		format: 'mm/dd/yyyy',
		keyboardNavigation: true,
		language: 'en',
		minViewMode: 0,
		multidate: false,
		multidateSeparator: ',',
		orientation: "auto",
		rtl: false,
		startDate: -Infinity,
		startView: 0,
		todayBtn: false,
		todayHighlight: false,
		weekStart: 0
	};
	var locale_opts = $.fn.datepicker.locale_opts = [
		'format',
		'rtl',
		'weekStart'
	];
	$.fn.datepicker.Constructor = Datepicker;
	var dates = $.fn.datepicker.dates = {
		en: {
			days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
			daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
			daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
			months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
			monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
			today: "Today",
			clear: "Clear"
		}
	};

	var DPGlobal = {
		modes: [
			{
				clsName: 'days',
				navFnc: 'Month',
				navStep: 1
			},
			{
				clsName: 'months',
				navFnc: 'FullYear',
				navStep: 1
			},
			{
				clsName: 'years',
				navFnc: 'FullYear',
				navStep: 10
		}],
		isLeapYear: function(year){
			return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
		},
		getDaysInMonth: function(year, month){
			return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
		},
		validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,
		nonpunctuation: /[^ -\/:-@\[\u3400-\u9fff-`{-~\t\n\r]+/g,
		parseFormat: function(format){
			// IE treats \0 as a string end in inputs (truncating the value),
			// so it's a bad format delimiter, anyway
			var separators = format.replace(this.validParts, '\0').split('\0'),
				parts = format.match(this.validParts);
			if (!separators || !separators.length || !parts || parts.length === 0){
				throw new Error("Invalid date format.");
			}
			return {separators: separators, parts: parts};
		},
		parseDate: function(date, format, language){
			if (!date)
				return undefined;
			if (date instanceof Date)
				return date;
			if (typeof format === 'string')
				format = DPGlobal.parseFormat(format);
			var part_re = /([\-+]\d+)([dmwy])/,
				parts = date.match(/([\-+]\d+)([dmwy])/g),
				part, dir, i;
			if (/^[\-+]\d+[dmwy]([\s,]+[\-+]\d+[dmwy])*$/.test(date)){
				date = new Date();
				for (i=0; i < parts.length; i++){
					part = part_re.exec(parts[i]);
					dir = parseInt(part[1]);
					switch (part[2]){
						case 'd':
							date.setUTCDate(date.getUTCDate() + dir);
							break;
						case 'm':
							date = Datepicker.prototype.moveMonth.call(Datepicker.prototype, date, dir);
							break;
						case 'w':
							date.setUTCDate(date.getUTCDate() + dir * 7);
							break;
						case 'y':
							date = Datepicker.prototype.moveYear.call(Datepicker.prototype, date, dir);
							break;
					}
				}
				return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0);
			}
			parts = date && date.match(this.nonpunctuation) || [];
			date = new Date();
			var parsed = {},
				setters_order = ['yyyy', 'yy', 'M', 'MM', 'm', 'mm', 'd', 'dd'],
				setters_map = {
					yyyy: function(d,v){
						return d.setUTCFullYear(v);
					},
					yy: function(d,v){
						return d.setUTCFullYear(2000+v);
					},
					m: function(d,v){
						if (isNaN(d))
							return d;
						v -= 1;
						while (v < 0) v += 12;
						v %= 12;
						d.setUTCMonth(v);
						while (d.getUTCMonth() !== v)
							d.setUTCDate(d.getUTCDate()-1);
						return d;
					},
					d: function(d,v){
						return d.setUTCDate(v);
					}
				},
				val, filtered;
			setters_map['M'] = setters_map['MM'] = setters_map['mm'] = setters_map['m'];
			setters_map['dd'] = setters_map['d'];
			date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
			var fparts = format.parts.slice();
			// Remove noop parts
			if (parts.length !== fparts.length){
				fparts = $(fparts).filter(function(i,p){
					return $.inArray(p, setters_order) !== -1;
				}).toArray();
			}
			// Process remainder
			function match_part(){
				var m = this.slice(0, parts[i].length),
					p = parts[i].slice(0, m.length);
				return m === p;
			}
			if (parts.length === fparts.length){
				var cnt;
				for (i=0, cnt = fparts.length; i < cnt; i++){
					val = parseInt(parts[i], 10);
					part = fparts[i];
					if (isNaN(val)){
						switch (part){
							case 'MM':
								filtered = $(dates[language].months).filter(match_part);
								val = $.inArray(filtered[0], dates[language].months) + 1;
								break;
							case 'M':
								filtered = $(dates[language].monthsShort).filter(match_part);
								val = $.inArray(filtered[0], dates[language].monthsShort) + 1;
								break;
						}
					}
					parsed[part] = val;
				}
				var _date, s;
				for (i=0; i < setters_order.length; i++){
					s = setters_order[i];
					if (s in parsed && !isNaN(parsed[s])){
						_date = new Date(date);
						setters_map[s](_date, parsed[s]);
						if (!isNaN(_date))
							date = _date;
					}
				}
			}
			return date;
		},
		formatDate: function(date, format, language){
			if (!date)
				return '';
			if (typeof format === 'string')
				format = DPGlobal.parseFormat(format);
			var val = {
				d: date.getUTCDate(),
				D: dates[language].daysShort[date.getUTCDay()],
				DD: dates[language].days[date.getUTCDay()],
				m: date.getUTCMonth() + 1,
				M: dates[language].monthsShort[date.getUTCMonth()],
				MM: dates[language].months[date.getUTCMonth()],
				yy: date.getUTCFullYear().toString().substring(2),
				yyyy: date.getUTCFullYear()
			};
			val.dd = (val.d < 10 ? '0' : '') + val.d;
			val.mm = (val.m < 10 ? '0' : '') + val.m;
			date = [];
			var seps = $.extend([], format.separators);
			for (var i=0, cnt = format.parts.length; i <= cnt; i++){
				if (seps.length)
					date.push(seps.shift());
				date.push(val[format.parts[i]]);
			}
			return date.join('');
		},
		headTemplate: '<thead>'+
							'<tr>'+
								'<th class="prev">&laquo;</th>'+
								'<th colspan="5" class="datepicker-switch"></th>'+
								'<th class="next">&raquo;</th>'+
							'</tr>'+
						'</thead>',
		contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
		footTemplate: '<tfoot>'+
							'<tr>'+
								'<th colspan="7" class="today"></th>'+
							'</tr>'+
							'<tr>'+
								'<th colspan="7" class="clear"></th>'+
							'</tr>'+
						'</tfoot>'
	};
	DPGlobal.template = '<div class="datepicker">'+
							'<div class="datepicker-days">'+
								'<table class=" table-condensed">'+
									DPGlobal.headTemplate+
									'<tbody></tbody>'+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
							'<div class="datepicker-months">'+
								'<table class="table-condensed">'+
									DPGlobal.headTemplate+
									DPGlobal.contTemplate+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
							'<div class="datepicker-years">'+
								'<table class="table-condensed">'+
									DPGlobal.headTemplate+
									DPGlobal.contTemplate+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
						'</div>';

	$.fn.datepicker.DPGlobal = DPGlobal;


	/* DATEPICKER NO CONFLICT
	* =================== */

	$.fn.datepicker.noConflict = function(){
		$.fn.datepicker = old;
		return this;
	};


	/* DATEPICKER DATA-API
	* ================== */

	$(document).on(
		'focus.datepicker.data-api click.datepicker.data-api',
		'[data-provide="datepicker"]',
		function(e){
			var $this = $(this);
			if ($this.data('datepicker'))
				return;
			e.preventDefault();
			// component click requires us to explicitly show it
			$this.datepicker('show');
		}
	);
	$(function(){
		$('[data-provide="datepicker-inline"]').datepicker();
	});

}(window.jQuery));

},{}],"/src/widget/date/config.json":[function(require,module,exports){
module.exports={
    "stylesheet": "datepicker-extended.scss",
    "selector": "input[type=\"date\"]:not([readonly])",
    "options": {}
}

},{}],"/src/widget/date/datepicker-extended.js":[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function(require, exports, module){
    'use strict';
    var Widget = require('../../js/Widget');
    var support = require('../../js/support');
    var $ = require('jquery');
    require('./bootstrap3-datepicker/js/bootstrap-datepicker');

        //It is very helpful to make this the same as widget class, except for converting the first character to lowercase.
        var pluginName = 'datepickerExtended';

        /**
         * Extends eternicode's bootstrap-datepicker without changing the original.
         * https://github.com/eternicode/bootstrap-datepicker
         *
         * @constructor
         * @param {Element}                       element   Element to apply widget to.
         * @param {(boolean|{touch: boolean})}    options   options
         * @param {*=}                            event     event
         */

        function DatepickerExtended( element, options ) {
            this.namespace = pluginName;
            //call the Super constructor
            Widget.call( this, element, options );
            this._init();
        }

        //copy the prototype functions from the Widget super class
        DatepickerExtended.prototype = Object.create( Widget.prototype );

        //ensure the constructor is the new one
        DatepickerExtended.prototype.constructor = DatepickerExtended;

        /**
         * Initialize timepicker widget
         */
        DatepickerExtended.prototype._init = function() {
            var that = this,
                $p = $( this.element ).parent( 'label' ),
                settings = ( $p.hasClass( 'or-appearance-year' ) ) ? {
                    format: 'yyyy',
                    startView: 'decade',
                    minViewMode: 'years'
                } : ( $p.hasClass( 'or-appearance-month-year' ) ) ? {
                    format: 'yyyy-mm',
                    startView: 'year',
                    minViewMode: 'months'
                } : {
                    format: 'yyyy-mm-dd',
                    startView: 'month',
                    minViewMode: 'day'
                },
                $fakeDateI = this._createFakeDateInput( settings.format );

            this._setManualHandler( $fakeDateI );
            this._setFocusHandler( $fakeDateI );
            this._setResetHandler( $fakeDateI );

            $fakeDateI.datepicker( {
                format: settings.format,
                autoclose: true,
                todayHighlight: true,
                startView: settings.startView,
                minViewMode: settings.minViewMode,
                orientation: 'top'
            } ).on( 'changeDate', function() {
                // copy changes made by datepicker to original input field
                var value = $( this ).val();
                if ( settings.startView === 'decade' && value.length === 4 ) {
                    value += '-01-01';
                } else if ( settings.startView === 'year' && value.length < 8 ) {
                    value += '-01';
                }
                $( that.element ).val( value ).trigger( 'change' ).blur();
            } );
        };

        /**
         * Creates fake date input elements
         * @param  {string} format the date format
         * @return {jQuery}        the jQuery-wrapped fake date input element
         */
        DatepickerExtended.prototype._createFakeDateInput = function( format ) {
            var $dateI = $( this.element ),
                $fakeDate = $(
                    '<div class="widget date"><input class="ignore input-small" readonly="readonly" type="text" value="' +
                    $dateI.val() + '" placeholder="' + format + '" />' +
                    '<button class="btn-icon-only btn-reset" type="button"><i class="icon icon-refresh"> </i></button></div>' ),
                //$fakeDateReset = $fakeDate.find( '.btn-reset' ),
                $fakeDateI = $fakeDate.find( 'input' );

            //$dateI.next( '.widget.date' ).remove( );
            $dateI.hide().after( $fakeDate );

            return $fakeDateI;
        };

        /**
         * copy manual changes to original date input field
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatepickerExtended.prototype._setManualHandler = function( $fakeDateI ) {
            //$fakeDateI.on( 'change', function( ) {
            //  var date,
            //    value = $dateI.val( );
            //  if ( value.length > 0 ) {
            //    value = ( format === 'yyyy-mm' ) ? value + '-01' : ( format === 'yyyy' ) ? value + '-01-01' : value;
            //    value = data.node( ).convert( value, 'date' );
            //  }
            //  if ( $dateI.val( ) !== value ) {
            //    $dateI.val( value ).trigger( 'change' ).blur( );
            //  }
            //  return false;
            //} );
        };

        /**
         * Reset button handler
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatepickerExtended.prototype._setResetHandler = function( $fakeDateI ) {
            $fakeDateI.next( '.btn-reset' ).on( 'click', function() {
                $fakeDateI.val( '' ).trigger( 'changeDate' ).datepicker( 'update' );
            } );
        };

        /**
         * Handler for focus and blur events.
         * These events on the original input are used to check whether to display the 'required' message
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatepickerExtended.prototype._setFocusHandler = function( $fakeDateI ) {
            var that = this;
            $fakeDateI.on( 'focus blur', function( event ) {
                $( that.element ).trigger( 'fake' + event.type );
            } );
        };

        $.fn[ pluginName ] = function( options, event ) {

            options = options || {};

            return this.each( function() {
                var $this = $( this ),
                    data = $this.data( pluginName ),
                    badSamsung = /GT-P31[0-9]{2}.+AppleWebKit\/534\.30/;

                /*
                 * Samsung mobile browser (called "Internet") has a weird bug that appears sometimes (?) when an input field
                 * already has a value and is edited. The new value YYYY-MM-DD prepends old or replaces the year of the old value and first hyphen. E.g.
                 * existing: 2010-01-01, new value entered: 2012-12-12 => input field shows: 2012-12-1201-01.
                 * This doesn't seem to effect the actual value of the input, just the way it is displayed. But if the incorrectly displayed date is then
                 * attempted to be edited again, it does get the incorrect value and it's impossible to clear this and create a valid date.
                 *
                 * browser: "Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; GT-P3113 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
                 * webview: "Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; GT-P3100 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30"
                 */

                if ( !data && typeof options === 'object' && ( !options.touch || !support.inputtypes.date || badSamsung.test( navigator.userAgent ) ) ) {
                    $this.data( pluginName, ( data = new DatepickerExtended( this, options, event ) ) );
                }
                //only call method if widget was instantiated before
                else if ( data && typeof options === 'string' ) {
                    //pass the element as a parameter as this is used in fix()
                    data[ options ]( this );
                }
            } );
        };

        module.exports = pluginName;
    } );

},{"../../js/Widget":13,"../../js/support":16,"./bootstrap3-datepicker/js/bootstrap-datepicker":"/src/widget/date/bootstrap3-datepicker/js/bootstrap-datepicker.js","jquery":2}],"/src/widget/datetime/config.json":[function(require,module,exports){
module.exports={
    "stylesheet": "datetimepicker-extended.scss",
    "selector": "input[type=\"datetime\"]:not([readonly])",
    "options": {}
}

},{}],"/src/widget/datetime/datetimepicker-extended.js":[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function(require, exports, module){
    'use strict';
    var Widget = require('../../js/Widget');
    var support = require('../../js/support');
    var $ = require('jquery');
    require('../../js/extend');
    require('../date/bootstrap3-datepicker/js/bootstrap-datepicker');
    require('../time/bootstrap3-timepicker/js/bootstrap-timepicker');

        var pluginName = 'datetimepickerExtended';

        /**
         * This thing is hacked together with little love, because nobody used datetime inputs. Needs to be rewritten.
         *
         * Extends eternicode's bootstrap-datepicker without changing the original.
         * https://github.com/eternicode/bootstrap-datepicker
         *
         * Extends jdewit's bootstrap-timepicker without changing the original
         * https://github.com/jdewit/bootstrap-timepicker
         *
         * @constructor
         * @param {Element}                       element   Element to apply widget to.
         * @param {(boolean|{touch: boolean})}    options   options
         * @param {*=}                            event     event
         */

        function DatetimepickerExtended( element, options ) {
            this.namespace = pluginName;
            //call the Super constructor
            Widget.call( this, element, options );
            this._init();
        }

        //copy the prototype functions from the Widget super class
        DatetimepickerExtended.prototype = Object.create( Widget.prototype );

        //ensure the constructor is the new one
        DatetimepickerExtended.prototype.constructor = DatetimepickerExtended;

        /**
         * Initialize timepicker widget
         */
        DatetimepickerExtended.prototype._init = function() {
            var $dateTimeI = $( this.element ),
                /*
          Loaded or default datetime values remain untouched until they are edited. This is done to preserve 
          the timezone information (especially for instances-to-edit) if the values are not edited (the
          original entry may have been done in a different time zone than the edit). However, 
          values shown in the widget should reflect the local time representation of that value.
         */
                val = ( $dateTimeI.val().length > 0 ) ? new Date( $dateTimeI.val() ).toISOLocalString() : '',
                vals = val.split( 'T' ),
                dateVal = vals[ 0 ],
                timeVal = ( vals[ 1 ] && vals[ 1 ].length > 4 ) ? vals[ 1 ].substring( 0, 5 ) : '',
                $fakeDateI = this._createFakeDateInput( dateVal ),
                $fakeTimeI = this._createFakeTimeInput( timeVal );

            $dateTimeI.hide().after( '<div class="datetimepicker widget" />' );
            $dateTimeI.siblings( '.datetimepicker' ).append( $fakeDateI.closest( '.date' ) ).append( $fakeTimeI.closest( '.bootstrap-timepicker' ) );

            $fakeDateI.datepicker( {
                format: 'yyyy-mm-dd',
                autoclose: true,
                todayHighlight: true
            } );

            $fakeTimeI
                .timepicker( {
                    defaultTime: ( timeVal.length > 0 ) ? 'value' : 'current',
                    showMeridian: false
                } )
                .val( timeVal )
                //the time picker itself has input elements
                .closest( '.widget' ).find( 'input' ).addClass( 'ignore' );

            this._setManualHandler( $fakeDateI );
            this._setFocusHandler( $fakeDateI.add( $fakeTimeI ) );

            $fakeDateI.on( 'change changeDate', function() {
                changeVal();
                return false;
            } );

            $fakeTimeI.on( 'change', function() {
                changeVal();
                return false;
            } );

            //reset button
            $fakeTimeI.next( '.btn-reset' ).on( 'click', function() {
                $fakeDateI.val( '' ).trigger( 'change' ).datepicker( 'update' );
                $fakeTimeI.val( '' ).trigger( 'change' );
            } );

            function changeVal() {
                if ( $fakeDateI.val().length > 0 && $fakeTimeI.val().length > 0 ) {
                    var d = $fakeDateI.val().split( '-' ),
                        t = $fakeTimeI.val().split( ':' );
                    $dateTimeI.val( new Date( d[ 0 ], d[ 1 ] - 1, d[ 2 ], t[ 0 ], t[ 1 ] ).toISOLocalString() ).trigger( 'change' ).blur();
                } else {
                    $dateTimeI.val( '' ).trigger( 'change' ).blur();
                }
            }
        };

        /**
         * Creates fake date input elements
         * @param  {string} format the date format
         * @return {jQuery}        the jQuery-wrapped fake date input element
         */
        DatetimepickerExtended.prototype._createFakeDateInput = function( dateVal ) {
            var $fakeDate = $(
                    '<div class="date">' +
                    '<input class="ignore input-small" type="text" readonly="readonly" value="' + dateVal + '" placeholder="yyyy-mm-dd"/>' +
                    '</div>' ),
                $fakeDateI = $fakeDate.find( 'input' );

            return $fakeDateI;
        };

        /**
         * Creates fake time input elements
         * @param  {string} format the date format
         * @return {jQuery}        the jQuery-wrapped fake date input element
         */
        DatetimepickerExtended.prototype._createFakeTimeInput = function( timeVal ) {
            var $fakeTime = $(
                    '<div class="bootstrap-timepicker">' +
                    '<input class="ignore timepicker-default input-small" readonly="readonly" type="text" value="' +
                    timeVal + '" placeholder="hh:mm"/>' +
                    '<button class="btn-icon-only btn-reset" type="button"><i class="icon icon-refresh"> </i></button>' +
                    '</div>' ),
                $fakeTimeI = $fakeTime.find( 'input' );

            return $fakeTimeI;
        };

        /**
         * copy manual changes to original date input field
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatetimepickerExtended.prototype._setManualHandler = function() {};

        /**
         * Handler for focus and blur events.
         * These events on the original input are used to check whether to display the 'required' message
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatetimepickerExtended.prototype._setFocusHandler = function( $els ) {
            var that = this;
            $els.on( 'focus blur', function( event ) {
                $( that.element ).trigger( 'fake' + event.type );
            } );
        };

        $.fn[ pluginName ] = function( options, event ) {

            options = options || {};

            return this.each( function() {
                var $this = $( this ),
                    data = $this.data( pluginName ),
                    badSamsung = /GT-P31[0-9]{2}.+AppleWebKit\/534\.30/;

                /*
                Samsung mobile browser (called "Internet") has a weird bug that appears sometimes (?) when an input field
                already has a value and is edited. The new value YYYY-MM-DD prepends old or replaces the year of the old value and first hyphen. E.g.
                existing: 2010-01-01, new value entered: 2012-12-12 => input field shows: 2012-12-1201-01.
                This doesn't seem to effect the actual value of the input, just the way it is displayed. But if the incorrectly displayed date is then 
                attempted to be edited again, it does get the incorrect value and it's impossible to clear this and create a valid date.
              
                browser: "Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; GT-P3113 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
                webview: "Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; GT-P3100 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30" 
                */
                if ( !data && typeof options === 'object' && ( !options.touch || !support.inputtypes.datetime || badSamsung.test( navigator.userAgent ) ) ) {
                    $this.data( pluginName, ( data = new DatetimepickerExtended( this, options, event ) ) );
                }
                //only call method if widget was instantiated before
                else if ( data && typeof options === 'string' ) {
                    //pass the element as a parameter as this is used in fix()
                    data[ options ]( this );
                }
            } );
        };

        module.exports = pluginName;
    } );

},{"../../js/Widget":13,"../../js/extend":14,"../../js/support":16,"../date/bootstrap3-datepicker/js/bootstrap-datepicker":"/src/widget/date/bootstrap3-datepicker/js/bootstrap-datepicker.js","../time/bootstrap3-timepicker/js/bootstrap-timepicker":19,"jquery":2}],"/src/widget/horizontal-choices/config.json":[function(require,module,exports){
module.exports={
    "stylesheet": "horizontalchoices.scss",
    "selector": ".or-appearance-horizontal",
    "options": {}
}

},{}],"/src/widget/horizontal-choices/horizontalchoices.js":[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * Horizontal Choices Widget
 *
 */

define( function(require, exports, module){
    'use strict';
    var $ = require('jquery');
    var Widget = require('../../js/Widget');

    var pluginName = 'horizontalChoices';

    /**
     * Horizontal Choices Widgets. Adds a filler if the last row contains two elements.
     * The filler avoids the last radiobutton or checkbox to not be lined up correctly below the second column.
     *
     * @constructor
     * @param {Element}                       element   Element to apply widget to.
     * @param {(boolean|{touch: boolean})}    options   options
     * @param {*=}                            event     event
     */

    function HorizontalChoices( element, options ) {
        // set the namespace (important!)
        this.namespace = pluginName;
        // call the Super constructor
        Widget.call( this, element, pluginName, options );
        this._init();
    }

    // copy the prototype functions from the Widget super class
    HorizontalChoices.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    HorizontalChoices.prototype.constructor = HorizontalChoices;

    //add your widget functions
    HorizontalChoices.prototype._init = function() {
        $( this.element ).find( '.option-wrapper' ).each( function() {
            var $wrapper = $( this ),
                $options = $wrapper.find( 'label' );

            if ( ( $options.length % 3 ) === 2 ) {
                $wrapper.append( '<label class="filler"></label>' );
            }
        } );
    };

    /**
     * Override the super's destroy method
     *
     * @param  {Element} element The element the widget is applied on
     */
    HorizontalChoices.prototype.destroy = function() {};


    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            //only instantiate if options is an object (i.e. not a string) and if it doesn't exist already
            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new HorizontalChoices( this, options, event ) ) );
            }
            //only call method if widget was instantiated before
            else if ( data && typeof options === 'string' ) {
                //pass the element as a parameter as this is used in destroy() for cloned elements and widgets
                data[ options ]( this );
            }
        } );
    };

    module.exports = pluginName;
} );

},{"../../js/Widget":13,"jquery":2}],"/src/widget/note/config.json":[function(require,module,exports){
module.exports={
    "stylesheet": "note.scss",
    "selector": ".note",
    "options": {}
}

},{}],"/src/widget/note/notewidget.js":[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modilabs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function(require, exports, module){
    'use strict';
    var Widget = require('../../js/Widget');
    var $ = require('jquery');
    require('../../js/plugins');

    var pluginName = 'notewidget';

    /**
     * Enhances notes
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Notewidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Notewidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Notewidget.prototype.constructor = Notewidget;

    Notewidget.prototype._init = function() {
        var $el = $( this.element );
        $el.find( '.question-label' ).markdownToHtml()
            .end().find( '[readonly]' ).addClass( 'ignore' );

        if ( $el.is( '.note' ) && !$el.next().is( '.note' ) ) {
            $el.addClass( 'last-of-class' );
        }
    };

    Notewidget.prototype.destroy = function( element ) {};

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Notewidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = pluginName;
} );

},{"../../js/Widget":13,"../../js/plugins":15,"jquery":2}],"/src/widget/radio/config.json":[function(require,module,exports){
module.exports={
    "stylesheet": "radiopicker.scss",
    "selector": "form",
    "options": {}
}

},{}],"/src/widget/radio/radiopicker.js":[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function(require, exports, module){
    'use strict';
    var Widget = require('../../js/Widget');
    var $ = require('jquery');
    require('../../js/plugins');

    var $lastFocused = null,
        pluginName = 'radiopicker';

    /**
     * Enhances radio buttons
     *
     * @constructor
     * @param {Element} element Element to apply widget to.
     * @param {(boolean|{touch: boolean})} options options
     * @param {*=} event     event
     */

    function Radiopicker( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    // Copy the prototype functions from the Widget super class
    Radiopicker.prototype = Object.create( Widget.prototype );

    // Ensure the constructor is the new one
    Radiopicker.prototype.constructor = Radiopicker;

    /**
     * Initialize
     */
    Radiopicker.prototype._init = function() {
        this._setDelegatedHandlers();
    };

    /**
     * Set delegated event handlers
     */
    Radiopicker.prototype._setDelegatedHandlers = function() {
        var $label, $input,
            $form = $( this.element );
        // Applies a data-checked attribute to the parent label of a checked checkbox and radio button
        $form.on( 'click', 'input[type="radio"]:checked', function( event ) {
            $( this ).parent( 'label' ).siblings().removeAttr( 'data-checked' ).end().attr( 'data-checked', 'true' );
        } );

        $form.on( 'click', 'input[type="checkbox"]', function( event ) {
            $input = $( this );
            $label = $input.parent( 'label' );
            if ( $input.is( ':checked' ) ) {
                $label.attr( 'data-checked', 'true' );
            } else {
                $label.removeAttr( 'data-checked' );
            }
        } );

        // new radiobutton/checkbox icons don't trigger focus event, which is necessary for 
        // progress update and subtle "required" message
        // we need to unfocus the previously focused element
        $form.on( 'click', 'input[type="radio"], input[type="checkbox"]', function( event ) {
            if ( $lastFocused ) {
                $lastFocused.trigger( 'fakeblur' );
            }
            $lastFocused = $( this ).trigger( 'fakefocus' );
        } );

        // clear last focused element when a non-radio/checkbox element gets focus
        $form.on( 'focusin fakefocus', 'input:not([type="radio"], [type="checkbox"]), textarea, select', function( event ) {
            if ( $lastFocused ) {
                $lastFocused.trigger( 'fakeblur' );
            }
            $lastFocused = null;
        } );

        //defaults
        $form.find( 'input[type="radio"]:checked, input[type="checkbox"]:checked' ).parent( 'label' ).attr( 'data-checked', 'true' );

        //add unselect functionality
        $form.on( 'click', '[data-checked]>input[type="radio"]:not(.no-unselect)', function( event ) {
            $( this ).prop( 'checked', false ).trigger( 'change' ).parent().removeAttr( 'data-checked' );
        } );
    };

    /**
     * Override default destroy method to do nothing
     *
     * @param  {Element} element The element (not) to destroy the widget on ;)
     */
    Radiopicker.prototype.destroy = function( element ) {
        //all handlers are global and deep copies of repeats should keep functionality intact
    };


    $.fn[ pluginName ] = function( options, event ) {
        //this widget works globally, and only needs to be instantiated once per form
        var $this = $( this ),
            data = $this.data( pluginName );

        options = options || {};

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, ( data = new Radiopicker( $this[ 0 ], options, event ) ) );
        } else if ( data && typeof options === 'string' ) {
            data[ options ]( this );
        }

        return this;
    };

    module.exports = pluginName;
} );

},{"../../js/Widget":13,"../../js/plugins":15,"jquery":2}],"/src/widget/select-desktop/config.json":[function(require,module,exports){
module.exports={
    "stylesheet": "selectpicker.scss",
    "selector": "select:not(#form-languages)",
    "options": {}
}

},{}],"/src/widget/select-desktop/selectpicker.js":[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * @preserve Copyright 2012 Silvio Moreto, Martijn van de Rijdt & Modilabs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function(require, exports, module){
    'use strict';
    var $ = require('jquery');
    var Widget = require('../../js/Widget');

    var pluginName = 'desktopSelectpicker';

    /**
     * Bootstrap Select picker that supports single and multiple selects
     * A port of https://github.com/silviomoreto/bootstrap-select
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, btnStyle: string, noneSelectedText: string, maxlength:number})} options options
     * @param {*=} e     event
     */

    function DesktopSelectpicker( element, options, e ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        if ( e ) {
            e.stopPropagation();
            e.preventDefault();
        }

        this.$picker = null;
        this.noneSelectedText = options.noneSelectedText || 'none selected';
        this.lengthmax = options.maxlength || 15;
        this.multiple = ( typeof $( element ).attr( 'multiple' ) !== 'undefined' && $( element ).attr( 'multiple' ) !== false );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    DesktopSelectpicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    DesktopSelectpicker.prototype.constructor = DesktopSelectpicker;

    DesktopSelectpicker.prototype._init = function() {
        var $template = this._getTemplate(),
            $select = $( this.element );
        $select.css( 'display', 'none' );
        $template = this._createLi( $template );
        this.$picker = $template.insertAfter( $select );
        this.$picker.find( '> a' ).addClass( this.selectClass );
        this._clickListener();
        this._focusListener();
    };

    DesktopSelectpicker.prototype._getTemplate = function() {
        var template =
            '<div class="btn-group bootstrap-select widget clearfix">' +
            '<button type="button" class="btn btn-default dropdown-toggle clearfix" data-toggle="dropdown">' +
            '<span class="selected">__SELECTED_OPTIONS</span><span class="caret"></span>' +
            '</button>' +
            '<ul class="dropdown-menu" role="menu">' +
            '__ADD_LI' +
            '</ul>' +
            '</div>';

        return template;
    };

    DesktopSelectpicker.prototype._createLi = function( template ) {

        var li = [];
        var liHtml = '';
        var inputAttr = ( this.multiple ) ? 'type="checkbox"' : 'type="radio" name="' + Math.random() * 100000 + '"';
        var _this = this;
        var checkedInputAttr,
            checkedLiAttr;

        $( this.element ).find( 'option' ).each( function() {
            li.push( {
                label: $( this ).text(),
                selected: $( this ).is( ':selected' ),
                value: $( this ).attr( 'value' )
            } );
        } );

        if ( li.length > 0 ) {
            template = template.replace( '__SELECTED_OPTIONS', this._createSelectedStr() );
            for ( var i = 0; i < li.length; i++ ) {
                if ( li[ i ].value ) {
                    checkedInputAttr = ( li[ i ].selected ) ? ' checked="checked"' : '';
                    checkedLiAttr = ( li[ i ].selected && !_this.multiple ) ? 'class="active"' : '';
                    /**
                     * e.g.:
                     * <li checked="checked">
                     *   <a class="option-wrapper" tabindex="-1" href="#">
                     *         <label>
                     *           <input class="ignore" type="checkbox" checked="checked" value="a"/>
                     *         </label>
                     *       </a>
                     *    </li>
                     */
                    liHtml +=
                        '<li ' + checkedLiAttr + '>' +
                        '<a class="option-wrapper" tabindex="-1" href="#">' +
                        '<label>' +
                        '<input class="ignore" ' + inputAttr + checkedInputAttr + 'value="' + li[ i ].value + '" />' +
                        '<span class="option-label">' + li[ i ].label + '</span></label>' +
                        '</a>' +
                        '</li>';
                }
            }
        }

        template = template.replace( '__ADD_LI', liHtml );

        return $( template );
    };


    /**
     * create text to show in closed picker
     * @param  {jQuery=} $select  jQuery-wrapped select element
     * @return {string}
     */
    DesktopSelectpicker.prototype._createSelectedStr = function() {
        var textToShow,
            selectedLabels = [],
            $select = $( this.element );
        $select.find( 'option:selected' ).each( function() {
            if ( $( this ).attr( 'value' ).length > 0 ) {
                selectedLabels.push( $( this ).text() );
            }
        } );

        if ( selectedLabels.length === 0 ) {
            return this.noneSelectedText;
        }
        textToShow = selectedLabels.join( ', ' );
        return ( textToShow.length > this.lengthmax ) ? selectedLabels.length + ' selected' : textToShow;
    };

    DesktopSelectpicker.prototype._clickListener = function() {
        var _this = this;

        this.$picker.on( 'click', 'li:not(.disabled)', function( e ) {
            e.preventDefault();
            var $li = $( this ),
                $input = $li.find( 'input' ),
                $select = $( _this.element ),
                $option = $select.find( 'option[value="' + $input.val() + '"]' ),
                selectedBefore = $option.is( ':selected' );

            if ( !_this.multiple ) {
                _this.$picker.find( 'li' ).removeClass( 'active' );
                $option.siblings( 'option' ).prop( 'selected', false );
                _this.$picker.find( 'input' ).prop( 'checked', false );
            } else {
                //don't close dropdown for multiple select
                e.stopPropagation();
            }

            if ( selectedBefore ) {
                $li.removeClass( 'active' );
                $input.prop( 'checked', false );
                $option.prop( 'selected', false );
            } else {
                if ( !_this.multiple ) {
                    $li.addClass( 'active' );
                }
                $input.prop( 'checked', true );
                $option.prop( 'selected', true );
            }

            _this.$picker.find( '.selected' ).html( _this._createSelectedStr() );

            $select.trigger( 'change' );
        } );
    };

    DesktopSelectpicker.prototype._focusListener = function() {
        var _this = this;

        this.$picker.on( 'shown.bs.dropdown', function() {
            $( _this.element ).trigger( 'fakefocus' );
            return true;
        } ).on( 'hidden.bs.dropdown', function() {
            $( _this.element ).trigger( 'fakeblur' );
            return true;
        } );
    };

    //override super method
    DesktopSelectpicker.prototype.disable = function() {
        this.$picker.find( 'li' ).addClass( 'disabled' );
    };

    //override super method
    DesktopSelectpicker.prototype.enable = function() {
        this.$picker.find( 'li' ).removeClass( 'disabled' );
    };

    //override super method
    DesktopSelectpicker.prototype.update = function() {
        this.$picker.remove();
        this._init();
    };

    /**
     * [selectpicker description]
     * @param {({btnStyle: string, noneSelectedText: string, maxlength:number}|string)=} option options
     * @param {*=} event       [description]
     */
    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {

            var $this = $( this ),
                data = $this.data( pluginName );

            //only instantiate if options is an object AND if options.touch is falsy
            if ( !data && typeof options === 'object' && !options.touch ) {
                $this.data( pluginName, ( data = new DesktopSelectpicker( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    + function( $ ) {
        //'use strict';

        // DROPDOWN CLASS DEFINITION
        // =========================

        var backdrop = '.dropdown-backdrop';
        var toggle = '[data-toggle=dropdown]';
        var Dropdown = function( element ) {
            $( element ).on( 'click.bs.dropdown', this.toggle );
        };

        Dropdown.prototype.toggle = function( e ) {
            var $this = $( this );

            if ( $this.is( '.disabled, :disabled' ) ) {
                return;
            }

            var $parent = getParent( $this );
            var isActive = $parent.hasClass( 'open' );

            clearMenus();

            if ( !isActive ) {
                if ( 'ontouchstart' in document.documentElement && !$parent.closest( '.navbar-nav' ).length ) {
                    // if mobile we use a backdrop because click events don't delegate
                    $( '<div class="dropdown-backdrop"/>' ).insertAfter( $( this ) ).on( 'click', clearMenus );
                }

                var relatedTarget = {
                    relatedTarget: this
                };
                $parent.trigger( e = $.Event( 'show.bs.dropdown', relatedTarget ) );

                if ( e.isDefaultPrevented() ) {
                    return;
                }

                $parent
                    .toggleClass( 'open' )
                    .trigger( 'shown.bs.dropdown', relatedTarget );

                $this.focus();
            }

            return false;
        };

        Dropdown.prototype.keydown = function( e ) {
            var k = e.keyCode;

            if (k != 27 && k != 38 && k != 40) {
              return;
            }

            var $this = $( this );

            e.preventDefault();
            e.stopPropagation();

            if ( $this.is( '.disabled, :disabled' ) ) {
                return;
            }

            var $parent = getParent( $this );
            var isActive = $parent.hasClass( 'open' );

            if ( !isActive || ( isActive && e.keyCode === 27 ) ) {
                if ( e.which === 27 ) {
                    $parent.find( toggle ).focus();
                }
                return $this.click();
            }

            var desc = ' li:not(.divider):visible a';
            var $items = $parent.find( '[role=menu]' + desc + ', [role=listbox]' + desc );

            if ( !$items.length ) {
                return;
            }

            var index = $items.index( $items.filter( ':focus' ) );

            if ( e.keyCode === 38 && index > 0 ) {
                index--; // up
            }
            if ( e.keyCode === 40 && index < $items.length - 1 ) {
                index++; // down
            }
            if ( !~index ) {
                index = 0;
            }

            $items.eq( index ).focus();
        };

        function clearMenus( e ) {
            $( backdrop ).remove();
            $( toggle ).each( function() {
                var $parent = getParent( $( this ) );
                var relatedTarget = {
                    relatedTarget: this
                };
                if ( !$parent.hasClass( 'open' ) ) {
                    return;
                }
                $parent.trigger( e = $.Event( 'hide.bs.dropdown', relatedTarget ) );
                if ( e.isDefaultPrevented() ) {
                    return;
                }
                $parent.removeClass( 'open' ).trigger( 'hidden.bs.dropdown', relatedTarget );
            } );
        }

        function getParent( $this ) {
            var selector = $this.attr( 'data-target' );

            if ( !selector ) {
                selector = $this.attr( 'href' );
                selector = selector && /#[A-Za-z]/.test( selector ) && selector.replace( /.*(?=#[^\s]*$)/, '' ); //strip for ie7
            }

            var $parent = selector && $( selector );

            return $parent && $parent.length ? $parent : $this.parent();
        }


        // DROPDOWN PLUGIN DEFINITION
        // ==========================

        var old = $.fn.dropdown;

        $.fn.dropdown = function( option ) {
            return this.each( function() {
                var $this = $( this );
                var data = $this.data( 'bs.dropdown' );

                if ( !data ) {
                    $this.data( 'bs.dropdown', ( data = new Dropdown( this ) ) );
                }
                if ( typeof option === 'string' ) {
                    data[ option ].call( $this );
                }
            } );
        };

        $.fn.dropdown.Constructor = Dropdown;


        // DROPDOWN NO CONFLICT
        // ====================

        $.fn.dropdown.noConflict = function() {
            $.fn.dropdown = old;
            return this;
        };


        // APPLY TO STANDARD DROPDOWN ELEMENTS
        // ===================================

        $( document )
            .on( 'click.bs.dropdown.data-api', clearMenus )
            .on( 'click.bs.dropdown.data-api', '.dropdown form', function( e ) {
                e.stopPropagation();
            } )
            .on( 'click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle )
            .on( 'keydown.bs.dropdown.data-api', toggle + ', [role=menu], [role=listbox]', Dropdown.prototype.keydown );

    }( jQuery );

    module.exports = pluginName;
} );

},{"../../js/Widget":13,"jquery":2}],"/src/widget/select-mobile/config.json":[function(require,module,exports){
module.exports={
    "stylesheet": "selectpicker.scss",
    "selector": "select[multiple]",
    "options": {}
}

},{}],"/src/widget/select-mobile/selectpicker.js":[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * @preserve Copyright 2013 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function(require, exports, module){
    'use strict';
    var $ = require('jquery');
    var Widget = require('../../js/Widget');

    var pluginName = 'mobileSelectpicker';

    /**
     * An enhancement for the native multi-selectpicker found on most mobile devices,
     * that shows the selected values next to the select box
     *
     * @constructor
     * @param {Element} element Element to apply widget to.
     * @param {(boolean|{touch: boolean})} options options
     * @param {*=} e     event
     */

    function MobileSelectpicker( element, options, e ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    MobileSelectpicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    MobileSelectpicker.prototype.constructor = MobileSelectpicker;

    /**
     * initialize
     */
    MobileSelectpicker.prototype._init = function() {
        var that = this;

        //show values on change
        $( this.element ).on( 'change.' + pluginName, function() {
            that._showSelectedValues();
            return true;
        } );

        //show defaults
        this._showSelectedValues();
    };

    /**
     * display the selected values
     */
    MobileSelectpicker.prototype._showSelectedValues = function() {
        var i, valueText = [],
            template = '<span class="widget mobileselect"></span>',
            $select = $( this.element ),
            $widget = ( $select.next( '.widget' ).length > 0 ) ? $select.next( '.widget' ) : $( template ).insertAfter( $select ),
            values = ( $.isArray( $select.val() ) ) ? $select.val() : [ $select.val() ];

        for ( i = 0; i < values.length; i++ ) {
            valueText.push( $( this ).find( 'option[value="' + values[ i ] + '"]' ).text() );
        }

        $widget.text( values.join( ', ' ) );
    };

    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            //only instantiate if options is an object AND if options.touch is truthy
            if ( !data && typeof options === 'object' && options.touch ) {
                $this.data( pluginName, ( data = new MobileSelectpicker( this, options, event ) ) );
            }
            if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = pluginName;
} );

},{"../../js/Widget":13,"jquery":2}],"/src/widget/table/config.json":[function(require,module,exports){
module.exports={
    "stylesheet": "tablewidget.scss",
    "selector": null,
    "options": {}
}

},{}],"/src/widget/table/tablewidget.js":[function(require,module,exports){
;

},{}],"/src/widget/time/config.json":[function(require,module,exports){
module.exports={
    "stylesheet": "timepicker-extended.scss",
    "selector": "input[type=\"time\"]:not([readonly])",
    "options": {}
}

},{}],"/src/widget/time/timepicker-extended.js":[function(require,module,exports){
if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
    var define = function (factory) {
        factory(require, exports, module);
    };
}
/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function(require, exports, module){
    'use strict';
    var Widget = require('../../js/Widget');
    var support = require('../../js/support');
    var $ = require('jquery');
    require('./bootstrap3-timepicker/js/bootstrap-timepicker');

        var pluginName = 'timepickerExtended';

        /**
         * Extends jdewit's bootstrap-timepicker without changing the original
         * https://github.com/jdewit/bootstrap-timepicker
         * TODO: I'd like to find a replacement for jdewit's widget during the move to bootstrap 3.
         *
         * @constructor
         * @param {Element}                       element   Element to apply widget to.
         * @param {(boolean|{touch: boolean})}    options   options
         * @param {*=}                            event     event
         */

        function TimepickerExtended( element, options ) {
            this.namespace = pluginName;
            //call the Super constructor
            Widget.call( this, element, options );
            this._init();
        }

        //copy the prototype functions from the Widget super class
        TimepickerExtended.prototype = Object.create( Widget.prototype );

        //ensure the constructor is the new one
        TimepickerExtended.prototype.constructor = TimepickerExtended;

        /**
         * Initialize timepicker widget
         */
        TimepickerExtended.prototype._init = function() {
            var $timeI = $( this.element ),
                timeVal = $( this.element ).val(),
                $fakeTime = $( '<div class="widget bootstrap-timepicker">' +
                    '<input class="ignore timepicker-default input-small" readonly="readonly" type="text" value="' + timeVal + '" placeholder="hh:mm" />' +
                    '<button class="btn-icon-only btn-reset" type="button"><i class="icon icon-refresh"> </i></button></div>' ),
                $fakeTimeReset = $fakeTime.find( '.btn-reset' ),
                $fakeTimeI = $fakeTime.find( 'input' );

            $timeI.next( '.widget.bootstrap-timepicker-component' ).remove();
            $timeI.hide().after( $fakeTime );

            $fakeTimeI.timepicker( {
                    defaultTime: ( timeVal.length > 0 ) ? timeVal : 'current',
                    showMeridian: false
                } ).val( timeVal )
                //the time picker itself has input elements
                .closest( '.widget' ).find( 'input' ).addClass( 'ignore' );

            $fakeTimeI.on( 'change', function() {
                var $this = $( this ),
                    // the following line can be removed if https://github.com/jdewit/bootstrap-timepicker/issues/202 gets approved
                    val = ( /^[0-9]:/.test( $this.val() ) ) ? '0' + $this.val() : $this.val();
                // add 00 minutes if they are missing (probably a bug in bootstrap timepicker)
                val = ( /^[0-9]{2}:$/.test( val ) ) ? val + '00' : val;
                $timeI.val( val ).trigger( 'change' ).blur();
                return false;
            } );

            //reset button
            $fakeTimeReset.on( 'click', function() {
                $fakeTimeI.val( '' ).trigger( 'change' );
            } );

            $fakeTimeI.on( 'focus blur', function( event ) {
                $timeI.trigger( 'fake' + event.type );
            } );
        };

        $.fn[ pluginName ] = function( options, event ) {

            options = options || {};

            return this.each( function() {
                var $this = $( this ),
                    data = $this.data( pluginName );

                if ( !data && typeof options === 'object' && ( !options.touch || !support.inputtypes.time ) ) {
                    $this.data( pluginName, ( data = new TimepickerExtended( this, options, event ) ) );
                }
                //only call method if widget was instantiated before
                else if ( data && typeof options === 'string' ) {
                    //pass the element as a parameter as this is used in fix()
                    data[ options ]( this );
                }
            } );
        };

        module.exports = pluginName;
    } );

},{"../../js/Widget":13,"../../js/support":16,"./bootstrap3-timepicker/js/bootstrap-timepicker":19,"jquery":2}]},{},[7]);
