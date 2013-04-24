/*globals kanso: false */

var _ = require('underscore')._;


// client-side only! relies on the kanso moduleCache
// returns an array of test module names
exports.getTestModuleNames = function () {
    var ids = _.keys(kanso.moduleCache);
    var test_ids = _.filter(ids, function (id) {
        return (/^tests\//).test(id);
    });
    var test_names = _.map(test_ids, function (id) {
        return id.replace(/^tests\//, '');
    });
    return test_names.sort();
};

// client-side only! relies on the kanso moduleCache
// returns an object containing all test modules keyed by id
exports.getTestModules = function () {
    return _.reduce(exports.getTestModuleNames(), function (modules, name) {
        modules[name] = require('tests/' + name);
        return modules;
    }, {});
};
