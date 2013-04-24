/*globals $: false, nodeunit: false */

/**
 * Show functions to be exported from the design doc.
 */

var templates = require('duality/templates'),
    forms = require('couchtypes/forms'),
    types = require('couchtypes/types'),
    utils = require('duality/utils');


exports.redirect_to_tests = function (doc, req) {
    return utils.redirect(req, '/test');
};

exports.not_found = function (doc, req) {
    var content = templates.render('404.html', req, {});

    if (req.client) {
        $('#content').html(content);
        document.title = '404 - Not Found';
    }
    else {
        return {code: 404, body: templates.render('base.html', req, {
            title: '404 - Not Found',
            content: content
        })};
    }
};

exports.test = function (doc, req) {
    var f = new forms.Form(
        new types.Type('test', { })
    );

    if (req.client) {
        throw new Error('Cannot run this test on client');
    } else {
        return f.toHTML();
    }
};

