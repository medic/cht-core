/**
 * Show functions to be exported from the design doc.
 */

var templates = require('duality/templates'),
    settings = require('settings/root');

exports.docs = function (doc, req) {
    return {
        title: 'Docs',
        settings: settings,
        content: templates.render('docs.html', req, {})
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
        content: templates.render('404.html', req, {})
    };
};
