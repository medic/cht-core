/**
 * Globals used by the CouchDB JS view server
 */

var noop = function () {};

send   = typeof send   !== 'undefined' ? send:   noop,
start  = typeof start  !== 'undefined' ? start:  noop,
getRow = typeof getRow !== 'undefined' ? getRow: noop,
log    = typeof log    !== 'undefined' ? log:    noop;


/**
 * Run show function. The response will always be converted to an
 * object, if a string is returned the object will be {body: <string>}
 *
 * @param {Function} showfn - the show function to call
 * @param {Object} doc - the JSON doc to pass to the show function
 * @parma {Object} req - the request object to pass to the show function
 */

exports.show = function (showfn, doc, req) {
    var val = showfn(doc, req);
    if (!(val instanceof Object)) {
        return {body: val};
    }
    return val;
};


/**
 * Run list function. Converts the JSON returned from a view into a
 * head object to pass to the list function and hooks up the global
 * getRow function to shift values off the rows property.
 *
 * @param {Function} listfn - the list function to call
 * @param {Object} viewdata - data returned by the view to use
 * @param {Object} req - the request object to pass to the list function
 */

exports.list = function (listfn, viewdata, req) {
    // store response passed to start()
    var start_res;

    // override global functions
    var _start = start;
    start = function (res) {
        start_res = res;
        _start(res);
    };
    var _send = send;
    send = function (data) {
        if (!start_res) {
            throw new Error('send function called before start');
        }
        if (!start_res.body) {
            start_res.body = '';
        }
        start_res.body += data;
        _send(data);
    };
    var _getRow = getRow;
    getRow = function () {
        return viewdata.rows.shift();
    };

    // create head object
    var head = {};
    for (var k in viewdata) {
        if (k !== 'rows') {
            head[k] = viewdata[k];
        }
    }

    // execute list function
    var val = listfn(head, req);

    // extend response object
    if (!start_res) {
        start_res = {code: 200, body: val};
    }
    else {
        start_res.body = start_res.body ? start_res.body + val: val;
    }

    // restore global functions
    start = _start;
    send = _send;
    getRow = _getRow;

    return start_res;
};


/**
 * Run update function. The response (second item in the returned array)
 * will always be converted to an object, if a string is returned the
 * object will be {body: <string>}.
 *
 * @param {Function} updatefn - the update function to call
 * @param {Object} doc - the JSON doc to pass to the update function
 * @parma {Object} req - the request object to pass to the update function
 */

exports.update = function (updatefn, doc, req) {
    var val = updatefn(doc, req);
    if (!(val[1] instanceof Object)) {
        return [val[0], {body: val[1]}];
    }
    return val;
};
