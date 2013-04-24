var a = require('./module_a');

exports.name = 'Module B';

exports.a_name = function () {
    return a.name;
};
