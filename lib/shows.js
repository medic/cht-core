/**
 * Show functions to be exported from the design doc.
 */

var templates = require('duality/templates'),
    settings = require('settings/root'),
    shows = require('kujua-sms/shows');

exports.sms_forms = shows.sms_forms;

exports.docs = function (doc, req) {
    var slug = req.query.page || 'index',
        page = 'docs/' + slug + '.md';

    return {
        title: 'Docs',
        settings: settings,
        slug: slug,
        content: templates.render('docs.html', req, {})
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
        content: templates.render('404.html', req, {})
    };
};
