var utils = require('kujua-utils');

exports['hasPerm returns false if no user'] = function(test) {
    test.equal(utils.hasPerm(undefined, 'abc'), false);
    test.done();
};

exports['hasPerm returns false if no user roles'] = function(test) {
    test.equal(utils.hasPerm({}, 'abc'), false);
    test.done();
};

exports['hasPerm returns false if no perm'] = function(test) {
    test.equal(utils.hasPerm({roles: ['national_admin']}, undefined), false);
    test.done();
};

exports['hasPerm returns false if no known perm'] = function(test) {
    test.equal(utils.hasPerm({roles: ['national_admin']}, 'unknown'), false);
    test.done();
};

exports['hasPerm returns true if db admin'] = function(test) {
    test.equal(utils.hasPerm({roles: ['_admin']}, 'can_backup_facilities'), true);
    test.done();
};

exports['hasPerm returns true if user has role'] = function(test) {
    test.equal(utils.hasPerm({roles: ['national_admin']}, 'can_backup_facilities'), true);
    test.done();
};
