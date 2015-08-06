'use strict';

var _ = require('underscore'),
    sinon = require('sinon'),
    users = require('users'),
    utils = require('kujua-utils'),
    cookies = require('cookies'),
    db;

exports.setUp = function(callback) {
    db = { 
        getDoc: function() {}
    };
    callback();
};

exports.tearDown = function(callback) {
    if (users.get.restore) {
        users.get.restore();
    }
    if (cookies.readBrowserCookies.restore) {
        cookies.readBrowserCookies.restore();
    }
    callback();
};

exports['checkDistrictConstraint exposed'] = function(test) {
    test.ok(_.isFunction(utils.checkDistrictConstraint));
    test.equals(utils.checkDistrictConstraint.length, 3);
    test.done();
};

exports['when no district, callback with error'] = function(test) {
    sinon.stub(cookies, 'readBrowserCookies').returns({});
    sinon.stub(users, 'get').callsArgWithAsync(1, null, {});

    utils.checkDistrictConstraint({ }, db, function(err) {
        test.equals(err.message, 'No district assigned to district admin.');
        test.done();
    });
};

exports['when district that does not exist callback with error'] = function(test) {
    sinon.stub(cookies, 'readBrowserCookies').returns({});
    sinon.stub(users, 'get').callsArgWithAsync(1, null, { facility_id: 'abc' });
    sinon.stub(db, 'getDoc').callsArgWithAsync(1, { error: 'not_found' });

    utils.checkDistrictConstraint({ }, db, function(err) {
        test.equals(err.message,
            'No facility found with id \"abc\". Your admin needs to update the Facility Id in your user details.'
        );
        test.done();
    });
};

exports['when district that exists callback with no error'] = function(test) {
    sinon.stub(cookies, 'readBrowserCookies').returns({});
    sinon.stub(users, 'get').callsArgWithAsync(1, null, { facility_id: 'abc' });
    sinon.stub(db, 'getDoc').callsArgWithAsync(1, null, { type: 'district_hospital' });

    utils.checkDistrictConstraint({ }, db, function(err, facility) {
        test.equals(err, null);
        test.equals(facility, 'abc');
        test.done();
    });
};

exports['fetch district from cookies'] = function(test) {
    sinon.stub(cookies, 'readBrowserCookies').returns({ facility_id: 'abc' });
    sinon.stub(db, 'getDoc').callsArgWithAsync(1, null, { type: 'district_hospital' });

    utils.checkDistrictConstraint({ }, db, function(err, facility) {
        test.equals(err, null);
        test.equals(facility, 'abc');
        test.done();
    });
};
