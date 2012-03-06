var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    baseURL = require('duality/core').getBaseURL(),
    appdb = require('duality/core').getDBURL(),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');


var add_sms = function (data, sms_message) {

    var result = updates.add_sms(null, {
        uuid: '14dc3a5aa6',
        method: "POST",
        query: {},
        headers: helpers.headers("url", querystring.stringify(data)),
        body: querystring.stringify(data),
        form: data
    });

    var doc = result[0];
    var resp_body = JSON.parse(result[1]);

    return [doc, resp_body];

};
var clinic = {
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
};


/*
 * STEP 1:
 *
 * Run add_sms and expect a callback to add a clinic to a data record which
 * contains all the information from the SMS.
 **/
exports.start_psms = function (test) {

    text.expect(16);

    var sms_message = {
       _id: '14dc3a5aa6',
       from: "+13125551212",
       message: '1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4',
       sent_timestamp: "1-19-12 18:45",
       sent_to: "+15551212",
       type: "sms_message",
       locale: "en",
       form: "PSMS"
    };

    var data = {
        from: '+13125551212',
        message: '1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212'
    };

    var form_data = {
        days_stocked_out: {
            cotrimoxazole: [7, "Cotrimoxazole: Days stocked out"],
            eye_ointment: [4, "Eye Ointment: Days stocked out"],
            la_6x1: [9, "LA 6x1: Days stocked out"],
            la_6x2: [8, "LA 6x2: Days stocked out"],
            ors: [5, "ORS: Days stocked out"],
            zinc: [6, "Zinc: Days stocked out"]
        },
        facility_id: ['facility', 'Health Facility Identifier'],
        month: ['11', 'Report Month'],
        quantity_dispensed: {
            cotrimoxazole: [3, "Cotrimoxazole: Dispensed total"],
            eye_ointment: [6, "Eye Ointment: Dispensed total"],
            la_6x1: [1, "LA 6x1: Dispensed total"],
            la_6x2: [2, "LA 6x2: Dispensed total"],
            ors: [5, "ORS: Dispensed total"],
            zinc: [4, "Zinc: Dispensed total"]
        },
        year: ['2011', 'Report Year']
    };

    var days_stocked_out = {
        cotrimoxazole: 7,
        eye_ointment: 4,
        la_6x1: 9,
        la_6x2: 8,
        ors: 5,
        zinc: 6
    };

    var quantity_dispensed = {
        cotrimoxazole: 3,
        eye_ointment: 6,
        la_6x1: 1,
        la_6x2: 2,
        ors: 5,
        zinc: 4
    };

    var expected = {
        payload: {

        },
        callback: {
            options: {
                path: baseURL + "/PSMS/data_record/add/clinic/%2B13125551212"
            },
            data: {
                type: "data_record",
                form: "PSMS",
                form_data: form_data,
                related_entities: {
                    clinic: null
                },
                sms_message: sms_message,
                from: "+13125551212",
                errors: [],
                tasks: [],
                days_stocked_out: days_stocked_out,
                quantity_dispensed: quantity_dispensed,
                month: '11',
                year: '2011'
            }
        }
    };

    var resp = add_sms(data, sms_message);

    test.same(resp[0], sms_message);

    test.same(
        resp.callback.options.path,
        expected.callback.options.path);

    test.same(
        resp.callback.data,
        expected.callback.data);

    step2_lists_data_record(test, resp.body);

};

//
// STEP 2:
//
// Run data_record/add/clinic and expect a callback to
// check if the same data record already exists.
//
var step2_lists_data_record = function(test, req_body) {

    var viewdata = {rows: [
        {
            "key": ["+13125551212"],
            "value": clinic
        }
    ]};

    var resp = fakerequest.list(lists.data_record, viewdata, {
        method: "POST",
        query: {form: req_body.form},
        headers: helpers.headers('json', JSON.stringify(req_body)),
        body: JSON.stringify(req_body),
        form: {}
    });

    test.same(
        resp.callback.options.path,
        baseURL + "/PSMS/data_record/merge/2011/11/" + clinic._id);

    test.same(
        resp.callback.data.related_entities,
        {clinic: clinic});

    lists_data_record_merge(test, resp.body);

};


/**
 * STEP 3, CASE 1: A data record already exists.
 *
 * Run data_record/merge/year/month/clinic_id and expect a callback to update
 * the data record with the new data.
 *
 * @param {Object} test - Unittest object
 * @param {Object} callback - Callback object used to form the next request
 * @api private
 */
var lists_data_record_merge = function(test, callback) {

    var viewdata = {rows: [
        {
            key: ["2011", "11", "4a6399c98ff78ac7da33b639ed60f458"],
            value: {
                _id: "777399c98ff78ac7da33b639ed60f422",
                _rev: "484399c98ff78ac7da33b639ed60f923"
            }
        }
    ]};

    var resp = fakerequest.list(lists.data_record_merge, viewdata, {
        method: "POST",
        query: {form: "PSMS"},
        headers: helpers.headers('json', JSON.stringify(callback.data)),
        body: JSON.stringify(callback.data),
        form: {}
    });

    var resp_body = JSON.parse(resp.body);

    test.same(resp_body.callback.options,
              expected_response.callback.options);

    test.same(resp_body.callback.data,
              expected_response.callback.data);

    var expected_changes = function(resp_body) {

        resp_body.callback.options.path =
            appdb + "/777399c98ff78ac7da33b639ed60f422";

        resp_body.callback.options.method = "POST";

        resp_body.callback.data._rev = "484399c98ff78ac7da33b639ed60f923";

        return resp_body
    };

    var resp = test_data_record_merge(resp_body, viewdata, expected_changes);

    step4_lists_data_record_merge(resp.body);
};

/*
 * return response from lists.data_record_merge
 */
var lists_data_record_merge = function(req_body, viewdata) {

    var expected_resp = expected_changes(req_body);

    var resp = fakerequest.list(lists.data_record_merge, viewdata, {
        method: "POST",
        query: {form: "PSMS"},
        headers: helpers.headers('json', JSON.stringify(doc2.callback.data)),
        body: JSON.stringify(doc2.callback.data),
        form: {}
    });

    var resp_body = JSON.parse(resp.body);

    test.same(resp_body.callback.options,
              expected_response.callback.options);

    test.same(resp_body.callback.data,
              expected_response.callback.data);

    return resp;

};

//
// STEP 3, CASE 2:
//
// A data record does not exist.
//
// Run data_record/merge/year/month/clinic_id and expect
// a callback to create a new data record.
//
var step3_case2_lists_data_record_merge = function(req_body) {

    var viewdata = {rows: []};

    var expected_changes = function(resp_body) {

        resp_body.callback.options.path = appdb;

        resp_body.callback.options.method = "PUT";

        return resp_body
    };

    var resp = test_data_record_merge(resp_body, viewdata, expected_changes);

};
