var utils = require('kanso-utils/utils');


exports.proxyShowFn = function (path, app, doc, props) {
    var str = 'function(doc, req){' +
        'var core = require("duality/core");' +
        'var fn = require("' + path.replace('"', '\\"') + '")';
    for (var i = 0; i < props.length; i++) {
        str += '["' + props[i].replace('"', '\\"') + '"]';
    }
    str += ';';
    str += 'return core.runShow.call(this, fn, doc, req);';
    str += '}';
    utils.setPropertyPath(doc, props.join('/'), str);
};

exports.proxyUpdateFn = function (path, app, doc, props) {
    var str = 'function(doc, req){' +
        'var core = require("duality/core");' +
        'var fn = require("' + path.replace('"', '\\"') + '")';
    for (var i = 0; i < props.length; i++) {
        str += '["' + props[i].replace('"', '\\"') + '"]';
    }
    str += ';';
    str += 'var r;';
    str += 'core.runUpdate.call(this, fn, doc, req, function (err, res) { r = res; });';
    str += 'return r;';
    str += '}';
    utils.setPropertyPath(doc, props.join('/'), str);
};

exports.proxyListFn = function (path, app, doc, props) {
    var str = 'function(head, req){' +
        'var core = require("duality/core");' +
        'var fn = require("' + path.replace('"', '\\"') + '")';
    for (var i = 0; i < props.length; i++) {
        str += '["' + props[i].replace('"', '\\"') + '"]';
    }
    str += ';';
    str += 'return core.runList.call(this, fn, head, req);';
    str += '}';
    utils.setPropertyPath(doc, props.join('/'), str);
};

exports.proxyFn = function (path, app, doc, props) {
    var str = 'function(){return require("' + path.replace('"', '\\"') + '")';
    for (var i = 0; i < props.length; i++) {
        str += '["' + props[i].replace('"', '\\"') + '"]';
    }
    str += '.apply(this, arguments);}';
    utils.setPropertyPath(doc, props.join('/'), str);
};

exports.proxyFns = function (path, app, doc, prop, wrapper) {
    wrapper = wrapper || exports.proxyFn;
    if (app[prop]) {
        for (var k in app[prop]) {
            if (app[prop].hasOwnProperty(k)) {
                wrapper(path, app, doc, [prop, k]);
            }
        }
    }
};
