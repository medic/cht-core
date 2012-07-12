var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    logger = require('kujua-utils').logger,
    baseURL = require('duality/core').getBaseURL(),
    appdb = require('duality/core').getDBURL(),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');


var example = {
    clinic: {
        "_id": "4a6399c98ff78ac7da33b639ed60f458",
        "_rev": "1-0b8990a46b81aa4c5d08c4518add3786",
        "type": "clinic",
        "name": "Example clinic 1",
        "contact": {
            "name": "Sam Jones",
            "phone": "+13125551212"
        },
        "parent": {
            "type": "health_center",
            "contact": {
                "name": "Neal Young",
                "phone": "+17085551212"
            },
            "parent": {
                "type": "district_hospital",
                "contact": {
                    "name": "Bernie Mac",
                    "phone": "+14155551212"
                }
            }
        }
    }
};


/*
 * Assert that success message is sent when required fields are met.
 *
 */
exports.sms_fields_validation = function (test) {
    test.expect(19);

    var data = {
        from: '+13125551212',
        message: "1!TEST!facility#2011",
        sent_timestamp: '01-19-12 18:45',
        sent_to: '+15551212'
    };

    var req = {
        uuid: '14dc3a5aa6',
        method: "POST",
        headers: helpers.headers("url", querystring.stringify(data)),
        body: querystring.stringify(data),
        form: data
    };

    var resp = fakerequest.update(updates.add_sms, data, req);

    var resp_body = JSON.parse(resp[1].body);

    test.same(resp_body.payload.success, true);
    test.same(resp_body.payload.messages[0].message,
        "Zikomo!");

    test.same(resp_body.callback.data.errors, []);

    test.same(
        resp_body.callback.options.path,
        baseURL + "/TEST/data_record/add/clinic/%2B13125551212");

    step1_with_extra_fields(test);

};


/*
 * Assert that a 'form_extra_fields' message gets sent
 * when a form with extra fields is submitted and
 * assert .errors is set.
 *
 */
var step1_with_extra_fields = function(test) {

    var data = {
        from: '+13125551212',
        message: "1!TEST!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4#123",
        sent_timestamp: '01-19-12 18:45',
        sent_to: '+15551212'
    };

    var req = {
        uuid: '14dc3a5aa6',
        method: "POST",
        headers: helpers.headers("url", querystring.stringify(data)),
        body: querystring.stringify(data),
        form: data
    };

    var resp = fakerequest.update(updates.add_sms, data, req);

    var resp_body = JSON.parse(resp[1].body);

    test.same(resp_body.payload.success, true);
    test.same(resp_body.payload.messages[0].message,
        "Extra fields.");

    test.same(resp_body.callback.data.errors[0], {code: "extra_fields"});

    step1_with_errors(test);

};


/*
 * STEP 1 WITH ERRORS:
 *
 * Run add_sms and expect errors to appear on the
 * callback object.
 *
 */
var step1_with_errors = function(test) {
    var data = {
        from: '+13125551212',
        message: '1!TEST!a',
        sent_timestamp: '01-19-12 18:45',
        sent_to: '+15551212'
    };

    var req = {
        uuid: '14dc3a5aa6',
        method: "POST",
        headers: helpers.headers("url", querystring.stringify(data)),
        body: querystring.stringify(data),
        form: data
    };

    var resp = fakerequest.update(updates.add_sms, data, req);

    var resp_body = JSON.parse(resp[1].body);

    test.same(resp_body.payload.success, true);
    test.same(resp_body.payload.messages[0].message,
        "Missing fields: year.");

    test.same(resp_body.callback.data.errors[0],
        {code: "missing_fields", fields: ["year"]});

    test.same(
        resp_body.callback.options.path,
        baseURL + "/TEST/data_record/add/clinic/%2B13125551212");

    step2_with_errors(test, helpers.nextRequest(resp_body, 'TEST'));

};


/*
 * STEP 2 WITH ERRORS:
 *
 * Run data_record/add/clinic and expect a callback to
 * check if the same data record already exists when
 * there were errors in the add_sms function.
 *
 */
var step2_with_errors = function(test, req) {
    var clinic = example.clinic;

    var viewdata = {rows: [
        {
            "key": ["+13125551212"],
            "value": clinic
        }
    ]};

    var resp = fakerequest.list(lists.data_record, viewdata, req);

    var resp_body = JSON.parse(resp.body);

    test.same(resp_body.callback.data.errors[0],
        {code: "missing_fields", fields: ["year"]});

    step3_with_errors(test, helpers.nextRequest(resp_body, 'TEST'));
};


/*
 * STEP 3 WITH ERRORS:
 *
 * Check that when posting again with the same
 * phone and wkn the data is overwritten on
 * the original record.
 *
 */
var step3_with_errors = function(test, req) {
    var viewdata = {rows: [
        {
            key: ["%2B13125551212", "2", "777399c98ff78ac7da33b639ed60f422"],
            value: {
                _id: "777399c98ff78ac7da33b639ed60f422",
                _rev: "484399c98ff78ac7da33b639ed60f923",
                facility_id: "a",
                year: "b"
            }
        }
    ]};

    var resp = fakerequest.list(lists.data_record_merge, viewdata, req);
    var resp_body = JSON.parse(resp.body);

    test.same(
        resp_body.callback.data._rev,
        "484399c98ff78ac7da33b639ed60f923");

    test.same(
        resp_body.callback.options.path,
        appdb + "/777399c98ff78ac7da33b639ed60f422");

    test.same(
        resp_body.callback.options.method,
        "PUT");

    test.same(resp_body.callback.data.tasks, []);

    test.same(resp_body.callback.data.errors[0],
        {code: "missing_fields", fields: ["year"]});

    var body = JSON.parse(req.body);
    body.errors = [];
    body.bar = 5;
    req.body = JSON.stringify(body);

    var viewdata = {rows: [
        {
            key: ["%2B13125551212", "2", "777399c98ff78ac7da33b639ed60f422"],
            value: {
                _id: "777399c98ff78ac7da33b639ed60f422",
                _rev: "484399c98ff78ac7da33b639ed60f923",
                facility_id: "a",
                errors: [{code: "missing_fields", fields: ['year']}]
            }
        }
    ]};

    var resp = fakerequest.list(lists.data_record_merge, viewdata, req);
    var resp_body = JSON.parse(resp.body);

    test.same(resp_body.callback.data.errors, []);
    test.same(resp_body.callback.data.bar, 5);

    test.done();
};
