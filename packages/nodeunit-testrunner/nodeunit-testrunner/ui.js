var nodeunit = require('nodeunit'),
    utils = require('./utils'),
    _ = require('underscore')._;


exports.init = function (baseURL) {
    var ul = $('<ul id="modules" />');
    var modules = utils.getTestModuleNames();
    _.each(modules, function (name) {
        var li = $('<li>' + name + '</li>');
        li.click(function (ev) {
            exports.run({'tests': require('tests/' + name)}, name);
        });
        ul.append(li);
    });

    var runall = $('<div id="runall">Run all tests</div>');
    runall.click(function () {
        exports.run(utils.getTestModules(), 'all');
    });

    $('#main').html('').append(ul).append(runall);
};

exports.run = function (modules, name) {
    $('#nodeunit-header').text('Tests: ' + name);
    $('#main').html(
        '<h2 id="nodeunit-banner"></h2>' +
        '<h2 id="nodeunit-userAgent"></h2>' +
        '<ol id="nodeunit-tests"></ol>' +
        '<p id="nodeunit-testresult"></p>'
    );
    nodeunit.run(modules);
};
