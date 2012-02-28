var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    baseURL = require('duality/core').getBaseURL(),
    appdb = require('duality/core').getDBURL(),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');


exports.data_record_psms = function (test) {
    
    test.expect(19);

    var ref_rc = String(helpers.rand());

    var data = {
        from: '+13125551212',
        message: '1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212'
    };

    var sms_message = {
       from: "+13125551212",
       message: '1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4',
       sent_timestamp: "1-19-12 18:45",
       sent_to: "+15551212",
       type: "sms_message",
       locale: "en",
       form: "PSMS"
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

    //
    // STEP 1:
    //
    // Run add_sms and expect a callback to add a clinic
    // to a data record which contains all the information
    // from the SMS.
    //

    var result1 = updates.add_sms(null, {
        method: "POST",
        query: {},
        headers: helpers.headers("url", querystring.stringify(data)),
        body: querystring.stringify(data),
        form: data
    });

    var doc1 = result1[0];
    var resp1 = JSON.parse(result1[1]);

    test.same(doc1, sms_message);

    test.same(resp1.callback.options.path,
        baseURL + "/PSMS/data_record/add/clinic/%2B13125551212");

    test.same(resp1.callback.data, {
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
    });



    //
    // STEP 2:
    //
    // Run data_record/add/clinic and expect a callback to 
    // check if the same data record already exists.
    //
    
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

    var viewdata2 = {rows: [
        {
            "key": ["+13125551212"],
            "value": clinic
        }
    ]};

    var result2 = fakerequest.list(lists.data_record, viewdata2, {
        method: "POST",
        query: {form: "PSMS"},
        headers: helpers.headers('json', JSON.stringify(resp1.callback.data)),
        body: JSON.stringify(resp1.callback.data),
        form: {}
    });

    var doc2 = JSON.parse(result2.body);

    test.same(doc2.callback.options, {
        "host": window.location.hostname,
        "port": window.location.port,
        "path": baseURL + "/PSMS/data_record/merge/2011/11/4a6399c98ff78ac7da33b639ed60f458",
        "method": "POST",
        "headers": {
           "Content-Type": "application/json; charset=utf-8"
        }
    });

    test.same(doc2.callback.data.errors, []);
    test.same(doc2.callback.data.related_entities.clinic, clinic);
    
    
    
    //
    // STEP 3, CASE 1:
    //
    // A data record already exists.
    //
    // Run data_record/merge/year/month/clinic_id and expect 
    // a callback to update the data record with the new data.
    //
    
    var viewdata3a = {rows: [
        {
            key: ["2011", "11", "4a6399c98ff78ac7da33b639ed60f458"],
            value: {
                _id: "777399c98ff78ac7da33b639ed60f422",
                _rev: "484399c98ff78ac7da33b639ed60f923",
                year: "2011",
                month: "11",
                related_entities: {
                    clinic: {"_id": "4a6399c98ff78ac7da33b639ed60f458"}
                },
                form: "PSMS",
                form_data: {
                    days_stocked_out: {
                        cotrimoxazole: [1, "Cotrimoxazole: Days stocked out"],
                        eye_ointment: [1, "Eye Ointment: Days stocked out"],
                        la_6x1: [1, "LA 6x1: Days stocked out"],
                        la_6x2: [1, "LA 6x2: Days stocked out"],
                        ors: [1, "ORS: Days stocked out"],
                        zinc: [1, "Zinc: Days stocked out"]
                    },
                    facility_id: ['facility', 'Health Facility Identifier'],
                    month: ['11', 'Report Month'],
                    quantity_dispensed: {
                        cotrimoxazole: [1, "Cotrimoxazole: Dispensed total"],
                        eye_ointment: [1, "Eye Ointment: Dispensed total"],
                        la_6x1: [1, "LA 6x1: Dispensed total"],
                        la_6x2: [1, "LA 6x2: Dispensed total"],
                        ors: [1, "ORS: Dispensed total"],
                        zinc: [1, "Zinc: Dispensed total"]
                    },
                    year: ['2011', 'Report Year']
                },
                sms_message: {
                   from: "+13125551212",
                   message: '1!PSMS!facility#2011#11#1#1#1#1#1#1#1#1#1#1#1#1',
                   sent_timestamp: "1-14-12 18:32",
                   sent_to: "+15551212",
                   type: "sms_message",
                   locale: "en",
                   form: "PSMS"
                },
                from: "+13125551212"   
            }
        }
    ]};

    var result3a = fakerequest.list(lists.data_record_merge, viewdata3a, {
        method: "POST",
        query: {form: "PSMS"},
        headers: helpers.headers('json', JSON.stringify(doc2.callback.data)),
        body: JSON.stringify(doc2.callback.data),
        form: {}
    });

    var doc3a = JSON.parse(result3a.body);

    test.same(doc3a.callback.options, {
        "host": window.location.hostname,
        "port": window.location.port,
        "path": appdb + "/777399c98ff78ac7da33b639ed60f422",
        "method": "PUT",
        "headers": {
           "Content-Type": "application/json; charset=utf-8"
        }
    });

    test.same(doc3a.callback.data.errors, []);
    test.same(doc3a.callback.data._rev, "484399c98ff78ac7da33b639ed60f923");
    test.same(doc3a.callback.data.form_data, form_data);
    test.same(doc3a.callback.data.sms_message, sms_message);
    test.same(doc3a.callback.data.quantity_dispensed, quantity_dispensed);
    test.same(doc3a.callback.data.days_stocked_out, days_stocked_out);



    //
    // STEP 3, CASE 2:
    //
    // A data record does not exist.
    //
    // Run data_record/merge/year/month/clinic_id and expect 
    // a callback to create a new data record.
    //
    
    var viewdata3b = {rows: []};

    var result3b = fakerequest.list(lists.data_record_merge, viewdata3b, {
        method: "POST",
        query: {form: "PSMS"},
        headers: helpers.headers('json', JSON.stringify(doc2.callback.data)),
        body: JSON.stringify(doc2.callback.data),
        form: {}
    });

    var doc3b = JSON.parse(result3b.body);

    test.same(doc3b.callback.options, {
        "host": window.location.hostname,
        "port": window.location.port,
        "path": appdb,
        "method": "POST",
        "headers": {
           "Content-Type": "application/json; charset=utf-8"
        }
    });

    test.same(doc3b.callback.data.errors, []);
    test.same(doc3b.callback.data.form_data, form_data);
    test.same(doc3b.callback.data.sms_message, sms_message);
    test.same(doc3b.callback.data.days_stocked_out, days_stocked_out);
    test.same(doc3b.callback.data.quantity_dispensed, quantity_dispensed);
    
    
    
    test.done();
};
