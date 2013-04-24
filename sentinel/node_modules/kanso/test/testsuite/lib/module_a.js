var b = require('./module_b');

exports.name = 'Module A';

exports.b_name = function () {
    return b.name;
};
