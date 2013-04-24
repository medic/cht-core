var utils = require('duality/utils');


exports['getBaseURL - browser'] = function (test) {
    // TODO: update this so it changes isBrowser on the utils module instead
    // this is probably why this test is failing
    utils.isBrowser = function () {
        return true;
    };
    var _getWindowLocation = utils.getWindowLocation;
    var testpath = function (p) {
        utils.getWindowLocation = function () {
            return {pathname: p};
        };
        return utils.getBaseURL();
    };
    test.equal(testpath('/'), '');
    test.equal(testpath('/some/path'), '');
    test.equal(
        testpath('/db/_design/doc/_rewrite/'),
        '/db/_design/doc/_rewrite'
    );
    test.equal(
        testpath('/db/_design/doc/_rewrite/some/path'),
        '/db/_design/doc/_rewrite'
    );
    utils.getWindowLocation = _getWindowLocation;
    utils.isBrowser = function () {
        return true;
    };
    test.done();
};

exports['getBaseURL - couchdb no vhost'] = function (test) {
    utils.isBrowser = function () {
        return false;
    };
    var testpath = function (p) {
        return utils.getBaseURL({path: p, headers: {}});
    };
    test.equal(
        testpath(['db', '_design', 'doc', '_show', 'testshow']),
        '/db/_design/doc/_rewrite'
    );
    test.equal(
        testpath(['db', '_design', 'doc', '_list', 'testlist']),
        '/db/_design/doc/_rewrite'
    );
    test.equal(
        testpath(['db', '_design', 'doc']),
        '/db/_design/doc/_rewrite'
    );
    utils.isBrowser = function () {
        return true;
    };
    test.done();
};

exports['getBaseURL - couchdb with vhost'] = function (test) {
    utils.isBrowser = function () {
        return false;
    };
    var testpath = function (p) {
        var req = {
            path: ['db', '_design', 'doc', '_show', 'testshow'],
            headers: {'x-couchdb-vhost-path': p}
        };
        return utils.getBaseURL(req);
    };
    test.equal(testpath('/'), '');
    test.equal(testpath('/some/path'), '');
    utils.isBrowser = function () {
        return true;
    };
    test.done();
};
