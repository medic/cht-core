/**
 * Module dependencies
 */

var session = require('session'),
    templates = require('duality/templates'),
    duality_events = require('duality/events'),
    utils = require('duality/utils'),
    cookies = require('cookies'),
    db = require('db'),
    controls = require('./controls');

/**
 * Creates a fake request to /_session to pass to sessionChange, useful
 * when using functions such as templates.render
 *
 * @name fakeRequest(userCtx, callback)
 * @param {Object} userCtx
 * @param {Function} callback
 * @api public
 */

var fakeRequest = function (userCtx, callback) {
    db.newUUID(100, function (err, uuid) {
        if (err) {
            return callback(err);
        }
        callback(null, {
            userCtx: userCtx,
            uuid: uuid,
            method: 'GET',
            query: {},
            headers: {},
            path: ['_session'],
            client: true,
            initial_hit: utils.initial_hit,
            cookie: cookies.readBrowserCookies()
        });
    });
};

duality_events.on('init', function () {
    controls.bind();
});

session.on('change', function (userCtx) {
    fakeRequest(userCtx, function (err, req) {
        if (err) {
            return console.error(err);
        }
        $('#session').replaceWith(
            templates.render('duality-contrib-session/session.html', req, userCtx)
        );
        controls.bind();
    });
});
