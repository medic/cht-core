var _ = require('underscore'),
    sinon = require('sinon'),
    utils = require('kujua-utils'),
    shows = require('lib/shows');

exports['checkDistrictConstraint exposed'] = function(test) {
    test.ok(_.isFunction(shows.checkDistrictConstraint));
    test.equals(shows.checkDistrictConstraint.length, 2);
    test.done();
};

exports['when getUserDistrict returns error, callback with error'] = function(test) {
    var getUserDistrict = sinon.stub(utils, 'getUserDistrict').callsArgWithAsync(1, 'd e d dead');

    shows.checkDistrictConstraint({}, function(err) {
        test.equals(err, 'd e d dead');
        getUserDistrict.restore();
        test.done();
    });
}

exports['when no district, callback with error'] = function(test) {
    var getUserDistrict = sinon.stub(utils, 'getUserDistrict').callsArgWithAsync(1, null, null);

    shows.checkDistrictConstraint({}, function(err) {
        test.equals(err, 'No district assigned to district admin.');
        getUserDistrict.restore();
        test.done();
    });
}

exports['when district that does not exist callback with error'] = function(test) {
    var db,
        getDoc,
        getUserDistrict = sinon.stub(utils, 'getUserDistrict').callsArgWithAsync(1, null, 'abc');

    db = {
        getDoc: function() {}
    };
    getDoc = sinon.stub(db, 'getDoc').callsArgWithAsync(1, {
        error: 'not_found'
    });

    shows.checkDistrictConstraint({
        db: db
    }, function(err) {
        test.equals(err,
            'No facility found with id \'abc\'. Your admin needs to update the Facility Id in your user details.'
        );
        getUserDistrict.restore();
        test.done();
    });
}

exports['when district that exists but not district_hospital callback with error'] = function(test) {
    var db,
        getDoc,
        getUserDistrict = sinon.stub(utils, 'getUserDistrict').callsArgWithAsync(1, null, 'abc');

    db = {
        getDoc: function() {}
    };
    getDoc = sinon.stub(db, 'getDoc').callsArgWithAsync(1, null, {
        type: 'quack'
    });

    shows.checkDistrictConstraint({
        db: db
    }, function(err) {
        test.equals(err,
            'Facility with id \'abc\' is not a district hospital. Your admin needs to update the Facility Id in your user details.'
        );
        getUserDistrict.restore();
        test.done();
    });
}

exports['when district that exists callback with no error'] = function(test) {
    var db,
        getDoc,
        getUserDistrict = sinon.stub(utils, 'getUserDistrict').callsArgWithAsync(1, null, 'abc');

    db = {
        getDoc: function() {}
    };
    getDoc = sinon.stub(db, 'getDoc').callsArgWithAsync(1, null, {
        type: 'district_hospital'
    });

    shows.checkDistrictConstraint({
        db: db
    }, function(err) {
        test.equals(err, null);
        getUserDistrict.restore();
        test.done();
    });
}
