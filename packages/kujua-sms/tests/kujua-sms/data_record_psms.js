var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    baseURL = require('duality/core').getBaseURL(),
    appdb = require('duality/core').getDBURL(),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../helpers/helpers');

exports.data_record_psms = function (test) {

    test.expect(7);

    var ref_rc = String(helpers.rand());

    var data = {
        from: '+17085551212',
        message: '1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212'
    };

    var sms_message = {
       from: "+17085551212",
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
    
    
    
    
    //
    // STEP 1:
    //
    // Run add_sms and expect a callback to add a clinic
    // to a data record which contains all the information
    // from the SMS.
    //
    
    var result = updates.add_sms(null, {
        method: "POST",
        query: {},
        headers: helpers.headers("url", querystring.stringify(data)),
        body: querystring.stringify(data),
        form: data,
    });

    var doc = result[0];
    var resp = JSON.parse(result[1]);

    test.same(doc, sms_message);

    test.same(resp.callback.options.path, 
        baseURL + "/PSMS/data_record/add/clinic/%2B17085551212");

    test.same(resp.callback.data, {
        type: "data_record",
        errors: [],
        form: "PSMS",
        form_data: form_data,
        related_entities: {
            clinic: null
        },
        sms_message: sms_message,
        from: "+17085551212"
    });




    //
    // STEP 2:
    //
    // Run data_record/add/clinic and expect a callback to 
    // create the data record.
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
    
    var viewdata = {rows: [
        {
            "key": ["+17085551212"],
            "value": clinic
        }
    ]};
    
    var result2 = fakerequest.list(lists.data_record, viewdata, {
        method: "POST",
        query: {form: "PSMS"},
        headers: helpers.headers('json', JSON.stringify(resp.callback.data)),
        body: JSON.stringify(resp.callback.data),
        form: {}
    });
    
    var doc2 = JSON.parse(result2.body);
    
    test.same(doc2.callback.options.method, "POST");
    test.same(doc2.callback.options.path, appdb);
    
    test.same(doc2.callback.data.errors, []);
    test.same(doc2.callback.data.related_entities.clinic, clinic);



    test.done();
};
