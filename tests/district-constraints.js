var _ = require('underscore'),
    sinon = require('sinon'),
    users = require('users'),
    utils = require('kujua-utils'),
    db;

exports.setUp = function(callback) {
    db = { 
        getDoc: function() {}
    };
    callback();
}

exports.tearDown = function(callback) {
    if (users.get.restore) {
        users.get.restore();
    }
    callback();
};

exports['checkDistrictConstraint exposed'] = function(test) {
    test.ok(_.isFunction(utils.checkDistrictConstraint));
    test.equals(utils.checkDistrictConstraint.length, 3);
    test.done();
};

exports['when getUserDistrict returns error, callback with error'] = function(test) {
    sinon.stub(users, 'get').callsArgWithAsync(1, 'd e d dead');

    utils.checkDistrictConstraint({ }, db, function(err) {
        test.equals(err, 'd e d dead');
        test.done();
    });
};

exports['when no district, callback with error'] = function(test) {
    sinon.stub(users, 'get').callsArgWithAsync(1, null, {});

    utils.checkDistrictConstraint({ }, db, function(err) {
        test.equals(err, 'No district assigned to district admin.');
        test.done();
    });
};

exports['when district that does not exist callback with error'] = function(test) {
    sinon.stub(users, 'get').callsArgWithAsync(1, null, { facility_id: 'abc' });
    sinon.stub(db, 'getDoc').callsArgWithAsync(1, { error: 'not_found' });

    utils.checkDistrictConstraint({ }, db, function(err) {
        test.equals(err,
            'No facility found with id \'abc\'. Your admin needs to update the Facility Id in your user details.'
        );
        test.done();
    });
}

exports['when district that exists but not district_hospital callback with error'] = function(test) {
    sinon.stub(users, 'get').callsArgWithAsync(1, null, { facility_id: 'abc' });
    sinon.stub(db, 'getDoc').callsArgWithAsync(1, null, {
        name: 'horsepiddle',
        type: 'quack'
    });

    utils.checkDistrictConstraint({ }, db, function(err) {
        test.equals(err,
            'horsepiddle (id: \'abc\') is not a district hospital. Your admin needs to update the Facility Id in your user details.'
        );
        test.done();
    });
}

exports['when district that exists callback with no error'] = function(test) {
    sinon.stub(users, 'get').callsArgWithAsync(1, null, { facility_id: 'abc' });
    sinon.stub(db, 'getDoc').callsArgWithAsync(1, null, { type: 'district_hospital' });

    utils.checkDistrictConstraint({ }, db, function(err, facility) {
        test.equals(err, null);
        test.equals(facility, 'abc');
        test.done();
    });
}
